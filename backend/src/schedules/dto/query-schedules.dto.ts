import { IsBoolean, IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleStatus } from '@prisma/client';

export class QuerySchedulesDto {
  @ApiPropertyOptional({ description: 'Filtrar desde fecha/hora (ISO 8601)', example: '2026-10-15T00:00:00Z' })
  @IsOptional()
  @IsDateString({}, { message: 'dateFrom debe tener formato ISO 8601' })
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filtrar hasta fecha/hora (ISO 8601)', example: '2026-10-31T23:59:59Z' })
  @IsOptional()
  @IsDateString({}, { message: 'dateTo debe tener formato ISO 8601' })
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filtrar por tipo de clase (ID)', example: 'a1b2c3d4-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('4', { message: 'classTypeId debe ser un UUID válido' })
  classTypeId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por instructor (ID)', example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsUUID('4', { message: 'instructorId debe ser un UUID válido' })
  instructorId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado de la sesión', enum: ScheduleStatus })
  @IsOptional()
  @IsEnum(ScheduleStatus, { message: 'El estado especificado no es válido' })
  status?: ScheduleStatus;

  @ApiPropertyOptional({ description: 'Filtrar por sede (ID)', example: 'a1b2c3d4-0000-0000-0000-000000000002' })
  @IsOptional()
  @IsUUID('4', { message: 'branchId debe ser un UUID válido' })
  branchId?: string;

  @ApiPropertyOptional({ description: 'Filtrar únicamente sesiones con cupos libres (> 0)', example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onlyAvailable?: boolean;
}
