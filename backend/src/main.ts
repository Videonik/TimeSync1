import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('TimeSync API')
    .setDescription('Документация REST API для сервиса планирования встреч TimeSync')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Serve static files from the React app
  const frontendPath = join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(frontendPath));

  // Handle SPA routing: redirect all non-api routes to index.html
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/events')) {
      return next();
    }
    res.sendFile(join(frontendPath, 'index.html'));
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
