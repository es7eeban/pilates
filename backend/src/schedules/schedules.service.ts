import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BookingStatus, Prisma, Role, ScheduleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateScheduleDto } from './dto/create-schedule.dto.js';
import { BulkGenerateSchedulesDto } from './dto/bulk-generate-schedules.dto.js';
import { QuerySchedulesDto } from './dto/query-schedules.dto.js';
import {
  UpdateScheduleDto,
  CancelScheduleDto,
  BulkUpdateSchedulesDto,
  BulkCancelSchedulesDto,
  CreateStudioTimeSlotDto,
  UpdateStudioTimeSlotDto,
} from './dto/update-schedule.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';

export interface StudioTimeSlotRecord {
  id: string;
  period: 'AM' | 'PM';
  startTime: string;
  endTime: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

const DEFAULT_STUDIO_TIME_SLOTS: Array<{
  period: 'AM' | 'PM';
  startTime: string;
  endTime: string;
  label: string;
  sortOrder: number;
}> = [
  { period: 'AM', startTime: '08:00', endTime: '09:00', label: 'De 8:00 a 9:00 AM', sortOrder: 800 },
  { period: 'AM', startTime: '09:00', endTime: '10:00', label: 'De 9:00 a 10:00 AM', sortOrder: 900 },
  { period: 'AM', startTime: '10:00', endTime: '11:00', label: 'De 10:00 a 11:00 AM', sortOrder: 1000 },
  { period: 'AM', startTime: '11:00', endTime: '12:00', label: 'De 11:00 a 12:00 AM', sortOrder: 1100 },
  { period: 'PM', startTime: '12:00', endTime: '13:00', label: 'De 12:00 a 1:00 PM', sortOrder: 1200 },
  { period: 'PM', startTime: '13:00', endTime: '14:00', label: 'De 1:00 a 2:00 PM', sortOrder: 1300 },
  { period: 'PM', startTime: '14:00', endTime: '15:00', label: 'De 2:00 a 3:00 PM', sortOrder: 1400 },
  { period: 'PM', startTime: '15:00', endTime: '16:00', label: 'De 3:00 a 4:00 PM', sortOrder: 1500 },
  { period: 'PM', startTime: '16:00', endTime: '17:00', label: 'De 4:00 a 5:00 PM', sortOrder: 1600 },
  { period: 'PM', startTime: '17:00', endTime: '18:00', label: 'De 5:00 a 6:00 PM', sortOrder: 1700 },
  { period: 'PM', startTime: '18:00', endTime: '19:00', label: 'De 6:00 a 7:00 PM', sortOrder: 1800 },
  { period: 'PM', startTime: '19:00', endTime: '20:00', label: 'De 7:00 a 8:00 PM', sortOrder: 1900 },
  { period: 'PM', startTime: '20:00', endTime: '21:00', label: 'De 8:00 a 9:00 PM', sortOrder: 2000 },
  { period: 'PM', startTime: '21:00', endTime: '22:00', label: 'De 9:00 a 10:00 PM', sortOrder: 2100 },
];

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private format12HourTime(hhmm: string): string {
    const [hStr, mStr] = hhmm.split(':');
    const h = parseInt(hStr, 10);
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${mStr}`;
  }

  private buildHumanLabel(startTime: string, endTime: string, period: 'AM' | 'PM'): string {
    return `De ${this.format12HourTime(startTime)} a ${this.format12HourTime(endTime)} ${period}`;
  }

  private computeSortOrder(startTime: string): number {
    const [h, m] = startTime.split(':').map((n) => parseInt(n, 10));
    return h * 100 + m;
  }

  private async ensureTimeSlotsTableAndDefaults(): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS studio_time_slots (
        id VARCHAR(64) PRIMARY KEY,
        period VARCHAR(5) NOT NULL,
        start_time VARCHAR(10) NOT NULL,
        end_time VARCHAR(10) NOT NULL,
        label VARCHAR(120) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const countRows = await this.prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
      `SELECT COUNT(*)::int AS count FROM studio_time_slots;`,
    );
    const total = Number(countRows[0]?.count ?? 0);

    if (total === 0) {
      for (const item of DEFAULT_STUDIO_TIME_SLOTS) {
        await this.prisma.$executeRaw`
          INSERT INTO studio_time_slots (id, period, start_time, end_time, label, is_active, sort_order, created_at, updated_at)
          VALUES (${randomUUID()}, ${item.period}, ${item.startTime}, ${item.endTime}, ${item.label}, true, ${item.sortOrder}, NOW(), NOW());
        `;
      }
    }
  }

  async getTimeSlots(): Promise<StudioTimeSlotRecord[]> {
    await this.ensureTimeSlotsTableAndDefaults();

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        period: string;
        start_time: string;
        end_time: string;
        label: string;
        is_active: boolean;
        sort_order: number;
      }>
    >`
      SELECT id, period, start_time, end_time, label, is_active, sort_order
      FROM studio_time_slots
      WHERE is_active = true
      ORDER BY sort_order ASC, start_time ASC, end_time ASC;
    `;

    return rows.map((r) => ({
      id: r.id,
      period: (r.period === 'PM' ? 'PM' : 'AM') as 'AM' | 'PM',
      startTime: r.start_time,
      endTime: r.end_time,
      label: r.label,
      isActive: r.is_active,
      sortOrder: r.sort_order,
    }));
  }

  async createTimeSlot(dto: CreateStudioTimeSlotDto): Promise<StudioTimeSlotRecord> {
    await this.ensureTimeSlotsTableAndDefaults();

    const [startH, startM] = dto.startTime.split(':').map(Number);
    const [endH, endM] = dto.endTime.split(':').map(Number);
    if (startH * 60 + startM >= endH * 60 + endM) {
      throw new BadRequestException('La hora de inicio debe ser menor a la hora de término');
    }

    const existing = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM studio_time_slots
      WHERE period = ${dto.period}
        AND start_time = ${dto.startTime}
        AND end_time = ${dto.endTime}
        AND is_active = true
      LIMIT 1;
    `;
    if (existing.length > 0) {
      throw new ConflictException(
        `El horario ${dto.startTime} a ${dto.endTime} (${dto.period}) ya existe en el selector`,
      );
    }

    const id = randomUUID();
    const label = dto.label?.trim() || this.buildHumanLabel(dto.startTime, dto.endTime, dto.period);
    const sortOrder = this.computeSortOrder(dto.startTime);

    await this.prisma.$executeRaw`
      INSERT INTO studio_time_slots (id, period, start_time, end_time, label, is_active, sort_order, created_at, updated_at)
      VALUES (${id}, ${dto.period}, ${dto.startTime}, ${dto.endTime}, ${label}, true, ${sortOrder}, NOW(), NOW());
    `;

    return {
      id,
      period: dto.period,
      startTime: dto.startTime,
      endTime: dto.endTime,
      label,
      isActive: true,
      sortOrder,
    };
  }

