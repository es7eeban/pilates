import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class AcceptWaitlistDto {
  @ApiProperty({
    description: 'Método de pago para formalizar la reserva (GATEWAY o TRANSFER)',
    enum: PaymentMethod,
    example: PaymentMethod.TRANSFER,
  })
  @IsNotEmpty({ message: 'El método de pago es requerido' })
  @IsEnum(PaymentMethod, { message: 'El método de pago debe ser GATEWAY o TRANSFER' })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'URL del comprobante si el pago es por transferencia bancaria',
    example: '/uploads/vouchers/voucher-1234.jpg',
  })
  @IsOptional()
  @IsString()
  voucherUrl?: string;
}
