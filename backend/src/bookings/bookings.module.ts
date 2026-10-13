import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { BookingsController } from './bookings.controller.js';
import { SchedulesModule } from '../schedules/schedules.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { WaitlistModule } from '../waitlist/waitlist.module.js';

@Module({
  imports: [SchedulesModule, NotificationsModule, WaitlistModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
