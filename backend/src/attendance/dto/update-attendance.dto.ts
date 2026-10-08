import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class UpdateAttendanceDto {
  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.ATTENDED })
  @IsEnum(AttendanceStatus)
  attendanceStatus!: AttendanceStatus;

  @ApiPropertyOptional({ example: 'Alumno llegó 10 minutos tarde' })
  @IsOptional()
  @IsString()
  notes?: string;
}