  async updateTimeSlot(
    slotId: string,
    dto: UpdateStudioTimeSlotDto,
  ): Promise<StudioTimeSlotRecord> {
    await this.ensureTimeSlotsTableAndDefaults();

    const existingRows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        period: string;
        start_time: string;
        end_time: string;
        label: string;
        is_active: boolean;
        sort_order: number;
      }>
    >`
      SELECT id, period, start_time, end_time, label, is_active, sort_order
      FROM studio_time_slots
      WHERE id = ${slotId}
      LIMIT 1;
    `;

    const current = existingRows[0];
    if (!current) {
      throw new NotFoundException('El selector de horario no fue encontrado');
    }

    const nextPeriod = (dto.period || current.period) as 'AM' | 'PM';
    const nextStart = dto.startTime || current.start_time;
    const nextEnd = dto.endTime || current.end_time;

    const [startH, startM] = nextStart.split(':').map(Number);
    const [endH, endM] = nextEnd.split(':').map(Number);
    if (startH * 60 + startM >= endH * 60 + endM) {
      throw new BadRequestException('La hora de inicio debe ser menor a la hora de término');
    }

    const nextLabel =
      dto.label?.trim() || this.buildHumanLabel(nextStart, nextEnd, nextPeriod);
    const nextSortOrder = this.computeSortOrder(nextStart);
    const nextActive = dto.isActive !== undefined ? dto.isActive : current.is_active;

