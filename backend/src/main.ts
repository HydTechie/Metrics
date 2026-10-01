import 'reflect-metadata';
import './environment';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.getHttpAdapter().get('/health/live', (_req, res) => res.status(200).send({ status: 'ok' }));
  const mongo = app.get(getConnectionToken());
  app.getHttpAdapter().get('/health/ready', (_req, res) => mongo.readyState === 1 ? res.status(200).send({ status: 'ready' }) : res.status(503).send({ status: 'not-ready' }));
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
