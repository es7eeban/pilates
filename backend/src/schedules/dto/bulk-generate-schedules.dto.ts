import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkGenerateSchedulesDto {
  @ApiPropertyOptional({ description: 'ID del tipo de clase (opcional en V1, usa la clase base por defecto)', example: 'a1b2c3d4-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('4', { message: 'El classTypeId debe ser un UUID válido' })
  classTypeId?: string;

  @ApiPropertyOptional({ description: 'ID del instructor a cargo (en V1 se asigna automáticamente al Administrador)', example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsUUID('4', { message: 'El instructorId debe ser un UUID válido' })
  instructorId?: string;

  @ApiPropertyOptional({ description: 'ID de la sede donde se imparten las sesiones', example: 'a1b2c3d4-0000-0000-0000-000000000002' })
  @IsOptional()
  @IsUUID('4', { message: 'El branchId debe ser un UUID válido' })
  branchId?: string;

  @ApiProperty({ description: 'Fecha de inicio del rango (YYYY-MM-DD)', example: '2026-10-15' })
  @IsDateString({}, { message: 'La fecha de inicio debe tener formato YYYY-MM-DD' })
  @IsNotEmpty({ message: 'La fecha de inicio es obligatoria' })
  startDate: string;

  @ApiProperty({ description: 'Fecha de fin del rango (YYYY-MM-DD)', example: '2026-10-31' })
  @IsDateString({}, { message: 'La fecha de fin debe tener formato YYYY-MM-DD' })
  @IsNotEmpty({ message: 'La fecha de fin es obligatoria' })
  endDate: string;

  @ApiProperty({
    description: 'Días de la semana (1 = Lunes, 2 = Martes, ..., 7 = Domingo)',
    example: [1, 3, 5],
    type: [Number],
  })
  @IsArray({ message: 'daysOfWeek debe ser un arreglo' })
  @ArrayNotEmpty({ message: 'Debe especificar al menos un día de la semana' })
  @IsInt({ each: true, message: 'Cada día de la semana debe ser un entero entre 1 y 7' })
  @Min(1, { each: true, message: 'Día mínimo es 1 (Lunes)' })
  @Max(7, { each: true, message: 'Día máximo es 7 (Domingo)' })
  daysOfWeek: number[];

  @ApiProperty({
    description: 'Horas del día en formato HH:mm (ej: 09:00, 18:30)',
    example: ['09:00', '18:00'],
    type: [String],
  })
  @IsArray({ message: 'times debe ser un arreglo de horas' })
  @ArrayNotEmpty({ message: 'Debe especificar al menos una hora' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    each: true,
    message: 'Cada hora debe tener formato HH:mm (24h)',
  })
  times: string[];

  @ApiPropertyOptional({ description: 'Duración en minutos (opcional)', example: 55 })
  @IsOptional()
  @IsNumber({}, { message: 'La duración debe ser un número entero' })
  @Min(15, { message: 'La duración mínima es 15 minutos' })
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Aforo por clase (opcional)', example: 8 })
  @IsOptional()
  @IsNumber({}, { message: 'El aforo debe ser un número entero' })
  @Min(1, { message: 'El aforo mínimo es 1' })
  capacity?: number;

  @ApiPropertyOptional({ description: 'Precio por clase (opcional)', example: 15000 })
  @IsOptional()
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price?: number;
}
