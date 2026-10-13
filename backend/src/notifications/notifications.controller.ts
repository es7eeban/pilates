import { Controller, Get, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface.js';

@ApiTags('Notificaciones Transaccionales')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('my')
  @ApiOperation({ summary: 'Obtener historial de notificaciones y conteo no leídas del usuario' })
  @ApiResponse({ status: 200, description: 'Listado de notificaciones del usuario' })
  async getMyNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getMyNotifications(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar una notificación individual como leída' })
  @ApiResponse({ status: 200, description: 'Notificación actualizada' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Marcar todas las notificaciones del usuario como leídas' })
  @ApiResponse({ status: 200, description: 'Todas las notificaciones marcadas como leídas' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Get('admin/logs')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Consultar bitácora general de notificaciones transaccionales (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Auditoría general de notificaciones enviadas' })
  async getAdminNotificationLogs(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.notificationsService.getAdminNotificationLogs(parsedLimit);
  }
}
