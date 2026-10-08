import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { BookingStatus, PaymentMethod, PaymentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { SchedulesService } from '../schedules/schedules.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UploadVoucherDto } from './dto/upload-voucher.dto.js';
import { RejectVoucherDto } from './dto/reject-voucher.dto.js';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulesService: SchedulesService,
  ) {}

  async create(userId: string, dto: CreateBookingDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validar si el alumno ya tiene una reserva activa para esta misma sesión
      const existing = await tx.booking.findFirst({
        where: {
          userId,
          scheduleId: dto.scheduleId,
          status: {
            notIn: [BookingStatus.CANCELADA_CLIENTE, BookingStatus.RECHAZADA_ADMIN],
          },
        },
      });

      if (existing) {
        throw new ConflictException('Ya tienes una reserva activa para esta sesión de clase');
      }

      // 2. Reserva atómica con bloqueo FOR UPDATE en PostgreSQL (garantiza aforo estricto)
      const schedule = await this.schedulesService.reserveSlotWithPessimisticLock(
        dto.scheduleId,
        tx,
      );

      // 3. Código único de reserva (ej. PIL-492817)
      const bookingCode = `PIL-${Math.floor(100000 + Math.random() * 900000)}`;

      // 4. Determinar estado inicial según método de pago
      const isTransfer = dto.paymentMethod === PaymentMethod.TRANSFER;
      const initialStatus = isTransfer
        ? dto.voucherUrl
          ? BookingStatus.PENDIENTE_VALIDACION
          : BookingStatus.PENDIENTE_PAGO
        : BookingStatus.PENDIENTE_PAGO;

      const expiresAt = dto.paymentMethod === PaymentMethod.GATEWAY
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null;

      const booking = await tx.booking.create({
        data: {
          userId,
          scheduleId: dto.scheduleId,
          bookingCode,
          status: initialStatus,
          paymentMethod: dto.paymentMethod,
          voucherUrl: dto.voucherUrl,
          expiresAt,
        },
        include: {
          schedule: {
            include: {
              classType: true,
              branch: true,
              instructor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      });

      // 5. Registrar intento de pago
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: schedule.price,
          currency: 'CLP',
          status: PaymentStatus.PENDING,
          gatewayProvider: isTransfer ? 'TRANSFER' : 'MERCADOPAGO',
        },
      });

      return {
        ...booking,
        payment,
      };
    });
  }

  async findMyBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        schedule: {
          include: {
            classType: true,
            branch: true,
            instructor: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId?: string, userRole?: Role) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        schedule: {
          include: {
            classType: true,
            branch: true,
            instructor: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${id}' no encontrada`);
    }

    if (userId && userRole !== Role.ADMIN && booking.userId !== userId) {
      throw new ForbiddenException('No tienes autorización para ver esta reserva');
    }

    return booking;
  }

  async cancel(id: string, userId: string, userRole?: Role) {
    const booking = await this.findById(id, userId, userRole);

    if (
      booking.status === BookingStatus.CANCELADA_CLIENTE ||
      booking.status === BookingStatus.RECHAZADA_ADMIN ||
      booking.status === BookingStatus.FINALIZADA
    ) {
      throw new ConflictException(`La reserva ya se encuentra en estado '${booking.status}'`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Liberar cupo en la sesión
      await this.schedulesService.releaseSlotWithPessimisticLock(booking.scheduleId, tx);

      // 2. Actualizar estado
      return tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELADA_CLIENTE,
        },
        include: {
          schedule: {
            include: {
              classType: true,
              branch: true,
            },
          },
          payment: true,
        },
      });
    });
  }

  async uploadVoucher(id: string, userId: string, dto: UploadVoucherDto) {
    const booking = await this.findById(id, userId);

    if (booking.paymentMethod !== PaymentMethod.TRANSFER) {
      throw new BadRequestException('Solo las reservas con método TRANSFER permiten adjuntar comprobante');
    }

    if (booking.status === BookingStatus.CONFIRMADA) {
      throw new ConflictException('Esta reserva ya fue confirmada previamente');
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        voucherUrl: dto.voucherUrl,
        status: BookingStatus.PENDIENTE_VALIDACION,
      },
      include: {
        schedule: {
          include: {
            classType: true,
            branch: true,
          },
        },
        payment: true,
      },
    });
  }

  // --- Endpoints Administrativos ---

  async getPendingVouchers() {
    return this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDIENTE_VALIDACION,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        schedule: {
          include: {
            classType: true,
            branch: true,
            instructor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        payment: true,
      },
      orderBy: { updatedAt: 'asc' },
    });
  }

  async approveVoucher(id: string, adminId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${id}' no encontrada`);
    }

    if (booking.status === BookingStatus.CONFIRMADA) {
      throw new ConflictException('La reserva ya ha sido aprobada previamente');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CONFIRMADA,
        },
        include: {
          schedule: {
            include: {
              classType: true,
              branch: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      if (booking.payment) {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: {
            status: PaymentStatus.APPROVED,
            verifiedByAdminId: adminId,
            verifiedAt: new Date(),
          },
        });
      }

      return updatedBooking;
    });
  }

  async rejectVoucher(id: string, adminId: string, dto: RejectVoucherDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${id}' no encontrada`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Liberar cupo al rechazar
      await this.schedulesService.releaseSlotWithPessimisticLock(booking.scheduleId, tx);

      // 2. Rechazar reserva
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.RECHAZADA_ADMIN,
          rejectionReason: dto.reason,
        },
        include: {
          schedule: {
            include: {
              classType: true,
              branch: true,
            },
          },
        },
      });

      if (booking.payment) {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: {
            status: PaymentStatus.REJECTED,
            verifiedByAdminId: adminId,
          },
        });
      }

      return updatedBooking;
    });
  }
}
