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
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulesService: SchedulesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateBookingDto) {
    const createdBooking = await this.prisma.$transaction(async (tx) => {
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

    // 6. Notificaciones transaccionales automáticas (In-app + Email/WhatsApp simulados)
    try {
      await this.notificationsService.notifyBookingCreated({
        id: createdBooking.id,
        bookingCode: createdBooking.bookingCode,
        paymentMethod: createdBooking.paymentMethod,
        status: createdBooking.status,
        voucherUrl: createdBooking.voucherUrl,
        user: createdBooking.user,
        schedule: createdBooking.schedule,
      });

      if (createdBooking.voucherUrl) {
        await this.notificationsService.notifyVoucherUploaded({
          id: createdBooking.id,
          bookingCode: createdBooking.bookingCode,
          voucherUrl: createdBooking.voucherUrl,
          user: createdBooking.user,
          schedule: createdBooking.schedule,
        });
      }
    } catch (err) {
      // No frenar la reserva si falla la emisión de la notificación
      console.error('Error al emitir notificación de reserva:', err);
    }

    return createdBooking;
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

    const cancelledBooking = await this.prisma.$transaction(async (tx) => {
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

    try {
      await this.notificationsService.notifyBookingCancelled({
        id: cancelledBooking.id,
        bookingCode: cancelledBooking.bookingCode,
        user: booking.user,
        schedule: booking.schedule,
      });
    } catch (err) {
      console.error('Error al emitir notificación de cancelación:', err);
    }

    return cancelledBooking;
  }

  async uploadVoucher(id: string, userId: string, dto: UploadVoucherDto) {
    const booking = await this.findById(id, userId);

    if (booking.paymentMethod !== PaymentMethod.TRANSFER) {
      throw new BadRequestException('Solo las reservas con método TRANSFER permiten adjuntar comprobante');
    }

    if (booking.status === BookingStatus.CONFIRMADA) {
      throw new ConflictException('Esta reserva ya fue confirmada previamente');
    }

    const updated = await this.prisma.booking.update({
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

    try {
      await this.notificationsService.notifyVoucherUploaded({
        id: updated.id,
        bookingCode: updated.bookingCode,
        voucherUrl: updated.voucherUrl,
        user: updated.user,
        schedule: updated.schedule,
      });
    } catch (err) {
      console.error('Error al emitir notificación de subida de comprobante:', err);
    }

    return updated;
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

    const approvedBooking = await this.prisma.$transaction(async (tx) => {
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

    try {
      await this.notificationsService.notifyPaymentApproved({
        id: approvedBooking.id,
        bookingCode: approvedBooking.bookingCode,
        user: approvedBooking.user,
        schedule: approvedBooking.schedule,
      });
    } catch (err) {
      console.error('Error al emitir notificación de pago aprobado:', err);
    }

    return approvedBooking;
  }

  async rejectVoucher(id: string, adminId: string, dto: RejectVoucherDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${id}' no encontrada`);
    }

    const rejectedBooking = await this.prisma.$transaction(async (tx) => {
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
            status: PaymentStatus.REJECTED,
            verifiedByAdminId: adminId,
          },
        });
      }

      return updatedBooking;
    });

    try {
      await this.notificationsService.notifyPaymentRejected({
        id: rejectedBooking.id,
        bookingCode: rejectedBooking.bookingCode,
        user: rejectedBooking.user,
        schedule: rejectedBooking.schedule,
      }, dto.reason);
    } catch (err) {
      console.error('Error al emitir notificación de pago rechazado:', err);
    }

    return rejectedBooking;
  }

  handleDirectVoucherUpload(file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo de comprobante');
    }

    return {
      url: `/uploads/vouchers/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async uploadVoucherFile(id: string, userId: string, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo de comprobante');
    }

    const booking = await this.findById(id, userId);

    if (booking.paymentMethod !== PaymentMethod.TRANSFER) {
      throw new BadRequestException('Solo las reservas con método TRANSFER permiten adjuntar comprobante');
    }

    if (booking.status === BookingStatus.CONFIRMADA) {
      throw new ConflictException('Esta reserva ya fue confirmada previamente');
    }

    const voucherUrl = `/uploads/vouchers/${file.filename}`;

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        voucherUrl,
        status: BookingStatus.PENDIENTE_VALIDACION,
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
        payment: true,
      },
    });

    try {
      await this.notificationsService.notifyVoucherUploaded({
        id: updated.id,
        bookingCode: updated.bookingCode,
        voucherUrl: updated.voucherUrl,
        user: updated.user,
        schedule: updated.schedule,
      });
    } catch (err) {
      console.error('Error al emitir notificación de subida de archivo de comprobante:', err);
    }

    return updated;
  }
}
