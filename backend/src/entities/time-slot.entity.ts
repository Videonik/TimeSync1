import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { TimeSlot as ITimeSlot } from '@scheduler/shared';
import { Event } from './event.entity';
import { Vote } from './vote.entity';

@Entity()
export class TimeSlot implements ITimeSlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  eventId!: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event!: Event;

  @Column()
  startTime!: Date;

  @Column()
  endTime!: Date;

  @Column({ type: 'float', nullable: true })
  score?: number;

  @OneToMany(() => Vote, (vote) => vote.timeSlot)
  votes?: Vote[];
}
