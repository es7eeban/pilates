import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { BookingsService } from './bookings.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UploadVoucherDto } from './dto/upload-voucher.dto.js';
import { RejectVoucherDto } from './dto/reject-voucher.dto.js';
import { voucherMulterOptions } from './upload.config.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface.js';

@ApiTags('Reservas y Pagos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una reserva para una sesión (GATEWAY o TRANSFER)' })
  @ApiResponse({ status: 201, description: 'Reserva generada con éxito' })
  @ApiResponse({ status: 409, description: 'Aforo completo o reserva ya existente para esta sesión' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(user.id, dto);
  }

  @Get('my-bookings')
  @ApiOperation({ summary: 'Listar reservas del alumno autenticado' })
  @ApiResponse({ status: 200, description: 'Historial de reservas del alumno' })
  async findMyBookings(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.findMyBookings(user.id);
  }

  @Get('admin/pending-vouchers')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Bandeja de comprobantes de pago pendientes de revisión (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Listado de transferencias por auditar' })
  async getPendingVouchers() {
    return this.bookingsService.getPendingVouchers();
  }

  @Get('admin/all-bookings')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar todas las reservas del estudio con alumnos y asistencia (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Listado completo de reservas' })
  async getAllBookings() {
    return this.bookingsService.getAllBookings();
  }

  @Patch('admin/:id/approve-voucher')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Aprobar transferencia bancaria y confirmar reserva (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Reserva confirmada' })
  async approveVoucher(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.approveVoucher(id, user.id);
  }

  @Patch('admin/:id/reject-voucher')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Rechazar comprobante y liberar cupo de la clase (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Reserva rechazada' })
  async rejectVoucher(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RejectVoucherDto,
  ) {
    return this.bookingsService.rejectVoucher(id, user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una reserva por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la reserva' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.findById(id, user.id, user.role);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar voluntariamente una reserva' })
  @ApiResponse({ status: 200, description: 'Reserva cancelada y cupo liberado' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.cancel(id, user.id, user.role);
  }

  @Patch(':id/upload-voucher')
  @ApiOperation({ summary: 'Adjuntar comprobante de transferencia bancaria (URL)' })
  @ApiResponse({ status: 200, description: 'Comprobante cargado, estado pasa a PENDIENTE_VALIDACION' })
  async uploadVoucher(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadVoucherDto,
  ) {
    return this.bookingsService.uploadVoucher(id, user.id, dto);
  }

  @Post('upload-voucher')
  @UseInterceptors(FileInterceptor('file', voucherMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de comprobante (JPG, PNG, WEBP o PDF, máx 5MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Subir archivo físico de comprobante (previo o durante checkout)' })
  @ApiResponse({ status: 201, description: 'Archivo guardado con URL de acceso generada' })
  async uploadVoucherDirect(
    @CurrentUser() _user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.bookingsService.handleDirectVoucherUpload(file);
  }

  @Post(':id/upload-voucher-file')
  @UseInterceptors(FileInterceptor('file', voucherMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de comprobante (JPG, PNG, WEBP o PDF, máx 5MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Subir archivo físico de comprobante para una reserva existente' })
  @ApiResponse({ status: 201, description: 'Comprobante guardado y reserva en PENDIENTE_VALIDACION' })
  async uploadVoucherFile(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.bookingsService.uploadVoucherFile(id, user.id, file);
  }
}
