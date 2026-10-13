import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Waitlist & Overcapacity Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let client1Token: string;
  let client1Id: string;

  let client2Token: string;
  let client3Token: string;

  let client4Token: string;

  let fullScheduleId: string;

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

    // Register 4 clients
    const ts = Date.now();
    const reg = async (name: string, email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name,
          email,
          password: 'Pilates123!',
          phone: '+56911223344',
        });
      return { token: res.body.tokens.accessToken, id: res.body.user.id };
    };

    const c1 = await reg('Alumno Uno', `c1.${ts}@test.cl`);
    client1Token = c1.token;
    client1Id = c1.id;

    const c2 = await reg('Alumno Dos', `c2.${ts}@test.cl`);
    client2Token = c2.token;

    const c3 = await reg('Alumno Tres', `c3.${ts}@test.cl`);
    client3Token = c3.token;

    const c4 = await reg('Alumno Cuatro', `c4.${ts}@test.cl`);
    client4Token = c4.token;

    // Create a full schedule (capacity 1, availableSlots 0)
    const classType = await prisma.classType.findFirst();
    const branch = await prisma.branch.findFirst();

    const schedule = await prisma.classSchedule.create({
      data: {
        classTypeId: classType!.id,
        branchId: branch!.id,
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 90000000),
        capacity: 1,
        availableSlots: 0,
        price: 20000,
      },
    });
    fullScheduleId = schedule.id;

    // Create initial booking for client4 to occupy the single spot
    await prisma.booking.create({
      data: {
        userId: c4.id,
        scheduleId: fullScheduleId,
        bookingCode: `PIL-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'CONFIRMADA',
        paymentMethod: 'TRANSFER',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. No permite unirse a lista de espera si la clase aún tiene cupos disponibles (400)', async () => {
    const classType = await prisma.classType.findFirst();
    const branch = await prisma.branch.findFirst();
    const openSchedule = await prisma.classSchedule.create({
      data: {
        classTypeId: classType!.id,
        branchId: branch!.id,
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 90000000),
        capacity: 8,
        availableSlots: 8,
        price: 20000,
      },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/waitlist/schedules/${openSchedule.id}/join`)
      .set('Authorization', `Bearer ${client1Token}`)
      .expect(400);
  });

  it('2. El primer alumno se une a la lista de espera con posición #1 de 3', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/waitlist/schedules/${fullScheduleId}/join`)
      .set('Authorization', `Bearer ${client1Token}`)
      .expect(201);

    expect(res.body).toHaveProperty('entry');
    expect(res.body.entry.position).toBe(1);
    expect(res.body.entry.status).toBe('WAITING');
    expect(res.body.waitlistCount).toBe(1);
    expect(res.body.waitlistMax).toBe(3);
  });

  it('3. El mismo alumno no puede duplicar su inscripción en la lista de espera (409)', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/waitlist/schedules/${fullScheduleId}/join`)
      .set('Authorization', `Bearer ${client1Token}`)
      .expect(409);
  });

  it('4. El segundo alumno se une a la lista de espera con posición #2', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/waitlist/schedules/${fullScheduleId}/join`)
      .set('Authorization', `Bearer ${client2Token}`)
      .expect(201);

    expect(res.body.entry.position).toBe(2);
    expect(res.body.entry.status).toBe('WAITING');
  });

  it('5. El tercer alumno se une a la lista de espera con posición #3 (máximo sobrecupo)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/waitlist/schedules/${fullScheduleId}/join`)
      .set('Authorization', `Bearer ${client3Token}`)
      .expect(201);

    expect(res.body.entry.position).toBe(3);
    expect(res.body.entry.status).toBe('WAITING');
  });

  it('6. Un cuarto alumno intenta unirse y es rechazado porque el sobrecupo está lleno (409)', async () => {
    // Registramos un quinto usuario
    const extra = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Alumno Extra',
        email: `extra.${Date.now()}@test.cl`,
        password: 'Pilates123!',
        phone: '+56999887766',
      });

    await request(app.getHttpServer())
      .post(`/api/v1/waitlist/schedules/${fullScheduleId}/join`)
      .set('Authorization', `Bearer ${extra.body.tokens.accessToken}`)
      .expect(409);
  });

  it('7. Al cancelar una reserva, se promueve automáticamente al primer alumno en espera con 1 hora para confirmar', async () => {
    // Alumno 4 cancela su reserva
    const booking = await prisma.booking.findFirst({
      where: { scheduleId: fullScheduleId },
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${booking!.id}/cancel`)
      .set('Authorization', `Bearer ${client4Token}`)
      .expect(200);

    // El cupo no se liberó al público (sigue en 0 porque está reservado para el alumno 1 en espera)
    const schedule = await prisma.classSchedule.findUnique({
      where: { id: fullScheduleId },
    });
    expect(schedule!.availableSlots).toBe(0);

    // Alumno 1 pasa a OFFERED con fecha de expiración
    const statusRes = await request(app.getHttpServer())
      .get(`/api/v1/waitlist/schedules/${fullScheduleId}/status`)
      .set('Authorization', `Bearer ${client1Token}`)
      .expect(200);

    expect(statusRes.body.inWaitlist).toBe(true);
    expect(statusRes.body.status).toBe('OFFERED');
    expect(statusRes.body.remainingMinutes).toBeGreaterThan(50); // ~60 min
    expect(statusRes.body.expiresAt).toBeDefined();

    // Alumno 1 debe tener la notificación WAITLIST_OFFER
    const notifs = await request(app.getHttpServer())
      .get('/api/v1/notifications/my')
      .set('Authorization', `Bearer ${client1Token}`)
      .expect(200);

    const offerNotif = notifs.body.notifications.find(
      (n: any) => n.type === 'WAITLIST_OFFER',
    );
    expect(offerNotif).toBeDefined();
    expect(offerNotif.title).toContain('1 hora');
  });

  it('8. Alumno 1 acepta la oferta dentro de la hora -> se convierte en reserva confirmada', async () => {
    const acceptRes = await request(app.getHttpServer())
      .post(`/api/v1/waitlist/schedules/${fullScheduleId}/accept`)
      .set('Authorization', `Bearer ${client1Token}`)
      .send({
        paymentMethod: 'TRANSFER',
        voucherUrl: 'https://cdn.pilates.cl/vouchers/voucher-waitlist.jpg',
      })
      .expect(201);

    expect(acceptRes.body).toHaveProperty('booking');
    expect(acceptRes.body.booking.status).toBe('PENDIENTE_VALIDACION');
    expect(acceptRes.body.booking.bookingCode).toMatch(/^PIL-\d{6}$/);

    // Entrada de waitlist ahora es ACCEPTED
    const waitlistEntry = await prisma.waitlistEntry.findFirst({
      where: { userId: client1Id, scheduleId: fullScheduleId },
    });
    expect(waitlistEntry!.status).toBe('ACCEPTED');
  });
});
