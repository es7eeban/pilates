import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service.js';
import { SchedulesController } from './schedules.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [NotificationsModule],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
