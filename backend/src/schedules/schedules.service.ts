import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { BookingStatus, Prisma, Role, ScheduleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateScheduleDto } from './dto/create-schedule.dto.js';
import { BulkGenerateSchedulesDto } from './dto/bulk-generate-schedules.dto.js';
import { QuerySchedulesDto } from './dto/query-schedules.dto.js';
import { UpdateScheduleDto, CancelScheduleDto } from './dto/update-schedule.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async resolveDefaultClassTypeId(classTypeId?: string): Promise<string> {
    if (classTypeId) return classTypeId;
    const defaultType = await this.prisma.classType.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!defaultType) {
      const created = await this.prisma.classType.create({
        data: {
          title: 'Sesión de Pilates Reformer',
          description: 'Sesión guiada de Pilates en estudio.',
          defaultCapacity: 8,
          defaultPrice: 15000,
          durationMinutes: 55,
          intensityLevel: 'Todos los niveles',
          isActive: true,
        },
      });
      return created.id;
    }
    return defaultType.id;
  }

  private async resolveDefaultInstructorId(instructorId?: string): Promise<string | undefined> {
    if (instructorId) return instructorId;
    // En V1 el Administrador es el instructor por defecto
    const admin = await this.prisma.user.findFirst({
      where: { role: Role.ADMIN, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return admin?.id;
  }

  private async resolveNotificationRecipients(
    scheduleId: string,
    notifyTarget?: 'ENROLLED' | 'ALL_CLIENTS' | 'NONE',
  ): Promise<string[]> {
    if (notifyTarget === 'NONE') return [];

    if (notifyTarget === 'ALL_CLIENTS') {
      const clients = await this.prisma.user.findMany({
        where: { role: Role.CLIENT, isActive: true },
        select: { id: true },
      });
      return clients.map((c) => c.id);
    }

    // Por defecto ('ENROLLED'): notificar a los alumnos con reserva activa en esa sesión
    const bookings = await this.prisma.booking.findMany({
      where: {
        scheduleId,
        status: {
          notIn: [BookingStatus.CANCELADA_CLIENTE, BookingStatus.RECHAZADA_ADMIN],
        },
      },
      select: { userId: true },
    });
    return bookings.map((b) => b.userId);
  }

  async findAll(query: QuerySchedulesDto) {
    const where: Prisma.ClassScheduleWhereInput = {};

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = { not: ScheduleStatus.CANCELLED };
    }

    if (query.classTypeId) {
      where.classTypeId = query.classTypeId;
    }

    if (query.instructorId) {
      where.instructorId = query.instructorId;
    }

    if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.dateFrom || query.dateTo) {
      where.startTime = {};
      if (query.dateFrom) {
        where.startTime.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.startTime.lte = new Date(query.dateTo);
      }
    }

    if (query.onlyAvailable) {
      where.availableSlots = { gt: 0 };
    }

    return this.prisma.classSchedule.findMany({
      where,
      include: {
        classType: true,
        branch: true,
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isInstructor: true,
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findById(id: string) {
    const schedule = await this.prisma.classSchedule.findUnique({
      where: { id },
      include: {
        classType: true,
        branch: true,
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isInstructor: true,
          },
        },
        bookings: {
          select: {
            id: true,
            bookingCode: true,
            status: true,
            createdAt: true,
            user: {
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

    if (!schedule) {
      throw new NotFoundException(`Sesión de clase con ID '${id}' no encontrada`);
    }

    return schedule;
  }

  async create(dto: CreateScheduleDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Formato de fecha u hora no válido');
    }

    if (start >= end) {
      throw new BadRequestException('La hora de inicio debe ser anterior a la hora de término');
    }

    const resolvedClassTypeId = await this.resolveDefaultClassTypeId(dto.classTypeId);
    const classType = await this.prisma.classType.findUnique({
      where: { id: resolvedClassTypeId },
    });

    if (!classType || !classType.isActive) {
      throw new BadRequestException('El tipo de clase no existe o está inactivo');
    }

    const resolvedInstructorId = await this.resolveDefaultInstructorId(dto.instructorId);

    if (dto.instructorId) {
      const instructor = await this.prisma.user.findUnique({
        where: { id: dto.instructorId },
      });

      if (!instructor || !instructor.isActive) {
        throw new BadRequestException('El instructor no existe o está inactivo');
      }

      const canTeach = instructor.isInstructor || instructor.role === 'INSTRUCTOR' || instructor.role === 'ADMIN';
      if (!canTeach) {
        throw new BadRequestException('El usuario seleccionado no tiene facultades de instructor');
      }

      const overlap = await this.prisma.classSchedule.findFirst({
        where: {
          instructorId: dto.instructorId,
          status: { not: ScheduleStatus.CANCELLED },
          AND: [
            { startTime: { lt: end } },
            { endTime: { gt: start } },
          ],
        },
      });

      if (overlap) {
        throw new ConflictException('El instructor ya tiene otra clase agendada (traslape de horario) en este mismo intervalo horario');
      }
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
      });
      if (!branch || !branch.isActive) {
        throw new BadRequestException('La sede seleccionada no existe o está inactiva');
      }
    }

    const capacity = dto.capacity ?? classType.defaultCapacity;
    const price = dto.price ?? classType.defaultPrice;

    return this.prisma.classSchedule.create({
      data: {
        classTypeId: resolvedClassTypeId,
        instructorId: resolvedInstructorId,
        branchId: dto.branchId,
        startTime: start,
        endTime: end,
        capacity,
        availableSlots: capacity,
        price,
        status: ScheduleStatus.SCHEDULED,
      },
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
    });
  }

  async bulkGenerate(dto: BulkGenerateSchedulesDto) {
    const resolvedClassTypeId = await this.resolveDefaultClassTypeId(dto.classTypeId);
    const classType = await this.prisma.classType.findUnique({
      where: { id: resolvedClassTypeId },
    });

    if (!classType || !classType.isActive) {
      throw new BadRequestException('El tipo de clase no existe o está inactivo');
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
      });
      if (!branch || !branch.isActive) {
        throw new BadRequestException('La sede seleccionada no existe o está inactiva');
      }
    }

    const resolvedInstructorId = await this.resolveDefaultInstructorId(dto.instructorId);

    const duration = dto.durationMinutes ?? classType.durationMinutes;
    const capacity = dto.capacity ?? classType.defaultCapacity;
    const price = dto.price ?? classType.defaultPrice;

    const startDate = new Date(`${dto.startDate}T00:00:00Z`);
    const endDate = new Date(`${dto.endDate}T23:59:59Z`);

    if (startDate > endDate) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    const createdSchedules: any[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const jsDay = currentDate.getUTCDay();
      const isoDay = jsDay === 0 ? 7 : jsDay;

      if (dto.daysOfWeek.includes(isoDay)) {
        const year = currentDate.getUTCFullYear();
        const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getUTCDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        for (const timeStr of dto.times) {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const startTime = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`);
          const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

          let skip = false;
          if (dto.instructorId) {
            const overlap = await this.prisma.classSchedule.findFirst({
              where: {
                instructorId: dto.instructorId,
                status: { not: ScheduleStatus.CANCELLED },
                AND: [
                  { startTime: { lt: endTime } },
                  { endTime: { gt: startTime } },
                ],
              },
            });
            if (overlap) {
              skip = true;
            }
          }

          if (!skip) {
            const schedule = await this.prisma.classSchedule.create({
              data: {
                classTypeId: resolvedClassTypeId,
                instructorId: resolvedInstructorId,
                branchId: dto.branchId,
                startTime,
                endTime,
                capacity,
                availableSlots: capacity,
                price,
                status: ScheduleStatus.SCHEDULED,
              },
            });
            createdSchedules.push(schedule);
          }
        }
      }

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return {
      message: `Se generaron exitosamente ${createdSchedules.length} sesiones de clase`,
      count: createdSchedules.length,
      schedules: createdSchedules,
    };
  }

  /**
   * Modifica un día de clase puntual (cambio de sede, cambio de horario, aforo o precio)
   * y envía notificación opcional a los alumnos inscritos o a todos los alumnos activos.
   */
  async update(id: string, dto: UpdateScheduleDto) {
    const existing = await this.findById(id);

    const newStart = dto.startTime ? new Date(dto.startTime) : existing.startTime;
    const newEnd = dto.endTime ? new Date(dto.endTime) : existing.endTime;

    if (newStart >= newEnd) {
      throw new BadRequestException('La hora de inicio debe ser anterior a la hora de término');
    }

    let newBranchName = existing.branch?.name || 'Sede Principal';
    if (dto.branchId && dto.branchId !== existing.branchId) {
      const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } });
      if (!branch || !branch.isActive) {
        throw new BadRequestException('La sede seleccionada no existe o está inactiva');
      }
      newBranchName = branch.name;
    }

    // Calcular nuevo availableSlots proporcional si cambia capacity
    let newAvailableSlots = existing.availableSlots;
    if (dto.capacity !== undefined && dto.capacity !== existing.capacity) {
      const occupied = existing.capacity - existing.availableSlots;
      newAvailableSlots = Math.max(0, dto.capacity - occupied);
    }

    const updated = await this.prisma.classSchedule.update({
      where: { id },
      data: {
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
        ...(dto.startTime !== undefined && { startTime: newStart }),
        ...(dto.endTime !== undefined && { endTime: newEnd }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity, availableSlots: newAvailableSlots }),
        ...(dto.price !== undefined && { price: dto.price }),
      },
      include: {
        classType: true,
        branch: true,
        instructor: true,
      },
    });

    // Emitir notificación si corresponde
    try {
      const targetUserIds = await this.resolveNotificationRecipients(id, dto.notifyTarget ?? 'ENROLLED');
      if (targetUserIds.length > 0) {
        await this.notificationsService.notifyScheduleUpdated({
          scheduleId: id,
          oldBranchName: existing.branch?.name || 'Sede Principal',
          newBranchName: updated.branch?.name || newBranchName,
          oldStartTime: existing.startTime,
          newStartTime: updated.startTime,
          newEndTime: updated.endTime,
          reason: dto.reason,
          targetUserIds,
        });
      }
    } catch {
      // No interrumpir actualización si falla notificación
    }

    return updated;
  }

  /**
   * Cancela / elimina un día específico de clase (ej. un viernes que no habrá clases)
   * y notifica a los alumnos inscritos o a todos los alumnos activos del estudio.
   */
  async cancel(id: string, dto?: CancelScheduleDto) {
    const schedule = await this.findById(id);

    if (schedule.status === ScheduleStatus.CANCELLED) {
      throw new ConflictException('La sesión ya se encuentra cancelada');
    }

    const targetUserIds = await this.resolveNotificationRecipients(id, dto?.notifyTarget ?? 'ENROLLED');

    const updated = await this.prisma.$transaction(async (tx) => {
      // Cancelar reservas activas asociadas a ese día
      await tx.booking.updateMany({
        where: {
          scheduleId: id,
          status: {
            notIn: [BookingStatus.CANCELADA_CLIENTE, BookingStatus.RECHAZADA_ADMIN],
          },
        },
        data: {
          status: BookingStatus.CANCELADA_CLIENTE,
          rejectionReason: dto?.reason || 'Sesión suspendida por administración',
        },
      });

      return tx.classSchedule.update({
        where: { id },
        data: { status: ScheduleStatus.CANCELLED },
        include: {
          classType: true,
          branch: true,
          instructor: true,
        },
      });
    });

    try {
      if (targetUserIds.length > 0) {
        await this.notificationsService.notifyScheduleCancelled({
          scheduleId: id,
          branchName: schedule.branch?.name || 'Sede Principal',
          startTime: schedule.startTime,
          reason: dto?.reason,
          targetUserIds,
        });
      }
    } catch {
      // No frenar cancelación si falla notificación
    }

    return updated;
  }

  /**
   * Bloqueo pesimista para reserva concurrente de cupos en PostgreSQL
   */
  async reserveSlotWithPessimisticLock(
    scheduleId: string,
    txClient?: Prisma.TransactionClient,
  ) {
    const runner = txClient ?? this.prisma;

    const rows = await runner.$queryRaw<
      Array<{ id: string; available_slots: number; capacity: number; status: ScheduleStatus }>
    >`
      SELECT id, available_slots, capacity, status 
      FROM class_schedules 
      WHERE id = ${scheduleId} 
      FOR UPDATE;
    `;

    const row = rows[0];
    if (!row) {
      throw new NotFoundException(`Sesión de clase '${scheduleId}' no encontrada`);
    }

    if (row.status !== ScheduleStatus.SCHEDULED) {
      throw new ConflictException('La clase no se encuentra abierta para reservas');
    }

    if (row.available_slots <= 0) {
      throw new ConflictException('No hay cupos disponibles para esta clase (Aforo completo)');
    }

    return runner.classSchedule.update({
      where: { id: scheduleId },
      data: {
        availableSlots: { decrement: 1 },
      },
    });
  }

  /**
   * Liberación segura de cupo bloqueando la fila con FOR UPDATE.
   */
  async releaseSlotWithPessimisticLock(
    scheduleId: string,
    txClient?: Prisma.TransactionClient,
  ) {
    const runner = txClient ?? this.prisma;

    const rows = await runner.$queryRaw<
      Array<{ id: string; available_slots: number; capacity: number }>
    >`
      SELECT id, available_slots, capacity 
      FROM class_schedules 
      WHERE id = ${scheduleId} 
      FOR UPDATE;
    `;

    const row = rows[0];
    if (!row) {
      throw new NotFoundException(`Sesión de clase '${scheduleId}' no encontrada`);
    }

    if (row.available_slots < row.capacity) {
      return runner.classSchedule.update({
        where: { id: scheduleId },
        data: {
          availableSlots: { increment: 1 },
        },
      });
    }

    return runner.classSchedule.findUnique({ where: { id: scheduleId } });
  }
}
