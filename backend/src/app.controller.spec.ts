import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return health status with status ok and message', () => {
      const result = appController.getRoot();
      expect(result.status).toBe('ok');
      expect(result.message).toBe('Pilates API is running');
      expect(result.uptime).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('health', () => {
    it('should return health status for health checks', () => {
      const result = appController.getHealth();
      expect(result.status).toBe('ok');
      expect(result.message).toBe('Pilates API is running');
      expect(result.uptime).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });
});
