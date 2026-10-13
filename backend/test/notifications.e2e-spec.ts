import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ensureUploadsDirExists } from '../src/bookings/upload.config.js';

describe('Transactional Notifications Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let clientToken: string;
  let clientId: string;
  let scheduleId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    ensureUploadsDirExists();
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

    // Login Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@pilates.cl', password: 'Pilates123!' });
    adminToken = adminLogin.body.tokens.accessToken;

    // Register a dedicated Client to avoid race conditions with concurrent test files
    const uniqueEmail = `notif.client.${Date.now()}@pilates.cl`;
    const clientRegister = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Alumno Test Notificaciones',
        email: uniqueEmail,
        password: 'Pilates123!',
        phone: '+56988776655',
      });
    clientToken = clientRegister.body.tokens.accessToken;
    clientId = clientRegister.body.user.id;

    // Crear una sesión dedicada
    const classType = await prisma.classType.findFirst();
    const branch = await prisma.branch.findFirst();
    const schedule = await prisma.classSchedule.create({
      data: {
        classTypeId: classType!.id,
        branchId: branch!.id,
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 90000000),
        capacity: 10,
        availableSlots: 10,
        price: 18000,
      },
    });
    scheduleId = schedule.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /notifications/my sin autenticación debe retornar 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/notifications/my')
      .expect(401);
  });

  it('2. GET /notifications/my debe retornar la lista de notificaciones del alumno', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications/my')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('notifications');
    expect(res.body).toHaveProperty('unreadCount');
    expect(Array.isArray(res.body.notifications)).toBe(true);
  });

  it('3. Al crear una reserva con TRANSFER, se debe generar automáticamente una notificación BOOKING_CREATED', async () => {
    // Limpiar reservas previas del alumno para esta sesión en caso de ejecuciones anteriores
    await prisma.booking.deleteMany({
      where: { userId: clientId, scheduleId },
    });

    const bookingRes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        scheduleId,
        paymentMethod: 'TRANSFER',
      })
      .expect(201);

    const bookingId = bookingRes.body.id;
    const bookingCode = bookingRes.body.bookingCode;

    // Consultar notificaciones del alumno
    const notifRes = await request(app.getHttpServer())
      .get('/api/v1/notifications/my')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    const createdNotif = notifRes.body.notifications.find(
      (n: any) => n.metadata?.bookingCode === bookingCode && n.type === 'BOOKING_CREATED',
    );

    expect(createdNotif).toBeDefined();
    expect(createdNotif.title).toContain(bookingCode);
    expect(createdNotif.read).toBe(false);
    expect(createdNotif.metadata).toHaveProperty('email');
    expect(createdNotif.metadata).toHaveProperty('whatsapp');

    // 4. Marcar la notificación como leída
    const markReadRes = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${createdNotif.id}/read`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(markReadRes.body.read).toBe(true);

    // 5. Al subir un comprobante, se genera notificación VOUCHER_UPLOADED
    await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingId}/upload-voucher`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        voucherUrl: 'https://cdn.pilates.cl/vouchers/test-voucher-e2e.jpg',
      })
      .expect(200);

    const notifAfterVoucher = await request(app.getHttpServer())
      .get('/api/v1/notifications/my')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    const voucherNotif = notifAfterVoucher.body.notifications.find(
      (n: any) => n.metadata?.bookingCode === bookingCode && n.type === 'VOUCHER_UPLOADED',
    );
    expect(voucherNotif).toBeDefined();

    // 6. El administrador aprueba el voucher -> Se genera notificación PAYMENT_APPROVED
    await request(app.getHttpServer())
      .patch(`/api/v1/bookings/admin/${bookingId}/approve-voucher`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const notifAfterApproval = await request(app.getHttpServer())
      .get('/api/v1/notifications/my')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    const approvedNotif = notifAfterApproval.body.notifications.find(
      (n: any) => n.metadata?.bookingCode === bookingCode && n.type === 'PAYMENT_APPROVED',
    );
    expect(approvedNotif).toBeDefined();
    expect(approvedNotif.title).toContain('Pago aprobado');

    // 7. Marcar todas las notificaciones como leídas
    await request(app.getHttpServer())
      .patch('/api/v1/notifications/mark-all-read')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    const afterMarkAll = await request(app.getHttpServer())
      .get('/api/v1/notifications/my')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(afterMarkAll.body.unreadCount).toBe(0);
  });

  it('8. Alumno común no puede ver el log general de notificaciones de admin (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/notifications/admin/logs')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
  });

  it('9. Admin puede consultar el registro general de notificaciones transaccionales', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications/admin/logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('user');
    expect(res.body[0]).toHaveProperty('type');
  });
});
