import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import express from 'express';
import { AppModule } from './app.module.js';
import { ensureUploadsDirExists } from './bookings/upload.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ?? 4000;
  const prefix = process.env.API_PREFIX ?? 'api/v1';

  // Asegurar directorio de uploads y servir estáticos
  ensureUploadsDirExists();
  const uploadsPath = join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));
  app.use(`/${prefix}/uploads`, express.static(uploadsPath));

  // Excluir la raíz y health checks del prefijo global para permitir pings de Render y UptimeRobot
  app.setGlobalPrefix(prefix, {
    exclude: ['/', 'health', `${prefix}/health`],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization',
  });

  const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Pilates Booking System API')
    .setDescription('API REST para agendamiento de clases de pilates, control de cupos y pagos.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Ingresa tu JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${prefix}/docs`, app, document);

  await app.listen(port);
  console.log(`🚀 Pilates Backend running at http://localhost:${port}/${prefix}`);
  console.log(`💓 Health check running at http://localhost:${port}/ and http://localhost:${port}/health`);
  console.log(`📚 Swagger documentation at http://localhost:${port}/${prefix}/docs`);
}

await bootstrap();
