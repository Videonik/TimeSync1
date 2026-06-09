import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusySlotsService } from './busy-slots.service';
import {
  BusySlotsController,
  BusySlotsControllerRoot,
} from './busy-slots.controller';
import { BusySlot } from '../entities/busy-slot.entity';
import { User } from '../entities/user.entity';
import { YandexCalendarService } from '../calendar/yandex-calendar.service';

@Module({
  imports: [TypeOrmModule.forFeature([BusySlot, User])],
  controllers: [BusySlotsController, BusySlotsControllerRoot],
  providers: [BusySlotsService, YandexCalendarService],
  exports: [BusySlotsService],
})
export class BusySlotsModule {}
