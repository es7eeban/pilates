import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    description:
      'Destinatarios de la notificación: ENROLLED (inscritos en la clase), ALL_CLIENTS (aviso general a todos los alumnos) o NONE',
    enum: ['ENROLLED', 'ALL_CLIENTS', 'NONE'],
  })
  @IsOptional()
  @IsIn(['ENROLLED', 'ALL_CLIENTS', 'NONE'])
  notifyTarget?: 'ENROLLED' | 'ALL_CLIENTS' | 'NONE';
}

export class BulkUpdateSchedulesDto {
  @ApiProperty({
    description: 'Lista de IDs de las sesiones pertenecientes al bloque recurrente a actualizar',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  scheduleIds!: string[];

  @ApiPropertyOptional({ description: 'Nueva sede para todo el bloque recurrente' })
  @IsOptional()
  @IsUUID('4', { message: 'El branchId debe ser un UUID válido' })
  branchId?: string;

  @ApiPropertyOptional({ description: 'Nueva hora de inicio (HH:mm), ej. 09:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTimeSlot debe tener formato HH:mm' })
  startTimeSlot?: string;

  @ApiPropertyOptional({ description: 'Nueva hora de término (HH:mm), ej. 10:30' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTimeSlot debe tener formato HH:mm' })
  endTimeSlot?: string;

  @ApiPropertyOptional({ description: 'Nuevo aforo máximo para todas las sesiones del bloque' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Nueva tarifa (CLP) para todas las sesiones del bloque' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Motivo del ajuste del bloque recurrente' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Destinatarios de la notificación: ENROLLED, ALL_CLIENTS o NONE',
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
    description:
      'Destinatarios de la notificación: ENROLLED (inscritos en la clase), ALL_CLIENTS (aviso general a todos los alumnos) o NONE',
    enum: ['ENROLLED', 'ALL_CLIENTS', 'NONE'],
  })
  @IsOptional()
  @IsIn(['ENROLLED', 'ALL_CLIENTS', 'NONE'])
  notifyTarget?: 'ENROLLED' | 'ALL_CLIENTS' | 'NONE';
}

export class BulkCancelSchedulesDto {
  @ApiProperty({
    description: 'Lista de IDs de las sesiones pertenecientes al bloque recurrente a suspender',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  scheduleIds!: string[];

  @ApiPropertyOptional({ description: 'Motivo de la suspensión del bloque recurrente' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Destinatarios de la notificación: ENROLLED, ALL_CLIENTS o NONE',
    enum: ['ENROLLED', 'ALL_CLIENTS', 'NONE'],
  })
  @IsOptional()
  @IsIn(['ENROLLED', 'ALL_CLIENTS', 'NONE'])
  notifyTarget?: 'ENROLLED' | 'ALL_CLIENTS' | 'NONE';
}

export class CreateStudioTimeSlotDto {
  @ApiProperty({ description: 'Jornada del selector: AM o PM', enum: ['AM', 'PM'] })
  @IsIn(['AM', 'PM'], { message: 'period debe ser AM o PM' })
  period!: 'AM' | 'PM';

  @ApiProperty({ description: 'Hora de inicio en formato HH:mm (ej. 09:00)' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime debe tener formato HH:mm' })
  startTime!: string;

  @ApiProperty({ description: 'Hora de término en formato HH:mm (ej. 10:30)' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime debe tener formato HH:mm' })
  endTime!: string;

  @ApiPropertyOptional({ description: 'Etiqueta opcional personalizada (ej. De 9:00 a 10:30 AM)' })
  @IsOptional()
  @IsString()
  label?: string;
}

export class UpdateStudioTimeSlotDto {
  @ApiPropertyOptional({ description: 'Jornada del selector: AM o PM', enum: ['AM', 'PM'] })
  @IsOptional()
  @IsIn(['AM', 'PM'])
  period?: 'AM' | 'PM';

  @ApiPropertyOptional({ description: 'Hora de inicio en formato HH:mm (ej. 09:00)' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime debe tener formato HH:mm' })
  startTime?: string;

  @ApiPropertyOptional({ description: 'Hora de término en formato HH:mm (ej. 10:30)' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime debe tener formato HH:mm' })
  endTime?: string;

  @ApiPropertyOptional({ description: 'Etiqueta personalizada' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Estado activo del horario en el selector' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
