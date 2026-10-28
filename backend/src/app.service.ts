import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      message: 'Pilates API is running',
      environment: process.env.NODE_ENV ?? 'development',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  getHello(): string {
    return 'Hello World!';
  }
}
