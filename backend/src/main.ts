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
  const frontendPath = join(__dirname, '..', '..', '..', 'public');
  console.log(`Checking frontend path: ${frontendPath}`);
  app.use(express.static(frontendPath));

  // Handle SPA routing: redirect all non-api routes to index.html
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/events')) {
      return next();
    }
    res.sendFile(join(frontendPath, 'index.html'));
  });

  const port = process.env.PORT ?? 80;
  console.log(`Server starting on port: ${port}`);
  await app.listen(port);
}
bootstrap();
