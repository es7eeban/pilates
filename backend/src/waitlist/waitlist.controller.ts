import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WaitlistService } from './waitlist.service.js';
import { AcceptWaitlistDto } from './dto/accept-waitlist.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface.js';

@ApiTags('Lista de Espera & Sobrecupos')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post('schedules/:scheduleId/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Unirse a la lista de espera de una clase llena (Máximo 3 sobrecupos)' })
  @ApiResponse({ status: 201, description: 'Registrado en lista de espera' })
  @ApiResponse({ status: 409, description: 'Ya tiene reserva o lista de espera completa' })
  async joinWaitlist(
    @Param('scheduleId') scheduleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.waitlistService.joinWaitlist(user.id, scheduleId);
  }

  @Post('schedules/:scheduleId/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Aceptar oferta de cupo disponible (1 hora de vigencia) y formalizar reserva' })
  @ApiResponse({ status: 201, description: 'Cupo aceptado y reserva creada con éxito' })
  async acceptOffer(
    @Param('scheduleId') scheduleId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AcceptWaitlistDto,
  ) {
    return this.waitlistService.acceptOffer(user.id, scheduleId, dto);
  }

  @Post('schedules/:scheduleId/decline')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Rechazar voluntariamente la oferta de cupo (lo cede al siguiente en espera)' })
  @ApiResponse({ status: 200, description: 'Oferta declinada' })
  async declineOffer(
    @Param('scheduleId') scheduleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.waitlistService.declineOffer(user.id, scheduleId);
  }

  @Get('schedules/:scheduleId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Consultar estado personal en la lista de espera para una clase' })
  @ApiResponse({ status: 200, description: 'Estado actual del alumno en waitlist' })
  async getMyWaitlistStatus(
    @Param('scheduleId') scheduleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.waitlistService.getMyWaitlistStatus(user.id, scheduleId);
  }

  @Get('my-entries')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar todas las clases donde el alumno está en espera o tiene oferta activa' })
  @ApiResponse({ status: 200, description: 'Listado de entradas activas de waitlist' })
  async getMyWaitlistEntries(@CurrentUser() user: AuthenticatedUser) {
    return this.waitlistService.getMyWaitlistEntries(user.id);
  }

  @Get('schedules/:scheduleId/summary')
  @ApiOperation({ summary: 'Obtener contador de sobrecupo de una clase (público)' })
  @ApiResponse({ status: 200, description: 'Conteo actual de lista de espera' })
  async getScheduleWaitlistSummary(@Param('scheduleId') scheduleId: string) {
    return this.waitlistService.getScheduleWaitlistSummary(scheduleId);
  }
}
