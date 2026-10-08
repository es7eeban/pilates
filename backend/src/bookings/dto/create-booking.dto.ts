import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreateBookingDto {
  @ApiProperty({ description: 'ID de la sesión de clase a reservar', example: 'a1b2c3d4-0000-0000-0000-000000000000' })
  @IsUUID('4', { message: 'scheduleId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'scheduleId es obligatorio' })
  scheduleId: string;

  @ApiProperty({ description: 'Método de pago seleccionado', enum: PaymentMethod, example: PaymentMethod.GATEWAY })
  @IsEnum(PaymentMethod, { message: 'El método de pago debe ser GATEWAY o TRANSFER' })
  @IsNotEmpty({ message: 'paymentMethod es obligatorio' })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'URL del comprobante de transferencia bancaria', example: 'https://storage.pilates.cl/vouchers/comprobante-123.pdf' })
  @IsOptional()
  @IsString({ message: 'voucherUrl debe ser una cadena de texto' })
  voucherUrl?: string;
}
