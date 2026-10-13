import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadVoucherDto {
  @ApiProperty({ description: 'URL del comprobante de transferencia bancaria', example: 'https://storage.pilates.cl/vouchers/transferencia-12345.jpg' })
  @IsString({ message: 'La URL del comprobante debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La URL del comprobante es obligatoria' })
  voucherUrl: string;
}
