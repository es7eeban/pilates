import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ScheduleStatus } from '@prisma/client';

export class UpdateScheduleStatusDto {
  @ApiProperty({ enum: ScheduleStatus, example: ScheduleStatus.IN_PROGRESS })
  @IsEnum(ScheduleStatus)
  status!: ScheduleStatus;
}
