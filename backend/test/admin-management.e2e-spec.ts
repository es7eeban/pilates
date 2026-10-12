import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Admin Management: Branches & Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let clientToken: string;
  let createdBranchId: string;
  let createdUserId: string;

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
  });

  afterAll(async () => {
    // Cleanup created test records if any
    if (createdUserId) {
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }
    if (createdBranchId) {
      await prisma.branch.deleteMany({ where: { id: createdBranchId } });
    }
    await app.close();
  });

  describe('Branches Administration', () => {
    it('POST /api/v1/branches - Cliente no debe poder crear sede (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/branches')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          name: 'Sede No Autorizada',
          slug: 'sede-no-autorizada',
          address: 'Calle Falsa 123',
        })
        .expect(403);
    });

    it('POST /api/v1/branches - Admin debe poder crear nueva sede', async () => {
      const uniqueSlug = `sede-test-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/branches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sede Ñuñoa Test',
          slug: uniqueSlug,
          address: 'Av. Irarrázaval 2400',
          city: 'Santiago',
          commune: 'Ñuñoa',
          phone: '+56911223344',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.slug).toBe(uniqueSlug);
      createdBranchId = res.body.id;
    });

    it('PATCH /api/v1/branches/:id - Admin debe poder editar datos de la sede', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/branches/${createdBranchId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sede Ñuñoa Express',
          phone: '+56999887766',
        })
        .expect(200);

      expect(res.body.name).toBe('Sede Ñuñoa Express');
      expect(res.body.phone).toBe('+56999887766');
    });
  });

  describe('Users Administration', () => {
    it('GET /api/v1/users - Cliente no debe tener acceso a nómina de usuarios (403)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });

    it('GET /api/v1/users - Admin debe poder listar usuarios', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0].passwordHash).toBeUndefined(); // Verifica omisión de hash
    });

    it('POST /api/v1/users - Admin debe poder registrar un nuevo usuario con rol INSTRUCTOR', async () => {
      const email = `instructor.nuevo.${Date.now()}@pilates.cl`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Valentina Pilates',
          email,
          phone: '+56988776655',
          role: 'INSTRUCTOR',
          isInstructor: true,
          password: 'PasswordSegura123!',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.email).toBe(email);
      expect(res.body.role).toBe('INSTRUCTOR');
      expect(res.body.isInstructor).toBe(true);
      expect(res.body.passwordHash).toBeUndefined();
      createdUserId = res.body.id;
    });

    it('PATCH /api/v1/users/:id - Admin debe poder actualizar datos y rol del usuario', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Valentina Pilates Modificada',
          phone: '+56911112222',
        })
        .expect(200);

      expect(res.body.name).toBe('Valentina Pilates Modificada');
      expect(res.body.phone).toBe('+56911112222');
    });

    it('PATCH /api/v1/users/:id/toggle-active - Admin debe poder alternar estado activo/inactivo', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${createdUserId}/toggle-active`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.isActive).toBe(false);

      const res2 = await request(app.getHttpServer())
        .patch(`/api/v1/users/${createdUserId}/toggle-active`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res2.body.isActive).toBe(true);
    });

    it('GET /api/v1/users/instructors - Debe listar instructores', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((u: any) => u.id === createdUserId)).toBe(true);
    });
  });
});
