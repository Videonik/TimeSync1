import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtModule } from '@nestjs/jwt';
import { User } from './entities/user.entity';
import { Event } from './entities/event.entity';
import { TimeSlot } from './entities/time-slot.entity';
import { Participant } from './entities/participant.entity';
import { BusySlot } from './entities/busy-slot.entity';
import { Vote } from './entities/vote.entity';
import { AuthModule } from './auth/auth.module';
import { EventsController } from './events/events.controller';
import { EventsService } from './events/events.service';
import { SchedulerService } from './scheduler/scheduler.service';
import { YandexCalendarService } from './calendar/yandex-calendar.service';
import { BusySlotsModule } from './busy-slots/busy-slots.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes config available across all modules
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get<string>('DB_TYPE', 'sqlite');
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [User, Event, TimeSlot, Participant, BusySlot, Vote],
            synchronize: true,
            logging: true,
            ssl: {
              rejectUnauthorized: false, // Required for many cloud providers
            },
          } as any;
        }

        if (dbType === 'sqlite') {
          return {
            type: 'better-sqlite3',
            database: configService.get<string>('DB_NAME', 'scheduler.sqlite'),
            entities: [User, Event, TimeSlot, Participant, BusySlot, Vote],
            synchronize: true, // Auto create tables for dev
          } as any;
        }
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5433),
          username: configService.get<string>('DB_USER', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'password'),
          database: configService.get<string>('DB_NAME', 'scheduler'),
          entities: [User, Event, TimeSlot, Participant, BusySlot, Vote],
          synchronize: true, // Auto create tables for dev
          logging: true,
        } as any;
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      User,
      Event,
      TimeSlot,
      Participant,
      BusySlot,
      Vote,
    ]),
    AuthModule,
    BusySlotsModule,
  ],
  controllers: [AppController, EventsController],
  providers: [
    AppService,
    EventsService,
    SchedulerService,
    YandexCalendarService,
  ],
})
export class AppModule {}
