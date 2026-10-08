import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Attendance & Instructor Check-in Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let instructorToken: string;
  let adminToken: string;
  let clientToken: string;
  let instructorId: string;
  let testScheduleId: string;
  let testBookingId: string;

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

    // Login instructor
    const instLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'valeria.instructor@pilates.cl', password: 'Pilates123!' });
    instructorToken = instLogin.body.tokens.accessToken;
    instructorId = instLogin.body.user.id;

    // Login admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@pilates.cl', password: 'Pilates123!' });
    adminToken = adminLogin.body.tokens.accessToken;

    // Login alumno
    const clientLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'alumno.demo@pilates.cl', password: 'Pilates123!' });
    clientToken = clientLogin.body.tokens.accessToken;
    const clientId = clientLogin.body.user.id;

    const classType = await prisma.classType.findFirst();
    const branch = await prisma.branch.findFirst();

    // Crear sesión dedicada para el instructor
    const testSchedule = await prisma.classSchedule.create({
      data: {
        classTypeId: classType!.id,
        instructorId,
        branchId: branch!.id,
        startTime: new Date(Date.now() + 86400000 * 5),
        endTime: new Date(Date.now() + 86400000 * 5 + 3600000),
        capacity: 6,
        availableSlots: 5,
        price: 15000,
        status: 'SCHEDULED',
      },
    });
    testScheduleId = testSchedule.id;

    // Crear reserva confirmada dedicada
    const testBooking = await prisma.booking.create({
      data: {
        userId: clientId,
        scheduleId: testScheduleId,
        bookingCode: `PIL-TEST-${Date.now().toString().slice(-4)}`,
        status: 'CONFIRMADA',
        paymentMethod: 'TRANSFER',
        attendanceStatus: 'PENDING',
      },
    });
    testBookingId = testBooking.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Security & Role Protection', () => {
    it('GET /api/v1/attendance/my-classes - debe denegar acceso a alumnos (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/attendance/my-classes')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });

    it('PATCH /api/v1/attendance/bookings/:id/status - debe denegar check-in a alumnos (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/attendance/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ attendanceStatus: 'ATTENDED' })
        .expect(403);
    });
  });

  describe('Instructor Classes & Roster', () => {
    it('GET /api/v1/attendance/my-classes - el instructor debe ver sus clases asignadas con estadísticas', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/attendance/my-classes')
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const target = res.body.find((s: any) => s.id === testScheduleId);
      expect(target).toBeDefined();
      expect(target.stats).toBeDefined();
      expect(target.stats.enrolled).toBeGreaterThan(0);
      expect(target.classType).toBeDefined();
      expect(target.branch).toBeDefined();
    });

    it('GET /api/v1/attendance/classes/:scheduleId/roster - debe devolver la nómina de alumnos con sus datos', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/attendance/classes/${testScheduleId}/roster`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(res.body.schedule).toBeDefined();
      expect(res.body.stats).toBeDefined();
      expect(Array.isArray(res.body.roster)).toBe(true);
      expect(res.body.roster.length).toBeGreaterThan(0);

      const booking = res.body.roster[0];
      expect(booking.user).toBeDefined();
      expect(booking.user.name).toBeDefined();
      expect(booking.user.email).toBeDefined();
      expect(booking.attendanceStatus).toBeDefined();
    });

    it('PATCH /api/v1/attendance/bookings/:bookingId/status - el instructor marca ATTENDED y añade nota', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/attendance/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          attendanceStatus: 'ATTENDED',
          notes: 'Presente en sala, trabajo óptimo en reformer',
        })
        .expect(200);

      expect(res.body.attendanceStatus).toBe('ATTENDED');
      expect(res.body.checkInAt).toBeDefined();
      expect(res.body.attendanceNotes).toBe('Presente en sala, trabajo óptimo en reformer');
    });

    it('POST /api/v1/attendance/classes/:scheduleId/bulk - permite actualizar asistencia en lote', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/attendance/classes/${testScheduleId}/bulk`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          attendees: [
            {
              bookingId: testBookingId,
              attendanceStatus: 'ATTENDED',
              notes: 'Confirmado bulk',
            },
          ],
        })
        .expect(201);

      expect(res.body.roster).toBeDefined();
      const updated = res.body.roster.find((b: any) => b.id === testBookingId);
      expect(updated.attendanceStatus).toBe('ATTENDED');
    });

    it('PATCH /api/v1/attendance/classes/:scheduleId/status - permite iniciar la clase (IN_PROGRESS) y finalizarla (COMPLETED)', async () => {
      const inProgressRes = await request(app.getHttpServer())
        .patch(`/api/v1/attendance/classes/${testScheduleId}/status`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(inProgressRes.body.status).toBe('IN_PROGRESS');

      const completedRes = await request(app.getHttpServer())
        .patch(`/api/v1/attendance/classes/${testScheduleId}/status`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(completedRes.body.status).toBe('COMPLETED');
    });
  });

  describe('Admin Global Attendance Access', () => {
    it('GET /api/v1/attendance/my-classes?all=true - el administrador puede ver todas las clases de todos los instructores', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/attendance/my-classes?all=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });
});
