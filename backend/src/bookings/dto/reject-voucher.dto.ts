import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectVoucherDto {
  @ApiProperty({ description: 'Motivo del rechazo de la transferencia', example: 'Monto de transferencia incompleto o comprobante ilegible.' })
  @IsString({ message: 'El motivo del rechazo debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El motivo del rechazo es obligatorio' })
  reason: string;
}
