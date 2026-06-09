import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const jwtService = app.get(JwtService);

  let existing = await userRepository.findOne({
    where: { email: 'mock@example.com' },
  });

  if (!existing) {
    const user = userRepository.create({
      id: 'mock-user-id',
      email: 'mock@example.com',
      name: 'Mock User',
    });
    // Let typeorm generate the uuid
    existing = await userRepository.save(user);
    console.log('Mock user created with id:', existing.id);
  } else {
    console.log('Mock user already exists with ID:', existing.id);
  }

  const payload = {
    sub: existing.id,
    email: existing.email,
    name: existing.name,
  };
  const token = jwtService.sign(payload, {
    secret: 'super_secret_jwt_key_here',
  });
  console.log('\n=======================================');
  console.log('Use this token to test:');
  console.log(token);
  console.log('User ID:', existing.id);
  console.log('=======================================\n');

  await app.close();
}

bootstrap();
