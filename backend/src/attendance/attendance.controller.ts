import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AttendanceService } from './attendance.service.js';
import { UpdateAttendanceDto } from './dto/update-attendance.dto.js';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto.js';
import { UpdateScheduleStatusDto } from './dto/update-schedule-status.dto.js';
import { QueryAttendanceDto } from './dto/query-attendance.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface.js';

@ApiTags('Asistencia y Check-in')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INSTRUCTOR, Role.ADMIN)
@ApiBearerAuth('JWT-auth')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('my-classes')
  @ApiOperation({
    summary: 'Listar clases asignadas al instructor con resumen de aforo y asistencia',
  })
  @ApiResponse({ status: 200, description: 'Lista de clases con métricas' })
  async getMyClasses(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryAttendanceDto,
  ) {
    return this.attendanceService.getInstructorClasses(user, query);
  }

  @Get('classes/:scheduleId/roster')
  @ApiOperation({
    summary: 'Obtener nómina completa de alumnos inscritos en una clase con estado de asistencia',
  })
  @ApiResponse({ status: 200, description: 'Nómina de alumnos y estadísticas' })
  @ApiResponse({ status: 403, description: 'No autorizado para esta clase' })
  @ApiResponse({ status: 404, description: 'Clase no encontrada' })
  async getClassRoster(
    @CurrentUser() user: AuthenticatedUser,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.attendanceService.getClassRoster(user, scheduleId);
  }

  @Patch('bookings/:bookingId/status')
  @ApiOperation({
    summary: 'Registrar o actualizar la asistencia individual de un alumno (Check-in)',
  })
  @ApiResponse({ status: 200, description: 'Asistencia actualizada' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  async updateAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.updateBookingAttendance(user, bookingId, dto);
  }

  @Post('classes/:scheduleId/bulk')
  @ApiOperation({
    summary: 'Actualizar asistencia en lote (ej. marcar múltiples alumnos presentes)',
  })
  @ApiResponse({ status: 200, description: 'Asistencias actualizadas con éxito' })
  async bulkAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: BulkAttendanceDto,
  ) {
    return this.attendanceService.bulkUpdateAttendance(user, scheduleId, dto);
  }

  @Patch('classes/:scheduleId/status')
  @ApiOperation({
    summary: 'Actualizar estado de la clase (Iniciar clase, Finalizar clase, Cancelar)',
  })
  @ApiResponse({ status: 200, description: 'Estado de la sesión actualizado' })
  async updateScheduleStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: UpdateScheduleStatusDto,
  ) {
    return this.attendanceService.updateScheduleStatus(
      user,
      scheduleId,
      dto.status,
    );
  }
}
