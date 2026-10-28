import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: vi.fn().mockResolvedValue(undefined),
        $disconnect: vi.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: ['/', 'health', 'api/v1/health'],
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) returns 200 OK for UptimeRobot / ping', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.message).toBe('Pilates API is running');
  });

  it('/health (GET) returns 200 OK for health checks', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.uptime).toBeDefined();
  });

  it('/api/v1/health (GET) returns 200 OK', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body.status).toBe('ok');
  });
});
