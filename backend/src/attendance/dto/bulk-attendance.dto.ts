import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceItemDto {
  @ApiProperty({ example: 'c0a80101-0000-0000-0000-000000000000' })
  @IsString()
  @IsNotEmpty()
  bookingId!: string;

  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.ATTENDED })
  @IsEnum(AttendanceStatus)
  attendanceStatus!: AttendanceStatus;

  @ApiPropertyOptional({ example: 'Presente y activo' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkAttendanceDto {
  @ApiProperty({ type: [AttendanceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceItemDto)
  attendees!: AttendanceItemDto[];
}
