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
    });
  }

  private formatTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
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
    const classTitle = schedule.classType?.title || 'Pilates Reformer';
    const branchName = schedule.branch?.name || 'Sede Principal';
    const branchAddress = schedule.branch?.address || '';
    const instructorName = schedule.instructor?.name || 'Instructor asignado';
    const priceFormatted = this.formatCurrency(schedule.price);

    const isTransfer = paymentMethod === 'TRANSFER';

    const title = isTransfer
      ? `Reserva ${bookingCode} registrada: Pendiente de transferencia`
      : `Reserva ${bookingCode} creada: Pendiente de pago`;

    const inAppMessage = isTransfer
      ? `Tu reserva para "${classTitle}" en ${branchName} el ${dateFormatted} a las ${startTimeFormatted} hrs fue registrada con éxito. Realiza la transferencia por ${priceFormatted} y sube tu comprobante para asegurar tu cupo.`
      : `Tu reserva para "${classTitle}" en ${branchName} el ${dateFormatted} a las ${startTimeFormatted} hrs fue creada. Completa el pago en línea para asegurar tu lugar.`;

    const emailSubject = `Confirmación de Reserva ${bookingCode} - Pilates Studio`;
    const emailBody = `
Hola ${user.name},

Hemos recibido tu solicitud de reserva en Pilates Studio:
- Código de Reserva: ${bookingCode}
- Clase: ${classTitle}
- Sede: ${branchName} (${branchAddress})
- Horario: ${dateFormatted}, de ${startTimeFormatted} a ${endTimeFormatted} hrs
- Instructor/a: ${instructorName}
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

Una vez realizada la transferencia, sube tu comprobante desde la plataforma o envíanoslo para validar tu asistencia.`
    : `Puedes completar tu pago a través de Mercado Pago en la plataforma para confirmar tu asistencia inmediatamente.`
}

¡Te esperamos en el estudio!
Equipo Pilates Studio
    `.trim();

    const whatsappMessage = `🧘‍♀️ *Pilates Studio* | Hola ${user.name}! Tu reserva *${bookingCode}* para ${classTitle} en ${branchName} (${dateFormatted} a las ${startTimeFormatted} hrs) ha sido generada.${
      isTransfer
        ? ` Recuerda transferir ${priceFormatted} a Santander Cta Cte 74-89214-0 (RUT 76.543.210-K) y subir tu comprobante.`
        : ` Completa tu pago en línea para confirmar tu lugar.`
    }`;

    // Despacho simulado con log auditado
    this.logger.log(`[EMAIL SIMULATED] >>> To: ${user.email} | Subject: ${emailSubject}`);
    this.logger.log(`[WHATSAPP SIMULATED] >>> To: ${user.phone || 'N/A'} | Text: ${whatsappMessage}`);

    // Persistencia in-app
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
          price: schedule.price,
          email: { to: user.email, subject: emailSubject, body: emailBody },
          whatsapp: { to: user.phone, message: whatsappMessage },
        },
      },
    });
  }

  /**
   * Notificación cuando el alumno adjunta un comprobante de transferencia
   */
  async notifyVoucherUploaded(context: BookingNotificationContext) {
    const { user, schedule, bookingCode } = context;
    const classTitle = schedule.classType?.title || 'Pilates Reformer';
    const branchName = schedule.branch?.name || 'Sede Principal';

    const title = `Comprobante recibido para ${bookingCode}`;
    const message = `Recibimos tu comprobante de pago para la clase "${classTitle}" en ${branchName}. Nuestro equipo de administración lo revisará a la brevedad.`;

    const emailSubject = `Comprobante recibido para Reserva ${bookingCode}`;
    const emailBody = `
Hola ${user.name},

Hemos recibido tu comprobante de transferencia para la reserva ${bookingCode} (${classTitle} en ${branchName}).
Un administrador validará los fondos y recibirás tu confirmación definitiva en cuanto esté aprobado.

Gracias por tu paciencia,
Equipo Pilates Studio
    `.trim();

    const whatsappMessage = `📄 *Pilates Studio* | Comprobante recibido para la reserva *${bookingCode}*. Nuestro equipo lo está revisando. Te avisaremos apenas esté validado!`;

    this.logger.log(`[EMAIL SIMULATED] >>> To: ${user.email} | Subject: ${emailSubject}`);
    this.logger.log(`[WHATSAPP SIMULATED] >>> To: ${user.phone || 'N/A'} | Text: ${whatsappMessage}`);

    // 1. Notificación para el alumno
    const userNotification = await this.prisma.notification.create({
      data: {
        userId: user.id,
        title,
        message,
        type: NotificationType.VOUCHER_UPLOADED,
        channel: NotificationChannel.IN_APP,
        metadata: {
          bookingCode,
          bookingId: context.id,
          voucherUrl: context.voucherUrl,
          email: { to: user.email, subject: emailSubject, body: emailBody },
          whatsapp: { to: user.phone, message: whatsappMessage },
        },
      },
    });

    // 2. Notificación para los administradores del estudio
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: Role.ADMIN, isActive: true },
        select: { id: true, email: true },
      });

      for (const admin of admins) {
        await this.prisma.notification.create({
          data: {
            userId: admin.id,
            title: `Nuevo comprobante por validar: ${bookingCode}`,
            message: `El alumno ${user.name} (${user.email}) ha subido un comprobante para la clase "${classTitle}" en ${branchName}.`,
            type: NotificationType.VOUCHER_UPLOADED,
            channel: NotificationChannel.IN_APP,
            metadata: {
              bookingCode,
              bookingId: context.id,
              studentName: user.name,
              studentEmail: user.email,
              voucherUrl: context.voucherUrl,
            },
          },
        });
      }
    } catch (e) {
      this.logger.warn(`Could not notify admins of voucher upload: ${e}`);
    }

    return userNotification;
  }

  /**
   * Notificación cuando el administrador aprueba el pago
   */
  async notifyPaymentApproved(context: BookingNotificationContext) {
    const { user, schedule, bookingCode } = context;
    const dateFormatted = this.formatDate(schedule.startTime);
    const startTimeFormatted = this.formatTime(schedule.startTime);
    const endTimeFormatted = this.formatTime(schedule.endTime);
    const classTitle = schedule.classType?.title || 'Pilates Reformer';
    const branchName = schedule.branch?.name || 'Sede';
    const branchAddress = schedule.branch?.address || '';
    const instructorName = schedule.instructor?.name || 'Instructor asignado';

    const title = `¡Pago aprobado! Cupo confirmado para ${bookingCode} 🧘‍♀️`;
    const message = `Tu pago ha sido validado exitosamente. Tu cupo para "${classTitle}" en ${branchName} el ${dateFormatted} a las ${startTimeFormatted} hrs está 100% asegurado.`;

    const emailSubject = `¡Ticket Confirmado! Tu clase ${bookingCode} está lista`;
    const emailBody = `
