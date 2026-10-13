import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ClassTypesModule } from './class-types/class-types.module.js';
import { SchedulesModule } from './schedules/schedules.module.js';
import { BranchesModule } from './branches/branches.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ClassTypesModule,
    SchedulesModule,
    BranchesModule,
    BookingsModule,
    AttendanceModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