    await this.prisma.$executeRaw`
      UPDATE studio_time_slots
      SET period = ${nextPeriod},
          start_time = ${nextStart},
          end_time = ${nextEnd},
          label = ${nextLabel},
          is_active = ${nextActive},
          sort_order = ${nextSortOrder},
          updated_at = NOW()
      WHERE id = ${slotId};
    `;

    return {
      id: slotId,
      period: nextPeriod,
      startTime: nextStart,
      endTime: nextEnd,
      label: nextLabel,
      isActive: nextActive,
      sortOrder: nextSortOrder,
    };
  }

  async deleteTimeSlot(slotId: string): Promise<{ deleted: boolean; id: string }> {
    await this.ensureTimeSlotsTableAndDefaults();
    await this.prisma.$executeRaw`
      DELETE FROM studio_time_slots WHERE id = ${slotId};
    `;
    return { deleted: true, id: slotId };
  }

  async resetDefaultTimeSlots(): Promise<StudioTimeSlotRecord[]> {
    await this.ensureTimeSlotsTableAndDefaults();
    await this.prisma.$executeRawUnsafe(`DELETE FROM studio_time_slots;`);
    return this.getTimeSlots();
  }

  private async resolveDefaultClassTypeId(classTypeId?: string): Promise<string> {
    if (classTypeId) return classTypeId;
    const defaultType = await this.prisma.classType.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!defaultType) {
      const created = await this.prisma.classType.create({
        data: {
          title: 'Clase de Pilates',
          description: 'Sesión guiada de Pilates en estudio.',
          defaultCapacity: 8,
          defaultPrice: 15000,
          durationMinutes: 60,
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

    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
      });
      if (!branch || !branch.isActive) {
        throw new BadRequestException('La sede seleccionada no existe o está inactiva');
      }

      // Evitar duplicar exactamente la misma sede y horario en la misma fecha
      const duplicateInBranch = await this.prisma.classSchedule.findFirst({
        where: {
          branchId: dto.branchId,
          status: { not: ScheduleStatus.CANCELLED },
          startTime: start,
        },
      });
      if (duplicateInBranch) {
        throw new ConflictException(
          'Ya existe una clase programada en esta misma sede, fecha y horario',
        );
      }
    }

    if (dto.instructorId) {
      const instructor = await this.prisma.user.findUnique({
        where: { id: dto.instructorId },
      });

      if (!instructor || !instructor.isActive) {
        throw new BadRequestException('El instructor no existe o está inactivo');
      }

      const canTeach =
        instructor.isInstructor || instructor.role === 'INSTRUCTOR' || instructor.role === 'ADMIN';
      if (!canTeach) {
        throw new BadRequestException('El usuario seleccionado no tiene facultades de instructor');
      }

      const overlap = await this.prisma.classSchedule.findFirst({
        where: {
          instructorId: dto.instructorId,
          status: { not: ScheduleStatus.CANCELLED },
          AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
        },
      });

      if (overlap) {
        throw new ConflictException(
          'El instructor ya tiene otra clase agendada (traslape de horario) en este mismo intervalo horario',
        );
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

    const duration = dto.durationMinutes ?? 60;
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
          const startTime = new Date(
            `${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`,
          );
          const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

          // Evitar crear duplicados en la misma sede y hora
          const existingSameSlot = await this.prisma.classSchedule.findFirst({
            where: {
              branchId: dto.branchId,
              startTime,
              status: { not: ScheduleStatus.CANCELLED },
            },
          });

          if (!existingSameSlot) {
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
        ...(dto.capacity !== undefined && {
          capacity: dto.capacity,
          availableSlots: newAvailableSlots,
        }),
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
      const targetUserIds = await this.resolveNotificationRecipients(
        id,
        dto.notifyTarget ?? 'ENROLLED',
      );
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
   * Actualiza en bloque todas las sesiones futuras de un bloque recurrente
   * (manteniendo la fecha propia de cada sesión, pero actualizando su horario, sede, cupos o tarifa).
   * Así se reemplaza el bloque completo sin dejar el horario antiguo duplicado.
   */
  async bulkUpdate(dto: BulkUpdateSchedulesDto) {
    const schedules = await this.prisma.classSchedule.findMany({
      where: {
        id: { in: dto.scheduleIds },
        status: { not: ScheduleStatus.CANCELLED },
      },
      include: {
        branch: true,
      },
      orderBy: { startTime: 'asc' },
    });

    if (schedules.length === 0) {
      throw new NotFoundException('No se encontraron sesiones activas en el bloque seleccionado');
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } });
      if (!branch || !branch.isActive) {
        throw new BadRequestException('La sede seleccionada no existe o está inactiva');
      }
    }

    const updatedList: any[] = [];

    for (const sch of schedules) {
      const dateStr = sch.startTime.toISOString().split('T')[0];
      const oldStartSlot = sch.startTime.toISOString().slice(11, 16);
      const oldEndSlot = sch.endTime.toISOString().slice(11, 16);

      const nextStartSlot = dto.startTimeSlot || oldStartSlot;
      const nextEndSlot = dto.endTimeSlot || oldEndSlot;

      const newStart = new Date(`${dateStr}T${nextStartSlot}:00.000Z`);
      const newEnd = new Date(`${dateStr}T${nextEndSlot}:00.000Z`);

      if (newStart >= newEnd) {
        throw new BadRequestException('La hora de inicio debe ser anterior a la hora de término');
      }

      let newAvailableSlots = sch.availableSlots;
      if (dto.capacity !== undefined && dto.capacity !== sch.capacity) {
        const occupied = sch.capacity - sch.availableSlots;
        newAvailableSlots = Math.max(0, dto.capacity - occupied);
      }

      const updated = await this.prisma.classSchedule.update({
        where: { id: sch.id },
        data: {
          ...(dto.branchId !== undefined && { branchId: dto.branchId }),
          startTime: newStart,
          endTime: newEnd,
          ...(dto.capacity !== undefined && {
            capacity: dto.capacity,
            availableSlots: newAvailableSlots,
          }),
          ...(dto.price !== undefined && { price: dto.price }),
        },
        include: {
          classType: true,
          branch: true,
          instructor: true,
        },
      });

      updatedList.push(updated);

      // Notificar si corresponde
      try {
        const targetUserIds = await this.resolveNotificationRecipients(
          sch.id,
          dto.notifyTarget ?? 'ENROLLED',
        );
        if (targetUserIds.length > 0) {
          await this.notificationsService.notifyScheduleUpdated({
            scheduleId: sch.id,
            oldBranchName: sch.branch?.name || 'Sede Principal',
            newBranchName: updated.branch?.name || 'Sede Principal',
            oldStartTime: sch.startTime,
            newStartTime: updated.startTime,
            newEndTime: updated.endTime,
            reason: dto.reason,
            targetUserIds,
          });
        }
      } catch {
        // Ignorar errores de notificación individuales
      }
    }

    return {
      message: `Se actualizaron ${updatedList.length} sesiones del bloque recurrente`,
      count: updatedList.length,
      schedules: updatedList,
    };
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

    const targetUserIds = await this.resolveNotificationRecipients(
      id,
      dto?.notifyTarget ?? 'ENROLLED',
    );

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
   * Suspende / elimina en bloque todas las fechas futuras de un bloque recurrente.
   */
  async bulkCancel(dto: BulkCancelSchedulesDto) {
    let cancelledCount = 0;
    for (const id of dto.scheduleIds) {
      try {
        await this.cancel(id, {
          reason: dto.reason,
          notifyTarget: dto.notifyTarget,
        });
        cancelledCount++;
      } catch {
        // Ignorar si alguna ya estaba cancelada
      }
    }

    return {
      message: `Se suspendieron ${cancelledCount} sesiones del bloque recurrente`,
      count: cancelledCount,
    };
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
