import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Branches & Bookings Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let clientToken: string;
  let providenciaBranchId: string;
  let availableScheduleId: string;

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

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@pilates.cl', password: 'Pilates123!' });
    adminToken = adminLogin.body.tokens.accessToken;

    const clientLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'alumno.demo@pilates.cl', password: 'Pilates123!' });
    clientToken = clientLogin.body.tokens.accessToken;

    const branch = await prisma.branch.findFirst({ where: { slug: 'sede-providencia' } });
    providenciaBranchId = branch!.id;

    // Buscar o crear una sesión con cupos
    let schedule = await prisma.classSchedule.findFirst({
      where: { availableSlots: { gt: 0 } },
    });
    if (!schedule) {
      const classType = await prisma.classType.findFirst();
      schedule = await prisma.classSchedule.create({
        data: {
          classTypeId: classType!.id,
          branchId: providenciaBranchId,
          startTime: new Date(Date.now() + 86400000),
          endTime: new Date(Date.now() + 90000000),
          capacity: 8,
          availableSlots: 8,
          price: 15000,
        },
      });
    }
    availableScheduleId = schedule.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Branches (Sedes)', () => {
    it('GET /api/v1/branches - debe listar las sedes disponibles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/branches')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
      expect(res.body.some((b: any) => b.name === 'Sede Providencia')).toBe(true);
      expect(res.body.some((b: any) => b.name === 'Sede Las Condes')).toBe(true);
    });

    it('PATCH /api/v1/auth/preferences - debe permitir al alumno guardar su sede y horario favoritos', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/auth/preferences')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          favoriteBranchId: providenciaBranchId,
          favoriteTimeSchedule: '09:00',
        })
        .expect(200);

      expect(res.body.favoriteBranchId).toBe(providenciaBranchId);
      expect(res.body.favoriteTimeSchedule).toBe('09:00');
      expect(res.body.favoriteBranch).toBeDefined();
      expect(res.body.favoriteBranch.name).toBe('Sede Providencia');
    });

    it('GET /api/v1/schedules?branchId=... - debe filtrar clases por sede', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/schedules?branchId=${providenciaBranchId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((s: any) => {
        expect(s.branchId).toBe(providenciaBranchId);
        expect(s.branch.id).toBe(providenciaBranchId);
      });
    });
  });

  describe('Bookings & Voucher Flow', () => {
    let bookingId: string;

    it('POST /api/v1/bookings - debe crear una reserva por transferencia', async () => {
      // Crear nueva sesión de prueba para aislar el flujo
      const classType = await prisma.classType.findFirst();
      const testSchedule = await prisma.classSchedule.create({
        data: {
          classTypeId: classType!.id,
          branchId: providenciaBranchId,
          startTime: new Date(Date.now() + 150000000),
          endTime: new Date(Date.now() + 153600000),
          capacity: 4,
          availableSlots: 4,
          price: 15000,
        },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          scheduleId: testSchedule.id,
          paymentMethod: 'TRANSFER',
        })
        .expect(201);

      bookingId = res.body.id;
      expect(res.body.bookingCode).toMatch(/^PIL-\d+$/);
      expect(res.body.status).toBe('PENDIENTE_PAGO');
      expect(res.body.paymentMethod).toBe('TRANSFER');
      expect(res.body.schedule.branch.name).toBe('Sede Providencia');

      // Verificar que se decrementó el cupo
      const updatedSchedule = await prisma.classSchedule.findUnique({ where: { id: testSchedule.id } });
      expect(updatedSchedule!.availableSlots).toBe(3);
    });

    it('PATCH /api/v1/bookings/:id/upload-voucher - debe subir comprobante y cambiar estado a PENDIENTE_VALIDACION', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}/upload-voucher`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          voucherUrl: 'https://vouchers.pilates.cl/comprobante-test.jpg',
        })
        .expect(200);

      expect(res.body.status).toBe('PENDIENTE_VALIDACION');
      expect(res.body.voucherUrl).toBe('https://vouchers.pilates.cl/comprobante-test.jpg');
    });

    it('GET /api/v1/bookings/admin/pending-vouchers - debe mostrar el comprobante en la bandeja de admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings/admin/pending-vouchers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((b: any) => b.id === bookingId)).toBe(true);
    });

    it('PATCH /api/v1/bookings/admin/:id/approve-voucher - debe aprobar el comprobante y confirmar la reserva', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/admin/${bookingId}/approve-voucher`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('CONFIRMADA');

      const payment = await prisma.payment.findUnique({ where: { bookingId } });
      expect(payment!.status).toBe('APPROVED');
    });

    it('GET /api/v1/bookings/my-bookings - debe listar la reserva del alumno confirmada', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings/my-bookings')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const myBooking = res.body.find((b: any) => b.id === bookingId);
      expect(myBooking).toBeDefined();
      expect(myBooking.status).toBe('CONFIRMADA');
    });
  });
});
