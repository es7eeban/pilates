import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, ScheduleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateScheduleDto } from './dto/create-schedule.dto.js';
import { BulkGenerateSchedulesDto } from './dto/bulk-generate-schedules.dto.js';
import { QuerySchedulesDto } from './dto/query-schedules.dto.js';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

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

    // Validar tipo de clase
    const classType = await this.prisma.classType.findUnique({
      where: { id: dto.classTypeId },
    });

    if (!classType || !classType.isActive) {
      throw new BadRequestException('El tipo de clase no existe o está inactivo');
    }

    // Validar instructor si fue proporcionado
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

      // Validar traslapes de horario para este instructor
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

    const capacity = dto.capacity ?? classType.defaultCapacity;
    const price = dto.price ?? classType.defaultPrice;

    return this.prisma.classSchedule.create({
      data: {
        classTypeId: dto.classTypeId,
        instructorId: dto.instructorId,
        startTime: start,
        endTime: end,
        capacity,
        availableSlots: capacity,
        price,
        status: ScheduleStatus.SCHEDULED,
      },
      include: {
        classType: true,
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
    const classType = await this.prisma.classType.findUnique({
      where: { id: dto.classTypeId },
    });

    if (!classType || !classType.isActive) {
      throw new BadRequestException('El tipo de clase no existe o está inactivo');
    }

    if (dto.instructorId) {
      const instructor = await this.prisma.user.findUnique({
        where: { id: dto.instructorId },
      });

      if (!instructor || !instructor.isActive) {
        throw new BadRequestException('El instructor no existe o está inactivo');
      }
    }

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
      // JavaScript getUTCDay: 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
      // Mapeo a ISO (1 = Lunes, ..., 7 = Domingo)
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

          // Verificar traslape de instructor si aplica
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
                classTypeId: dto.classTypeId,
                instructorId: dto.instructorId,
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

  async cancel(id: string) {
    const schedule = await this.findById(id);

    if (schedule.status === ScheduleStatus.CANCELLED) {
      throw new ConflictException('La sesión ya se encuentra cancelada');
    }

    return this.prisma.classSchedule.update({
      where: { id },
      data: { status: ScheduleStatus.CANCELLED },
      include: {
        classType: true,
        instructor: true,
      },
    });
  }

  /**
   * Bloqueo pesimista para reserva concurrente de cupos en PostgreSQL:
   * Ejecuta SELECT ... FOR UPDATE dentro de la transacción activa para garantizar
   * consistencia estricta de aforo en accesos simultáneos.
   */
  async reserveSlotWithPessimisticLock(
    scheduleId: string,
    txClient?: Prisma.TransactionClient,
  ) {
    const runner = txClient ?? this.prisma;

    // Ejecuta bloqueo exclusivo de fila FOR UPDATE en PostgreSQL
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
