import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusySlot } from '../entities/busy-slot.entity';
import { User } from '../entities/user.entity';
import { YandexCalendarService } from '../calendar/yandex-calendar.service';

@Injectable()
export class BusySlotsService {
  constructor(
    @InjectRepository(BusySlot)
    private busySlotRepository: Repository<BusySlot>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private yandexCalendarService: YandexCalendarService,
  ) {}

  async getUserBusySlots(userId: string): Promise<BusySlot[]> {
    return this.busySlotRepository.find({ where: { userId } });
  }

  async getCalendarView(userId: string): Promise<any[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const internalSlots = await this.getUserBusySlots(userId);
    const viewEvents: any[] = internalSlots.map((slot) => ({
      id: slot.id,
      title: slot.title || 'Занято (TimeSync)',
      start: slot.startTime,
      end: slot.endTime,
      isExternal: false,
    }));

    if (user.encryptedTokens) {
      const searchStart = new Date();
      searchStart.setDate(searchStart.getDate() - 30); // 1 month back
      const searchEnd = new Date();
      searchEnd.setDate(searchEnd.getDate() + 30); // 1 month forward

      const externalSlots = await this.yandexCalendarService.getBusyIntervals(
        user.encryptedTokens,
        user.email,
        searchStart,
        searchEnd,
      );

      viewEvents.push(
        ...externalSlots.map((slot) => ({
          id: slot.id,
          title: 'Занято (Yandex)',
          start: slot.startTime,
          end: slot.endTime,
          isExternal: true,
        })),
      );
    }

    return viewEvents;
  }

  async createBusySlot(
    userId: string,
    data: { startTime: Date; endTime: Date; title?: string },
  ): Promise<BusySlot> {
    const slot = this.busySlotRepository.create({
      userId,
      startTime: data.startTime,
      endTime: data.endTime,
      title: data.title,
    });
    return this.busySlotRepository.save(slot);
  }

  async deleteBusySlot(id: string): Promise<void> {
    await this.busySlotRepository.delete(id);
  }
}