¡Hola ${user.name}!

Tu pago para la reserva ${bookingCode} ha sido verificado y aprobado.
Tu cupo en la máquina reformer está garantizado:

DETALLES DE TU SESIÓN:
- Disciplina: ${classTitle}
- Sede: ${branchName} - ${branchAddress}
- Fecha: ${dateFormatted}
- Horario: ${startTimeFormatted} a ${endTimeFormatted} hrs
- Instructor/a: ${instructorName}

RECOMENDACIONES IMPORTANTES:
1. Llega al menos 10 minutos antes del inicio.
2. Es obligatorio el uso de calcetines antideslizantes (grip socks).
3. Trae una toalla personal y una botella de agua.
4. Avisa a tu instructor si tienes alguna lesión previa o condición médica.

¡Nos vemos en el estudio!
Pilates Studio
    `.trim();

    const whatsappMessage = `✅ *¡Pago Confirmado!* Hola ${user.name}, tu clase *${classTitle}* en *${branchName}* para el ${dateFormatted} a las ${startTimeFormatted} hrs está confirmada. Recuerda llegar 10 min antes y traer calcetines antideslizantes. Ticket: *${bookingCode}*. Nos vemos! 🧘‍♀️`;

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
   * Notificación cuando el administrador rechaza el comprobante
   */
  async notifyPaymentRejected(context: BookingNotificationContext, reason: string) {
    const { user, schedule, bookingCode } = context;
    const classTitle = schedule.classType?.title || 'Pilates Reformer';
    const branchName = schedule.branch?.name || 'Sede';

    const title = `Comprobante rechazado para ${bookingCode}`;
    const message = `Tu comprobante para la clase "${classTitle}" en ${branchName} fue rechazado. Motivo: ${reason}. El cupo temporal ha sido liberado.`;

    const emailSubject = `Atención: Comprobante rechazado para Reserva ${bookingCode}`;
    const emailBody = `
Hola ${user.name},

Te informamos que tu comprobante de pago para la reserva ${bookingCode} (${classTitle} en ${branchName}) no pudo ser aprobado.

MOTIVO DEL RECHAZO:
"${reason}"

El cupo reservado ha sido liberado temporalmente para otros alumnos. Si realizaste la transferencia o hubo un error con la imagen, puedes comunicarte con nuestro equipo a soporte@pilates.cl o agendar nuevamente.

Saludos cordiales,
Equipo Pilates Studio
    `.trim();

    const whatsappMessage = `⚠️ *Pilates Studio* | Hola ${user.name}. Tu comprobante para la reserva *${bookingCode}* fue rechazado por el siguiente motivo: "${reason}". Si tienes dudas contáctanos de inmediato.`;

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
    const classTitle = schedule.classType?.title || 'Pilates Reformer';
    const branchName = schedule.branch?.name || 'Sede';

    const title = `Reserva cancelada: ${bookingCode}`;
    const message = `Tu reserva para "${classTitle}" en ${branchName} el ${dateFormatted} a las ${startTimeFormatted} hrs ha sido cancelada y el cupo fue liberado.`;

    const emailSubject = `Cancelación confirmada: Reserva ${bookingCode}`;
    const emailBody = `
Hola ${user.name},

Confirmamos que tu reserva ${bookingCode} para la clase "${classTitle}" en ${branchName} (${dateFormatted} a las ${startTimeFormatted} hrs) ha sido cancelada exitosamente.
El cupo ha sido liberado en la agenda del estudio.

Esperamos verte pronto en otra sesión,
Equipo Pilates Studio
    `.trim();

    const whatsappMessage = `ℹ️ *Pilates Studio* | Confirmamos que tu reserva *${bookingCode}* para el ${dateFormatted} (${startTimeFormatted} hrs) ha sido cancelada.`;

    this.logger.log(`[EMAIL SIMULATED] >>> To: ${user.email} | Subject: ${emailSubject}`);
    this.logger.log(`[WHATSAPP SIMULATED] >>> To: ${user.phone || 'N/A'} | Text: ${whatsappMessage}`);

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

  // --- Consultas y Gestión ---

  async getMyNotifications(userId: string) {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    return {
      notifications,
      unreadCount,
    };
  }

  async markAsRead(id: string, userId: string) {
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
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { success: true };
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
