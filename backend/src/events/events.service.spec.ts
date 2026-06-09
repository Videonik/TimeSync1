import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Event } from '../entities/event.entity';
import { Participant } from '../entities/participant.entity';
import { TimeSlot } from '../entities/time-slot.entity';
import { User } from '../entities/user.entity';
import { SchedulerService } from '../scheduler/scheduler.service';

import { Vote } from '../entities/vote.entity';

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Participant),
          useValue: {},
        },
        {
          provide: getRepositoryToken(TimeSlot),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Vote),
          useValue: {},
        },
        {
          provide: SchedulerService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
