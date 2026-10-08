import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { SchedulesService } from '../src/schedules/schedules.service.js';

describe('Schedules & Concurrency (Sprint 2 e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let schedulesService: SchedulesService;
  let adminToken: string;
  let clientToken: string;
  let testClassTypeId: string;
  let instructorId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    schedulesService = app.get(SchedulesService);

    // Obtener token de Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@pilates.cl', password: 'Pilates123!' });
    adminToken = adminLogin.body.tokens.accessToken;

    // Obtener token de Alumno
    const clientLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'alumno.demo@pilates.cl', password: 'Pilates123!' });
    clientToken = clientLogin.body.tokens.accessToken;

    // Obtener instructor y tipo de clase
    const instructorUser = await prisma.user.findFirst({ where: { email: 'valeria.instructor@pilates.cl' } });
    instructorId = instructorUser!.id;

    const classType = await prisma.classType.findFirst({ where: { isActive: true } });
    testClassTypeId = classType!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('ClassTypesController', () => {
    it('GET /api/v1/class-types - debe retornar la lista de tipos de clase', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/class-types')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('title');
      expect(res.body[0]).toHaveProperty('defaultCapacity');
    });

    it('POST /api/v1/class-types - debe rechazar creación a usuarios sin rol ADMIN', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/class-types')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          title: 'Pilates No Autorizado',
          defaultPrice: 10000,
        })
        .expect(403);
    });

    it('POST /api/v1/class-types - debe permitir crear disciplina con rol ADMIN', async () => {
      const uniqueTitle = `Pilates Test ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/class-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: uniqueTitle,
          description: 'Clase de prueba técnica',
          defaultCapacity: 6,
          defaultPrice: 16000,
          durationMinutes: 50,
          intensityLevel: 'Intermedio',
        })
        .expect(201);

      expect(res.body.title).toBe(uniqueTitle);
      expect(res.body.defaultCapacity).toBe(6);
    });
  });

  describe('SchedulesController', () => {
    it('GET /api/v1/schedules - debe listar las clases disponibles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/schedules')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('classType');
      expect(res.body[0]).toHaveProperty('availableSlots');
    });

    it('POST /api/v1/schedules - debe rechazar si startTime >= endTime', async () => {
      const now = new Date();
      const start = new Date(now.getTime() + 86400000).toISOString();
      const end = new Date(now.getTime() + 82800000).toISOString(); // 1 hora antes

      await request(app.getHttpServer())
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          classTypeId: testClassTypeId,
          startTime: start,
          endTime: end,
        })
        .expect(400);
    });

    it('POST /api/v1/schedules - debe prevenir traslape de horario para el mismo instructor', async () => {
      const baseTime = Date.now() + 25000000000 + Math.floor(Math.random() * 10000000000);
      const start1 = new Date(baseTime).toISOString();
      const end1 = new Date(baseTime + 3600000).toISOString();

      // Crear primera clase
      await request(app.getHttpServer())
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          classTypeId: testClassTypeId,
          instructorId,
          startTime: start1,
          endTime: end1,
        })
        .expect(201);

      // Intentar crear clase con traslape para el mismo instructor
      const start2 = new Date(baseTime + 1800000).toISOString(); // a la mitad de la clase 1
      const end2 = new Date(baseTime + 5400000).toISOString();

      const overlapRes = await request(app.getHttpServer())
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          classTypeId: testClassTypeId,
          instructorId,
          startTime: start2,
          endTime: end2,
        })
        .expect(409);

      expect(overlapRes.body.message).toContain('traslape');
    });
  });

  describe('Control de Concurrencia & Aforo Estricto (FOR UPDATE)', () => {
    it('debe impedir sobrecupo cuando múltiples transacciones compiten concurrentemente', async () => {
      // 1. Crear una sesión con capacidad estricta de solo 2 cupos
      const startTime = new Date(Date.now() + 600000000);
      const endTime = new Date(startTime.getTime() + 3600000);

      const schedule = await prisma.classSchedule.create({
        data: {
          classTypeId: testClassTypeId,
          startTime,
          endTime,
          capacity: 2,
          availableSlots: 2,
          price: 15000,
        },
      });

      // 2. Disparar 5 intentos simultáneos de reserva concurrente
      const attempts = 5;
      const results = await Promise.allSettled(
        Array.from({ length: attempts }).map(() =>
          prisma.$transaction((tx) =>
            schedulesService.reserveSlotWithPessimisticLock(schedule.id, tx),
          ),
        ),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactamente 2 reservas deben tener éxito
      expect(fulfilled.length).toBe(2);
      // Las 3 restantes deben ser rechazadas
      expect(rejected.length).toBe(3);

      // 3. Verificar estado en base de datos: cupos deben ser exactamente 0, sin sobrecupo negativo
      const finalSchedule = await prisma.classSchedule.findUnique({
        where: { id: schedule.id },
      });
      expect(finalSchedule!.availableSlots).toBe(0);

      // 4. Liberar un cupo mediante liberación segura
      await prisma.$transaction((tx) =>
        schedulesService.releaseSlotWithPessimisticLock(schedule.id, tx),
      );

      const afterRelease = await prisma.classSchedule.findUnique({
        where: { id: schedule.id },
      });
      expect(afterRelease!.availableSlots).toBe(1);
    });
  });
});
