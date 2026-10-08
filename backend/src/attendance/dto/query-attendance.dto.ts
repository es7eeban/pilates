import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ScheduleStatus } from '@prisma/client';

export class QueryAttendanceDto {
  @ApiPropertyOptional({ description: 'Filtrar por fecha específica (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID de sede' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ enum: ScheduleStatus, description: 'Filtrar por estado de la clase' })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @ApiPropertyOptional({ description: 'Ver todas las clases de todos los instructores (solo ADMIN)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  all?: boolean;
}
