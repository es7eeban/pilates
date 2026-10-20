import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateScheduleDto {
  @ApiPropertyOptional({ description: 'Nueva sede donde se dictará la clase' })
  @IsOptional()
  @IsUUID('4', { message: 'El branchId debe ser un UUID válido' })
  branchId?: string;

  @ApiPropertyOptional({ description: 'Nueva fecha y hora de inicio en formato ISO 8601' })
  @IsOptional()
  @IsDateString({}, { message: 'startTime debe tener formato ISO 8601 válido' })
  startTime?: string;

  @ApiPropertyOptional({ description: 'Nueva fecha y hora de término en formato ISO 8601' })
  @IsOptional()
  @IsDateString({}, { message: 'endTime debe tener formato ISO 8601 válido' })
  endTime?: string;

  @ApiPropertyOptional({ description: 'Nuevo aforo máximo' })
  @IsOptional()
  @IsNumber({}, { message: 'capacity debe ser un número' })
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Nueva tarifa (CLP)' })
  @IsOptional()
  @IsNumber({}, { message: 'price debe ser un número' })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Motivo del cambio o excepción para informar a los alumnos' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Destinatarios de la notificación: ENROLLED (inscritos en la clase), ALL_CLIENTS (aviso general a todos los alumnos) o NONE',
    enum: ['ENROLLED', 'ALL_CLIENTS', 'NONE'],
  })
  @IsOptional()
  @IsIn(['ENROLLED', 'ALL_CLIENTS', 'NONE'])
  notifyTarget?: 'ENROLLED' | 'ALL_CLIENTS' | 'NONE';
}

export class CancelScheduleDto {
  @ApiPropertyOptional({ description: 'Motivo de la suspensión o eliminación del día de clase' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Destinatarios de la notificación: ENROLLED (inscritos en la clase), ALL_CLIENTS (aviso general a todos los alumnos) o NONE',
    enum: ['ENROLLED', 'ALL_CLIENTS', 'NONE'],
  })
  @IsOptional()
  @IsIn(['ENROLLED', 'ALL_CLIENTS', 'NONE'])
  notifyTarget?: 'ENROLLED' | 'ALL_CLIENTS' | 'NONE';
}
