import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('debe iniciar sesión con el admin seed correctamente', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@pilates.cl',
        password: 'Pilates123!',
      })
      .expect(200);

    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('tokens');
    expect(res.body.user.email).toBe('admin@pilates.cl');
    expect(res.body.user.role).toBe('ADMIN');
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();
  });

  it('debe rechazar credenciales incorrectas', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@pilates.cl',
        password: 'PasswordErroneo',
      })
      .expect(401);
  });

  it('debe obtener el perfil con el token de acceso en /api/v1/auth/me', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@pilates.cl',
        password: 'Pilates123!',
      });

    const token = loginRes.body.tokens.accessToken;

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meRes.body.email).toBe('admin@pilates.cl');
    expect(meRes.body.role).toBe('ADMIN');
  });

  it('debe refrescar los tokens con un refresh token válido', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@pilates.cl',
        password: 'Pilates123!',
      });

    const refreshToken = loginRes.body.tokens.refreshToken;

    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(refreshRes.body).toHaveProperty('accessToken');
    expect(refreshRes.body).toHaveProperty('refreshToken');
  });
});
