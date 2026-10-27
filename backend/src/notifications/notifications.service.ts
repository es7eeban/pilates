import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationType, NotificationChannel, Role } from '@prisma/client';

export interface BookingNotificationContext {
  id: string;
  bookingCode: string;
  paymentMethod?: string;
  status?: string;
  voucherUrl?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  schedule: {
    id: string;
    startTime: Date | string;
    endTime: Date | string;
    price?: any;
    classType?: {
      title: string;
      intensityLevel?: string;
    } | null;
    branch?: {
      name: string;
      address: string;
      city?: string;
      phone?: string | null;
    } | null;
    instructor?: {
      name: string;
      email?: string;
      phone?: string;
    } | null;
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  private formatTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    });
  }

  private formatCurrency(amount?: number | string): string {
    if (!amount) return '$0 CLP';
    const num = Number(amount);
    return `$${num.toLocaleString('es-CL')} CLP`;
  }

  /**
   * Notificación cuando se crea una reserva
   */
  async notifyBookingCreated(context: BookingNotificationContext) {
    const { user, schedule, bookingCode, paymentMethod } = context;
    const dateFormatted = this.formatDate(schedule.startTime);
    const startTimeFormatted = this.formatTime(schedule.startTime);
    const endTimeFormatted = this.formatTime(schedule.endTime);
    const classTitle = 'Clase de Pilates';
    const branchName = schedule.branch?.name || 'Sede Principal';
    const branchAddress = schedule.branch?.address || '';
    const instructorName = schedule.instructor?.name || 'Administración';
    const priceFormatted = this.formatCurrency(schedule.price);

    const isTransfer = paymentMethod === 'TRANSFER';

    const title = isTransfer
      ? `Reserva ${bookingCode} registrada: Pendiente de transferencia`
      : `Reserva ${bookingCode} creada: Pendiente de pago`;

    const inAppMessage = isTransfer
      ? `Tu reserva en ${branchName} para el ${dateFormatted} a las ${startTimeFormatted} hrs fue registrada con éxito. Realiza la transferencia por ${priceFormatted} y sube tu comprobante para asegurar tu cupo.`
      : `Tu reserva en ${branchName} para el ${dateFormatted} a las ${startTimeFormatted} hrs fue creada. Completa el pago en línea para asegurar tu lugar.`;

    const emailSubject = `Confirmación de Reserva ${bookingCode} - Pilates Studio`;
    const emailBody = `
Hola ${user.name},

Hemos recibido tu solicitud de reserva en Pilates Studio:
- Código de Reserva: ${bookingCode}
- Sede: ${branchName} (${branchAddress})
- Horario: ${dateFormatted}, de ${startTimeFormatted} a ${endTimeFormatted} hrs
- Total a pagar: ${priceFormatted}

${
  isTransfer
    ? `DATOS DE TRANSFERENCIA BANCARIA:
Banco: Banco Santander
Tipo de cuenta: Cuenta Corriente
Número de cuenta: 74-89214-0
RUT: 76.543.210-K
Titular: Pilates Studio SpA
Email para comprobante: pagos@pilates.cl
Asunto: Comprobante ${bookingCode}

Una vez realizada la transferencia, sube tu comprobante desde la plataforma para validar tu asistencia.`
    : `Puedes completar tu pago en la plataforma para confirmar tu asistencia inmediatamente.`
}

¡Te esperamos en el estudio!
Equipo Pilates Studio
    `.trim();

    const whatsappMessage = `🧘‍♀️ *Pilates Studio* | Hola ${user.name}! Tu reserva *${bookingCode}* en ${branchName} (${dateFormatted} a las ${startTimeFormatted} hrs) ha sido generada.${
      isTransfer
        ? ` Recuerda transferir ${priceFormatted} y subir tu comprobante.`
        : ` Completa tu pago en línea para confirmar tu lugar.`
    }`;

    this.logger.log(`[EMAIL SIMULATED] >>> To: ${user.email} | Subject: ${emailSubject}`);
    this.logger.log(`[WHATSAPP SIMULATED] >>> To: ${user.phone || 'N/A'} | Text: ${whatsappMessage}`);

    return this.prisma.notification.create({
      data: {
        userId: user.id,
        title,
        message: inAppMessage,
        type: NotificationType.BOOKING_CREATED,
        channel: NotificationChannel.IN_APP,
        metadata: {
          bookingCode,
          bookingId: context.id,
          classTitle,
          branchName,
          branchAddress,
          startTime: schedule.startTime,
          instructorName,
          price: schedule.price,
          email: { to: user.email, subject: emailSubject, body: emailBody },
          whatsapp: { to: user.phone, message: whatsappMessage },
        },
      },
    });
  }

  /**
   * Notificación cuando el alumno adjunta un comprobante de transferencia:
   * EXCLUSIVA para el Administrador (userId = admin.id). No se envía ni es visible para el alumno ni otros usuarios.
   */
  async notifyVoucherUploaded(context: BookingNotificationContext) {
    const { user, schedule, bookingCode } = context;
    const classTitle = 'Clase de Pilates';
    const branchName = schedule.branch?.name || 'Sede Principal';
    const dateFormatted = this.formatDate(schedule.startTime);
    const startTimeFormatted = this.formatTime(schedule.startTime);

    const createdAdminNotifications: any[] = [];

    try {
      const admins = await this.prisma.user.findMany({
        where: { role: Role.ADMIN, isActive: true },
        select: { id: true, email: true, name: true, phone: true },
      });

      for (const admin of admins) {
        const emailSubject = `Nuevo comprobante por validar: Reserva ${bookingCode}`;
        const emailBody = `
Hola ${admin.name},

El alumno ${user.name} (${user.email}) ha subido un comprobante de transferencia para la reserva ${bookingCode}:
- Sede: ${branchName}
- Fecha y Hora: ${dateFormatted} a las ${startTimeFormatted} hrs
- Alumno: ${user.name} (${user.email} / ${user.phone || 'Sin teléfono'})

Ingresa a tu panel de Validación de Pagos o Notificaciones para revisar y aprobar/rechazar el comprobante.
        `.trim();

        const whatsappMessage = `📄 *Nuevo Comprobante* | El alumno ${user.name} subió el voucher para la reserva *${bookingCode}* (${branchName}, ${dateFormatted} ${startTimeFormatted} hrs). Pendiente de tu validación.`;

        const notif = await this.prisma.notification.create({
          data: {
            userId: admin.id,
            title: `Nuevo comprobante por validar: ${bookingCode}`,
            message: `El alumno ${user.name} (${user.email}) adjuntó un comprobante para la sesión en ${branchName} (${dateFormatted} a las ${startTimeFormatted} hrs).`,
            type: NotificationType.VOUCHER_UPLOADED,
            channel: NotificationChannel.IN_APP,
            metadata: {
              bookingCode,
              bookingId: context.id,
              studentId: user.id,
              studentName: user.name,
              studentEmail: user.email,
              studentPhone: user.phone,
              branchName,
              classTitle,
              startTime: schedule.startTime,
              voucherUrl: context.voucherUrl,
              email: { to: admin.email, subject: emailSubject, body: emailBody },
              whatsapp: { to: admin.phone, message: whatsappMessage },
            },
          },
        });
        createdAdminNotifications.push(notif);
      }
    } catch (e) {
      this.logger.warn(`Could not notify admins of voucher upload: ${e}`);
    }

    return createdAdminNotifications[0] ?? null;
  }

  /**
   * Notificación cuando el administrador aprueba el pago (EXCLUSIVA para el alumno dueño de la reserva)
   */
  async notifyPaymentApproved(context: BookingNotificationContext) {
    const { user, schedule, bookingCode } = context;
    const dateFormatted = this.formatDate(schedule.startTime);
    const startTimeFormatted = this.formatTime(schedule.startTime);
    const endTimeFormatted = this.formatTime(schedule.endTime);
    const classTitle = 'Clase de Pilates';
    const branchName = schedule.branch?.name || 'Sede';
    const branchAddress = schedule.branch?.address || '';

    const title = `¡Pago aprobado! Cupo confirmado para ${bookingCode} 🧘‍♀️`;
    const message = `Tu pago ha sido validado por el administrador. Tu cupo en ${branchName} para el ${dateFormatted} a las ${startTimeFormatted} hrs está 100% confirmado.`;

    const emailSubject = `¡Ticket Confirmado! Tu clase ${bookingCode} está lista`;
    const emailBody = `
¡Hola ${user.name}!

Tu pago para la reserva ${bookingCode} ha sido verificado y aprobado.
Tu cupo está garantizado:

DETALLES DE TU SESIÓN:
- Sede: ${branchName} - ${branchAddress}
- Fecha: ${dateFormatted}
- Horario: ${startTimeFormatted} a ${endTimeFormatted} hrs

RECOMENDACIONES IMPORTANTES:
1. Llega al menos 10 minutos antes del inicio.
2. Es obligatorio el uso de calcetines antideslizantes (grip socks).
3. Trae una toalla personal y una botella de agua.

¡Nos vemos en el estudio!
Pilates Studio
    `.trim();

    const whatsappMessage = `✅ *¡Pago Confirmado!* Hola ${user.name}, tu sesión en *${branchName}* para el ${dateFormatted} a las ${startTimeFormatted} hrs está confirmada. Ticket: *${bookingCode}*. Nos vemos! 🧘‍♀️`;

    this.logger.log(`[EMAIL SIMULATED] >>> To: ${user.email} | Subject: ${emailSubject}`);
    this.logger.log(`[WHATSAPP SIMULATED] >>> To: ${user.phone || 'N/A'} | Text: ${whatsappMessage}`);

    return this.prisma.notification.create({
      data: {
        userId: user.id,
        title,
        message,
        type: NotificationType.PAYMENT_APPROVED,
        channel: NotificationChannel.IN_APP,
        metadata: {
          bookingCode,
          bookingId: context.id,
          classTitle,
          branchName,
          startTime: schedule.startTime,
          email: { to: user.email, subject: emailSubject, body: emailBody },
          whatsapp: { to: user.phone, message: whatsappMessage },
        },
      },
    });
  }

  /**
   * Notificación cuando el administrador rechaza el comprobante (EXCLUSIVA para el alumno dueño de la reserva)
   */
  async notifyPaymentRejected(context: BookingNotificationContext, reason: string) {
    const { user, schedule, bookingCode } = context;
    const classTitle = 'Clase de Pilates';
    const branchName = schedule.branch?.name || 'Sede';
    const dateFormatted = this.formatDate(schedule.startTime);
    const startTimeFormatted = this.formatTime(schedule.startTime);

    const title = `Comprobante rechazado para ${bookingCode}`;
    const message = `Tu comprobante para la sesión en ${branchName} (${dateFormatted} a las ${startTimeFormatted} hrs) fue rechazado por el administrador. Motivo: "${reason}". El cupo temporal ha sido liberado.`;

    const emailSubject = `Atención: Comprobante rechazado para Reserva ${bookingCode}`;
    const emailBody = `
Hola ${user.name},

Te informamos que tu comprobante de pago para la reserva ${bookingCode} (${branchName}, ${dateFormatted} a las ${startTimeFormatted} hrs) no pudo ser aprobado.

MOTIVO DEL RECHAZO:
"${reason}"

El cupo reservado ha sido liberado. Si hubo un error con la imagen, puedes agendar nuevamente o comunicarte con el estudio.

Saludos cordiales,
Equipo Pilates Studio
    `.trim();

    const whatsappMessage = `⚠️ *Pilates Studio* | Hola ${user.name}. Tu comprobante para la reserva *${bookingCode}* fue rechazado por el siguiente motivo: "${reason}".`;

    this.logger.log(`[EMAIL SIMULATED] >>> To: ${user.email} | Subject: ${emailSubject}`);
    this.logger.log(`[WHATSAPP SIMULATED] >>> To: ${user.phone || 'N/A'} | Text: ${whatsappMessage}`);

    return this.prisma.notification.create({
      data: {
        userId: user.id,
        title,
        message,
        type: NotificationType.PAYMENT_REJECTED,
        channel: NotificationChannel.IN_APP,
        metadata: {
          bookingCode,
          bookingId: context.id,
          reason,
          classTitle,
          branchName,
          startTime: schedule.startTime,
          email: { to: user.email, subject: emailSubject, body: emailBody },
          whatsapp: { to: user.phone, message: whatsappMessage },
        },
      },
    });
  }

  /**
   * Notificación cuando se cancela una reserva
   */
  async notifyBookingCancelled(context: BookingNotificationContext) {
    const { user, schedule, bookingCode } = context;
    const dateFormatted = this.formatDate(schedule.startTime);
    const startTimeFormatted = this.formatTime(schedule.startTime);
    const classTitle = 'Clase de Pilates';
    const branchName = schedule.branch?.name || 'Sede';

    const title = `Reserva cancelada: ${bookingCode}`;
    const message = `Tu reserva en ${branchName} para el ${dateFormatted} a las ${startTimeFormatted} hrs ha sido cancelada y el cupo fue liberado.`;

    const emailSubject = `Cancelación confirmada: Reserva ${bookingCode}`;
    const emailBody = `
Hola ${user.name},

Confirmamos que tu reserva ${bookingCode} en ${branchName} (${dateFormatted} a las ${startTimeFormatted} hrs) ha sido cancelada exitosamente.

Esperamos verte pronto en otra sesión,
Equipo Pilates Studio
    `.trim();

    const whatsappMessage = `ℹ️ *Pilates Studio* | Confirmamos que tu reserva *${bookingCode}* para el ${dateFormatted} (${startTimeFormatted} hrs) ha sido cancelada.`;

    return this.prisma.notification.create({
      data: {
        userId: user.id,
        title,
        message,
        type: NotificationType.BOOKING_CANCELLED,
        channel: NotificationChannel.IN_APP,
        metadata: {
          bookingCode,
          bookingId: context.id,
          classTitle,
          branchName,
          email: { to: user.email, subject: emailSubject, body: emailBody },
          whatsapp: { to: user.phone, message: whatsappMessage },
        },
      },
    });
  }

  /**
   * Notificación cuando el Administrador modifica un día de clase (cambio de sede o cambio de horario)
   */
  async notifyScheduleUpdated(params: {
    scheduleId: string;
    oldBranchName: string;
    newBranchName: string;
    oldStartTime: Date | string;
    newStartTime: Date | string;
    newEndTime: Date | string;
    reason?: string;
    targetUserIds: string[];
  }) {
    const uniqueIds = Array.from(new Set(params.targetUserIds.filter(Boolean)));
    if (uniqueIds.length === 0) return { notifiedCount: 0 };

    const oldDate = this.formatDate(params.oldStartTime);
    const oldTime = this.formatTime(params.oldStartTime);
    const newDate = this.formatDate(params.newStartTime);
    const newTime = this.formatTime(params.newStartTime);
    const newEnd = this.formatTime(params.newEndTime);

    const branchChanged = params.oldBranchName !== params.newBranchName;
    const title = branchChanged
      ? `Cambio de Sede / Horario en sesión del ${oldDate}`
      : `Actualización de Horario para sesión del ${oldDate}`;

    const reasonText = params.reason?.trim() ? ` Motivo: "${params.reason.trim()}".` : '';
    const message = `La sesión originalmente programada en ${params.oldBranchName} (${oldDate} a las ${oldTime} hrs) ha sido actualizada a: ${params.newBranchName}, el ${newDate} de ${newTime} a ${newEnd} hrs.${reasonText}`;

    await this.prisma.notification.createMany({
      data: uniqueIds.map((uid) => ({
        userId: uid,
        title,
        message,
        type: NotificationType.SCHEDULE_UPDATED,
        channel: NotificationChannel.IN_APP,
        metadata: {
          scheduleId: params.scheduleId,
          oldBranchName: params.oldBranchName,
          newBranchName: params.newBranchName,
          oldStartTime: params.oldStartTime,
          newStartTime: params.newStartTime,
          newEndTime: params.newEndTime,
          reason: params.reason || 'Ajuste operativo de agenda',
        },
      })),
    });

    return { notifiedCount: uniqueIds.length };
  }

  /**
   * Notificación cuando el Administrador cancela / elimina un día específico de clase
   */
  async notifyScheduleCancelled(params: {
    scheduleId: string;
    branchName: string;
    startTime: Date | string;
    reason?: string;
    targetUserIds: string[];
  }) {
    const uniqueIds = Array.from(new Set(params.targetUserIds.filter(Boolean)));
    if (uniqueIds.length === 0) return { notifiedCount: 0 };

    const dateFormatted = this.formatDate(params.startTime);
    const timeFormatted = this.formatTime(params.startTime);
    const reasonText = params.reason?.trim() ? ` Motivo informado: "${params.reason.trim()}".` : '';

    const title = `Aviso de Suspensión de Clase: ${params.branchName} (${dateFormatted})`;
    const message = `Informamos que la sesión del ${dateFormatted} a las ${timeFormatted} hrs en ${params.branchName} no se realizará y fue suspendida de la agenda.${reasonText} Puedes agendar otro día u horario desde la Agenda en Vivo.`;

    await this.prisma.notification.createMany({
      data: uniqueIds.map((uid) => ({
        userId: uid,
        title,
        message,
        type: NotificationType.SCHEDULE_CANCELLED,
        channel: NotificationChannel.IN_APP,
        metadata: {
          scheduleId: params.scheduleId,
          branchName: params.branchName,
          startTime: params.startTime,
          reason: params.reason || 'Suspensión de sesión por administración',
        },
      })),
    });

    return { notifiedCount: uniqueIds.length };
  }

  /**
   * Notificación cuando el alumno se une a la lista de espera (sobrecupo)
   */
  async notifyWaitlistJoined(waitlistEntry: any, user: any, schedule: any) {
    const classTitle = 'Clase de Pilates';
    const branchName = schedule.branch?.name || 'Sede';
    const dateFormatted = this.formatDate(schedule.startTime);
    const startTimeFormatted = this.formatTime(schedule.startTime);
    const position = waitlistEntry.position || 1;

    const title = `En lista de espera en ${branchName} (#${position})`;
    const message = `Te has unido exitosamente a la lista de espera (posición #${position} de 3) en ${branchName} para el ${dateFormatted} a las ${startTimeFormatted} hrs. Si un alumno cancela, te avisaremos de inmediato.`;

    return this.prisma.notification.create({
      data: {
        userId: user.id,
        title,
        message,
        type: NotificationType.WAITLIST_JOINED,
        channel: NotificationChannel.IN_APP,
        metadata: {
          waitlistEntryId: waitlistEntry.id,
          scheduleId: schedule.id,
          position,
          classTitle,
          branchName,
        },
      },
    });
  }

  /**
   * Notificación cuando se le ofrece el cupo liberado al siguiente en espera (1 hora para aceptar)
   */
  async notifyWaitlistOffered(waitlistEntry: any, user: any, schedule: any) {
    const classTitle = 'Clase de Pilates';
    const branchName = schedule.branch?.name || 'Sede';
    const dateFormatted = this.formatDate(schedule.startTime);
    const startTimeFormatted = this.formatTime(schedule.startTime);
    const expiresFormatted = waitlistEntry.expiresAt
      ? this.formatTime(waitlistEntry.expiresAt)
      : '1 hora';

    const title = `¡Cupo disponible en ${branchName}! Tienes 1 hora para confirmar ⚡`;
    const message = `¡Buenas noticias! Se ha liberado un lugar en ${branchName} para el ${dateFormatted} a las ${startTimeFormatted} hrs. Tienes hasta las ${expiresFormatted} hrs (1 hora) para confirmar tu reserva antes de que pase al siguiente alumno.`;

    return this.prisma.notification.create({
      data: {
        userId: user.id,
        title,
        message,
        type: NotificationType.WAITLIST_OFFER,
        channel: NotificationChannel.IN_APP,
        metadata: {
          waitlistEntryId: waitlistEntry.id,
          scheduleId: schedule.id,
          expiresAt: waitlistEntry.expiresAt,
          classTitle,
          branchName,
        },
      },
    });
  }

  /**
   * Notificación cuando expira la oferta de 1 hora
   */
  async notifyWaitlistExpired(waitlistEntry: any, user: any, schedule: any) {
    const classTitle = 'Clase de Pilates';
    const branchName = schedule.branch?.name || 'Sede';

    const title = `Plazo de reserva expirado en ${branchName}`;
    const message = `El plazo de 1 hora para confirmar tu cupo en ${branchName} ha finalizado. El cupo ha sido ofrecido al siguiente alumno en espera.`;

    return this.prisma.notification.create({
      data: {
        userId: user.id,
        title,
        message,
        type: NotificationType.WAITLIST_EXPIRED,
        channel: NotificationChannel.IN_APP,
        metadata: {
          waitlistEntryId: waitlistEntry.id,
          scheduleId: schedule.id,
          classTitle,
          branchName,
        },
      },
    });
  }

  // --- Consultas y Gestión ---

  async getMyNotifications(userId: string) {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new ForbiddenException('Identificador de usuario inválido o no autenticado');
    }

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: userId.trim() },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({
        where: { userId: userId.trim(), read: false },
      }),
    ]);

    return {
      notifications,
      unreadCount,
    };
  }

  async markAsRead(id: string, userId: string) {
    if (!userId || typeof userId !== 'string') {
      throw new ForbiddenException('Identificador de usuario inválido');
    }

    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notificación con ID '${id}' no encontrada`);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para actualizar esta notificación');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    if (!userId || typeof userId !== 'string') {
      throw new ForbiddenException('Identificador de usuario inválido');
    }

    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { success: true };
  }

  /**
   * Marca como resueltas (leídas) las notificaciones enviadas a los administradores
   * cuando un comprobante ha sido aceptado o rechazado.
   */
  async resolveAdminVoucherNotifications(bookingCode: string, _bookingId?: string) {
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: { id: true },
      });
      const adminIds = admins.map((a) => a.id);

      if (adminIds.length === 0) return { updated: 0 };

      const conditions: any[] = [
        { title: { contains: bookingCode } },
        { message: { contains: bookingCode } },
      ];

      const res = await this.prisma.notification.updateMany({
        where: {
          userId: { in: adminIds },
          type: NotificationType.VOUCHER_UPLOADED,
          read: false,
          OR: conditions,
        },
        data: { read: true },
      });

      this.logger.log(`Resueltas ${res.count} alertas de comprobante pendiente para administradores (Reserva: ${bookingCode})`);
      return { updated: res.count };
    } catch (err) {
      this.logger.warn(`No se pudieron actualizar las notificaciones de admin para ${bookingCode}: ${err}`);
      return { updated: 0 };
    }
  }

  async getAdminNotificationLogs(limit = 100) {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });
  }
}
