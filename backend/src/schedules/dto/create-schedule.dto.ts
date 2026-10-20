import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiPropertyOptional({ description: 'ID del tipo de clase (opcional en V1, usa la clase base por defecto)', example: 'a1b2c3d4-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('4', { message: 'El classTypeId debe ser un UUID válido' })
  classTypeId?: string;

  @ApiPropertyOptional({ description: 'ID del instructor asignado (en V1 se asigna automáticamente al Administrador)', example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsUUID('4', { message: 'El instructorId debe ser un UUID válido' })
  instructorId?: string;

  @ApiPropertyOptional({ description: 'ID de la sede donde se imparte la clase', example: 'a1b2c3d4-0000-0000-0000-000000000002' })
  @IsOptional()
  @IsUUID('4', { message: 'El branchId debe ser un UUID válido' })
  branchId?: string;

  @ApiProperty({ description: 'Fecha y hora de inicio en formato ISO 8601', example: '2026-10-15T09:00:00Z' })
  @IsDateString({}, { message: 'La fecha de inicio debe tener formato ISO 8601 válido' })
  @IsNotEmpty({ message: 'La fecha y hora de inicio es obligatoria' })
  startTime: string;

  @ApiProperty({ description: 'Fecha y hora de término en formato ISO 8601', example: '2026-10-15T10:00:00Z' })
  @IsDateString({}, { message: 'La fecha de término debe tener formato ISO 8601 válido' })
  @IsNotEmpty({ message: 'La fecha y hora de término es obligatoria' })
  endTime: string;

  @ApiPropertyOptional({ description: 'Capacidad o aforo específico (por defecto usa la del tipo de clase)', example: 8 })
  @IsOptional()
  @IsNumber({}, { message: 'El aforo debe ser un número entero' })
  @Min(1, { message: 'El aforo mínimo es 1' })
  capacity?: number;

  @ApiPropertyOptional({ description: 'Precio específico para este horario (por defecto usa el del tipo de clase)', example: 15000 })
  @IsOptional()
  @IsNumber({}, { message: 'El precio debe ser un número válido' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price?: number;
}
