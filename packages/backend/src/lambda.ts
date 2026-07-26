import { NestFactory } from '@nestjs/core';
import serverlessExpress from '@codegenie/serverless-express';
import { AppModule } from './app.module';
import type { Handler } from 'aws-lambda';

let cachedServer: Handler;

async function bootstrap(): Promise<Handler> {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  app.enableCors({ origin: true, methods: ['GET','POST','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type'] });
  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (event, context, callback) => {
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }
  return cachedServer(event, context, callback);
};
