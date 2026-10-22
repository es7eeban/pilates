import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AttendanceStatus,
  BookingStatus,
  Role,
  ScheduleStatus,
  Prisma,
} from '@prisma/client';
import { UpdateAttendanceDto } from './dto/update-attendance.dto.js';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto.js';
import { QueryAttendanceDto } from './dto/query-attendance.dto.js';

interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getInstructorClasses(user: AuthUser, query: QueryAttendanceDto) {
    const where: Prisma.ClassScheduleWhereInput = {};

    // Si es ADMIN, por defecto ve todas las clases del estudio (a menos que explícitamente filtre query.all === false)
    if (user.role === Role.ADMIN) {
      if (query.all === false) {
        where.instructorId = user.id;
      }
    } else {
      where.instructorId = user.id;
    }

    if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.date) {
      const start = new Date(query.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(query.date);
      end.setHours(23, 59, 59, 999);
      where.startTime = { gte: start, lte: end };
    }

    const schedules = await this.prisma.classSchedule.findMany({
      where,
      include: {
        classType: true,
        branch: true,
        instructor: {
          select: { id: true, name: true, email: true, phone: true },
        },
        bookings: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            payment: {
              select: {
                id: true,
                amount: true,
                status: true,
                gatewayProvider: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return schedules.map((s) => {
      const activeBookings = s.bookings.filter(
        (b) =>
          b.status === BookingStatus.CONFIRMADA ||
          b.status === BookingStatus.FINALIZADA ||
          b.status === BookingStatus.PENDIENTE_VALIDACION ||
          b.status === BookingStatus.PENDIENTE_PAGO,
      );
      const confirmedBookings = s.bookings.filter(
        (b) => b.status === BookingStatus.CONFIRMADA || b.status === BookingStatus.FINALIZADA,
      );
      const pendingValidationCount = s.bookings.filter(
        (b) => b.status === BookingStatus.PENDIENTE_VALIDACION,
      ).length;
      const unpaidCount = s.bookings.filter(
        (b) => b.status === BookingStatus.PENDIENTE_PAGO,
      ).length;

      const totalEnrolled = activeBookings.length;
      const attendedCount = activeBookings.filter(
        (b) => b.attendanceStatus === AttendanceStatus.ATTENDED,
      ).length;
      const noShowCount = activeBookings.filter(
        (b) => b.attendanceStatus === AttendanceStatus.NO_SHOW,
      ).length;
      const excusedCount = activeBookings.filter(
        (b) => b.attendanceStatus === AttendanceStatus.EXCUSED,
      ).length;
      const pendingCount = activeBookings.filter(
        (b) => b.attendanceStatus === AttendanceStatus.PENDING,
      ).length;

      return {
        id: s.id,
        classTypeId: s.classTypeId,
        instructorId: s.instructorId,
        branchId: s.branchId,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity,
        availableSlots: s.availableSlots,
        price: s.price,
        status: s.status,
        createdAt: s.createdAt,
        classType: s.classType,
        branch: s.branch,
        instructor: s.instructor,
        bookings: s.bookings,
        stats: {
          capacity: s.capacity,
          enrolled: totalEnrolled,
          confirmed: confirmedBookings.length,
          pendingValidation: pendingValidationCount,
          unpaid: unpaidCount,
          availableSlots: s.availableSlots,
          attended: attendedCount,
          noShow: noShowCount,
          excused: excusedCount,
          pending: pendingCount,
        },
      };
    });
  }

  async getClassRoster(user: AuthUser, scheduleId: string) {
    const schedule = await this.prisma.classSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        classType: true,
        branch: true,
        instructor: {
          select: { id: true, name: true, email: true, phone: true },
        },
        bookings: {
          where: {
            status: {
              in: [
                BookingStatus.CONFIRMADA,
                BookingStatus.PENDIENTE_VALIDACION,
                BookingStatus.PENDIENTE_PAGO,
                BookingStatus.FINALIZADA,
              ],
            },
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
            payment: {
              select: {
                id: true,
                amount: true,
                status: true,
                gatewayProvider: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Clase con ID ${scheduleId} no encontrada`);
    }

    if (user.role !== Role.ADMIN && schedule.instructorId !== user.id) {
      throw new ForbiddenException(
        'No tienes autorización para acceder a la nómina de esta clase',
      );
    }

    const activeBookings = schedule.bookings;

    const attendedCount = activeBookings.filter(
      (b) => b.attendanceStatus === AttendanceStatus.ATTENDED,
    ).length;
    const noShowCount = activeBookings.filter(
      (b) => b.attendanceStatus === AttendanceStatus.NO_SHOW,
    ).length;
    const excusedCount = activeBookings.filter(
      (b) => b.attendanceStatus === AttendanceStatus.EXCUSED,
    ).length;
    const pendingCount = activeBookings.filter(
      (b) => b.attendanceStatus === AttendanceStatus.PENDING,
    ).length;

    const pendingValidationCount = activeBookings.filter(
      (b) => b.status === BookingStatus.PENDIENTE_VALIDACION,
    ).length;

    const unpaidCount = activeBookings.filter(
      (b) => b.status === BookingStatus.PENDIENTE_PAGO,
    ).length;

    return {
      schedule: {
        id: schedule.id,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        status: schedule.status,
        capacity: schedule.capacity,
        availableSlots: schedule.availableSlots,
        classType: schedule.classType,
        branch: schedule.branch,
        instructor: schedule.instructor,
      },
      stats: {
        totalEnrolled: activeBookings.length,
        pendingValidationCount,
        unpaidCount,
        attendedCount,
        noShowCount,
        excusedCount,
        pendingCount,
      },
      roster: schedule.bookings,
    };
  }

  async updateBookingAttendance(
    user: AuthUser,
    bookingId: string,
    dto: UpdateAttendanceDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        schedule: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Reserva con ID ${bookingId} no encontrada`);
    }

    if (user.role !== Role.ADMIN && booking.schedule.instructorId !== user.id) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar la asistencia de esta reserva',
      );
    }

    let checkInAt: Date | null = booking.checkInAt;
    if (dto.attendanceStatus === AttendanceStatus.ATTENDED) {
      checkInAt = checkInAt || new Date();
    } else if (dto.attendanceStatus === AttendanceStatus.PENDING) {
      checkInAt = null;
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        attendanceStatus: dto.attendanceStatus,
        checkInAt,
        attendanceNotes:
          dto.notes !== undefined ? dto.notes : booking.attendanceNotes,
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
  }

  async bulkUpdateAttendance(
    user: AuthUser,
    scheduleId: string,
    dto: BulkAttendanceDto,
  ) {
    const schedule = await this.prisma.classSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Clase con ID ${scheduleId} no encontrada`);
    }

    if (user.role !== Role.ADMIN && schedule.instructorId !== user.id) {
      throw new ForbiddenException(
        'No tienes autorización para gestionar la asistencia de esta clase',
      );
    }

    const updates = dto.attendees.map(async (item) => {
      let checkInAt: Date | null = undefined as any;
      if (item.attendanceStatus === AttendanceStatus.ATTENDED) {
        checkInAt = new Date();
      } else if (item.attendanceStatus === AttendanceStatus.PENDING) {
        checkInAt = null;
      }

      return this.prisma.booking.update({
        where: { id: item.bookingId },
        data: {
          attendanceStatus: item.attendanceStatus,
          ...(checkInAt !== undefined ? { checkInAt } : {}),
          ...(item.notes !== undefined ? { attendanceNotes: item.notes } : {}),
        },
      });
    });

    await Promise.all(updates);
    return this.getClassRoster(user, scheduleId);
  }

  async updateScheduleStatus(
    user: AuthUser,
    scheduleId: string,
    status: ScheduleStatus,
  ) {
    const schedule = await this.prisma.classSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Clase con ID ${scheduleId} no encontrada`);
    }

    if (user.role !== Role.ADMIN && schedule.instructorId !== user.id) {
      throw new ForbiddenException(
        'No tienes autorización para modificar el estado de esta clase',
      );
    }

    const updated = await this.prisma.classSchedule.update({
      where: { id: scheduleId },
      data: { status },
      include: {
        classType: true,
        branch: true,
      },
    });

    // Si la clase pasa a COMPLETED ("Clase Realizada"), marcamos reservas confirmadas como FINALIZADA
    if (status === ScheduleStatus.COMPLETED) {
      await this.prisma.booking.updateMany({
        where: {
          scheduleId,
          status: BookingStatus.CONFIRMADA,
        },
        data: {
          status: BookingStatus.FINALIZADA,
        },
      });
    }

    return updated;
  }
}
