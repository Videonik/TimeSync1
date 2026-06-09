import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Participant as IParticipant } from '@scheduler/shared';
import type { ParticipantAvailability } from '@scheduler/shared';
import { Event } from './event.entity';
import { User } from './user.entity';
import { TimeSlot } from './time-slot.entity';

@Entity()
export class Participant implements IParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  eventId!: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event!: Event;

  @Column({ nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ type: 'varchar', default: 'unknown' })
  availability!: ParticipantAvailability;

  @Column({ nullable: true })
  comment?: string;

  @Column({ nullable: true })
  timeSlotId?: string;

  @ManyToOne(() => TimeSlot, { nullable: true })
  @JoinColumn({ name: 'timeSlotId' })
  timeSlot?: TimeSlot;
}
