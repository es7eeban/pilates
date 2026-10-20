import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SchedulesService } from './schedules.service.js';
import { CreateScheduleDto } from './dto/create-schedule.dto.js';
import { BulkGenerateSchedulesDto } from './dto/bulk-generate-schedules.dto.js';
import { QuerySchedulesDto } from './dto/query-schedules.dto.js';
import { UpdateScheduleDto, CancelScheduleDto } from './dto/update-schedule.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@ApiTags('Horarios y Sesiones (Agenda)')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar sesiones de la agenda con filtros en tiempo real' })
  @ApiResponse({ status: 200, description: 'Listado de sesiones programadas' })
  async findAll(@Query() query: QuerySchedulesDto) {
    return this.schedulesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle completo de una sesión por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la sesión y aforo' })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  async findOne(@Param('id') id: string) {
    return this.schedulesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear una sesión de clase individual (Solo Administrador)' })
  @ApiResponse({ status: 201, description: 'Sesión agendada exitosamente' })
  @ApiResponse({ status: 409, description: 'Conflicto por traslape de horario con el instructor' })
  async create(@Body() createDto: CreateScheduleDto) {
    return this.schedulesService.create(createDto);
  }

  @Post('bulk-generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Generar sesiones masivas por rango de fechas y días (Solo Administrador)' })
  @ApiResponse({ status: 201, description: 'Bloques de sesiones generados' })
  async bulkGenerate(@Body() bulkDto: BulkGenerateSchedulesDto) {
    return this.schedulesService.bulkGenerate(bulkDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Modificar / reprogramar una sesión (cambiar de sede, horario o cupos) con notificación opcional' })
  @ApiResponse({ status: 200, description: 'Sesión actualizada exitosamente' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateScheduleDto) {
    return this.schedulesService.update(id, updateDto);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancelar / eliminar una sesión programada de un día específico con notificación' })
  @ApiResponse({ status: 200, description: 'Sesión cancelada' })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  async cancel(@Param('id') id: string, @Body() cancelDto?: CancelScheduleDto) {
    return this.schedulesService.cancel(id, cancelDto);
  }
}
