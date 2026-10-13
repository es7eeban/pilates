import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { WaitlistStatus, BookingStatus, PaymentMethod, PaymentStatus, ScheduleStatus, Prisma } from '@prisma/client';
import { AcceptWaitlistDto } from './dto/accept-waitlist.dto.js';

export const WAITLIST_MAX_SLOTS = 3;
export const WAITLIST_OFFER_TTL_MS = 60 * 60 * 1000; // 1 hora exacta

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Unirse a la lista de espera de una clase llena (máximo 3 sobrecupos)
   */
  async joinWaitlist(userId: string, scheduleId: string) {
    const schedule = await this.prisma.classSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        classType: true,
        branch: true,
        instructor: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Sesión de clase con ID '${scheduleId}' no encontrada`);
    }

    if (schedule.status !== ScheduleStatus.SCHEDULED) {
      throw new ConflictException('Esta clase no se encuentra abierta para reservas o lista de espera');
    }

    if (schedule.availableSlots > 0) {
      throw new BadRequestException('Esta clase aún tiene cupos regulares disponibles. Puedes reservar directamente.');
    }

    // 1. Validar si ya tiene una reserva activa para esta misma clase
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        userId,
        scheduleId,
        status: {
          notIn: [BookingStatus.CANCELADA_CLIENTE, BookingStatus.RECHAZADA_ADMIN],
        },
      },
    });

    if (existingBooking) {
      throw new ConflictException('Ya tienes una reserva activa para esta sesión de clase');
    }

    // 2. Validar si ya está en la lista de espera activa
    const existingWaitlist = await this.prisma.waitlistEntry.findFirst({
      where: {
        userId,
        scheduleId,
        status: {
          in: [WaitlistStatus.WAITING, WaitlistStatus.OFFERED],
        },
      },
    });

    if (existingWaitlist) {
      throw new ConflictException('Ya te encuentras registrado en la lista de espera de esta clase');
    }

    // 3. Validar aforo de lista de espera (máximo 3 sobrecupos)
    const activeWaitlistCount = await this.prisma.waitlistEntry.count({
      where: {
        scheduleId,
        status: {
          in: [WaitlistStatus.WAITING, WaitlistStatus.OFFERED],
        },
      },
    });

    if (activeWaitlistCount >= WAITLIST_MAX_SLOTS) {
      throw new ConflictException(`La lista de espera está completa para esta sesión (máximo ${WAITLIST_MAX_SLOTS} sobrecupos permitidos)`);
    }

    const position = activeWaitlistCount + 1;

    const entry = await this.prisma.waitlistEntry.create({
      data: {
        userId,
        scheduleId,
        position,
        status: WaitlistStatus.WAITING,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        schedule: {
          include: {
            classType: true,
            branch: true,
          },
        },
      },
    });

    // 4. Notificar al alumno que ingresó en lista de espera
    try {
      await this.notificationsService.notifyWaitlistJoined(entry, entry.user, schedule);
    } catch (err) {
      this.logger.error(`Error al emitir notificación de waitlist joined: ${err}`);
    }

    return {
      message: `Te has unido con éxito a la lista de espera en la posición #${position}`,
      entry,
      waitlistCount: position,
      waitlistMax: WAITLIST_MAX_SLOTS,
    };
  }

  /**
   * Promueve al siguiente alumno en espera al liberarse un cupo (le otorga 1 hora para aceptar)
   */
  async promoteNextInWaitlist(scheduleId: string, txClient?: Prisma.TransactionClient) {
    const runner = txClient ?? this.prisma;

    // Buscar al primer alumno en espera por orden de llegada (FIFO)
    const nextWaiting = await runner.waitlistEntry.findFirst({
      where: {
        scheduleId,
        status: WaitlistStatus.WAITING,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        schedule: {
          include: {
            classType: true,
            branch: true,
          },
        },
      },
    });

    if (!nextWaiting) {
      // Nadie en lista de espera: devolvemos el cupo al público general
      await runner.classSchedule.update({
        where: { id: scheduleId },
        data: {
          availableSlots: { increment: 1 },
        },
      });
      return null;
    }

    // Le ofrecemos el cupo con 1 hora de vigencia
    const expiresAt = new Date(Date.now() + WAITLIST_OFFER_TTL_MS);

    const promoted = await runner.waitlistEntry.update({
      where: { id: nextWaiting.id },
      data: {
        status: WaitlistStatus.OFFERED,
        offeredAt: new Date(),
        expiresAt,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        schedule: {
          include: {
            classType: true,
            branch: true,
          },
        },
      },
    });

    // Notificar al alumno de su cupo disponible y la ventana de 1 hora
    try {
      await this.notificationsService.notifyWaitlistOffered(promoted, promoted.user, promoted.schedule);
    } catch (err) {
      this.logger.error(`Error al emitir notificación de oferta de cupo: ${err}`);
    }

    return promoted;
  }

  /**
   * Aceptar la oferta de cupo y formalizar la reserva
   */
  async acceptOffer(userId: string, scheduleId: string, dto: AcceptWaitlistDto) {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: {
        userId,
        scheduleId,
        status: WaitlistStatus.OFFERED,
      },
      include: {
        schedule: {
          include: {
            classType: true,
            branch: true,
            instructor: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('No tienes una oferta de cupo activa para esta sesión');
    }

    // Validar si la ventana de 1 hora ya expiró
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      await this.prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: WaitlistStatus.EXPIRED },
      });

      // Pasar oferta al siguiente en espera
      await this.promoteNextInWaitlist(scheduleId);

      throw new BadRequestException('El plazo de 1 hora para confirmar tu cupo ha expirado');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Marcar entrada de waitlist como aceptada
      await tx.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: WaitlistStatus.ACCEPTED },
      });

      // 2. Generar código de reserva
      const bookingCode = `PIL-${Math.floor(100000 + Math.random() * 900000)}`;
      const isTransfer = dto.paymentMethod === PaymentMethod.TRANSFER;
      const initialStatus = isTransfer
        ? dto.voucherUrl
          ? BookingStatus.PENDIENTE_VALIDACION
          : BookingStatus.PENDIENTE_PAGO
        : BookingStatus.PENDIENTE_PAGO;

      const expiresAt = dto.paymentMethod === PaymentMethod.GATEWAY
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null;

      // 3. Crear reserva
      const booking = await tx.booking.create({
        data: {
          userId,
          scheduleId,
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
                select: { id: true, name: true, email: true, phone: true },
              },
            },
          },
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      });

      // 4. Registrar pago
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: entry.schedule.price,
          currency: 'CLP',
          status: PaymentStatus.PENDING,
          gatewayProvider: isTransfer ? 'TRANSFER' : 'MERCADOPAGO',
        },
      });

      // 5. Emitir notificación de reserva
      try {
        await this.notificationsService.notifyBookingCreated({
          id: booking.id,
          bookingCode: booking.bookingCode,
          paymentMethod: booking.paymentMethod,
          status: booking.status,
          voucherUrl: booking.voucherUrl,
          user: booking.user,
          schedule: booking.schedule,
        });

        if (booking.voucherUrl) {
          await this.notificationsService.notifyVoucherUploaded({
            id: booking.id,
            bookingCode: booking.bookingCode,
            voucherUrl: booking.voucherUrl,
            user: booking.user,
            schedule: booking.schedule,
          });
        }
      } catch (err) {
        this.logger.error(`Error al emitir notificación tras aceptar waitlist: ${err}`);
      }

      return {
        message: '¡Cupo confirmado con éxito!',
        booking: {
          ...booking,
          payment,
        },
      };
    });
  }

  /**
   * Rechazar voluntariamente la oferta de cupo (lo libera para el siguiente)
   */
  async declineOffer(userId: string, scheduleId: string) {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: {
        userId,
        scheduleId,
        status: WaitlistStatus.OFFERED,
      },
    });

    if (!entry) {
      throw new NotFoundException('No tienes una oferta de cupo activa para esta clase');
    }

    await this.prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: WaitlistStatus.DECLINED },
    });

    // Promover al siguiente en la lista
    await this.promoteNextInWaitlist(scheduleId);

    return { success: true, message: 'Has declinado el cupo. Se ha ofrecido al siguiente alumno en espera.' };
  }

  /**
   * Consultar estado del alumno en la lista de espera de una clase
   */
  async getMyWaitlistStatus(userId: string, scheduleId: string) {
    // Lazy check: si la oferta expiró, actualizar y promover
    const activeEntry = await this.prisma.waitlistEntry.findFirst({
      where: {
        userId,
        scheduleId,
        status: { in: [WaitlistStatus.WAITING, WaitlistStatus.OFFERED] },
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

    if (!activeEntry) {
      return { inWaitlist: false };
    }

    // Chequear expiración si está en OFFERED
    if (activeEntry.status === WaitlistStatus.OFFERED && activeEntry.expiresAt && activeEntry.expiresAt < new Date()) {
      await this.prisma.waitlistEntry.update({
        where: { id: activeEntry.id },
        data: { status: WaitlistStatus.EXPIRED },
      });
      await this.promoteNextInWaitlist(scheduleId);
      return { inWaitlist: false, expired: true };
    }

    let remainingMinutes = 0;
    if (activeEntry.status === WaitlistStatus.OFFERED && activeEntry.expiresAt) {
      const diffMs = activeEntry.expiresAt.getTime() - Date.now();
      remainingMinutes = Math.max(0, Math.floor(diffMs / 60000));
    }

    return {
      inWaitlist: true,
      entry: activeEntry,
      position: activeEntry.position,
      status: activeEntry.status,
      expiresAt: activeEntry.expiresAt,
      remainingMinutes,
    };
  }

  /**
   * Obtener todas las entradas de lista de espera del alumno
   */
  async getMyWaitlistEntries(userId: string) {
    const entries = await this.prisma.waitlistEntry.findMany({
      where: {
        userId,
        status: { in: [WaitlistStatus.WAITING, WaitlistStatus.OFFERED] },
      },
      include: {
        schedule: {
          include: {
            classType: true,
            branch: true,
            instructor: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Lazy cleanup de expiradas
    const validEntries = [];
    for (const entry of entries) {
      if (entry.status === WaitlistStatus.OFFERED && entry.expiresAt && entry.expiresAt < new Date()) {
        await this.prisma.waitlistEntry.update({
          where: { id: entry.id },
          data: { status: WaitlistStatus.EXPIRED },
        });
        await this.promoteNextInWaitlist(entry.scheduleId);
      } else {
        validEntries.push(entry);
      }
    }

    return validEntries;
  }

  /**
   * Resumen de sobrecupo para una clase (para mostrar en las cards de la agenda)
   */
  async getScheduleWaitlistSummary(scheduleId: string) {
    const activeCount = await this.prisma.waitlistEntry.count({
      where: {
        scheduleId,
        status: { in: [WaitlistStatus.WAITING, WaitlistStatus.OFFERED] },
      },
    });

    return {
      waitlistCount: activeCount,
      waitlistMax: WAITLIST_MAX_SLOTS,
      isWaitlistFull: activeCount >= WAITLIST_MAX_SLOTS,
    };
  }
}
