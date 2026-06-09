import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Vote as IVote, ParticipantAvailability } from '@scheduler/shared';
import { Participant } from './participant.entity';
import { TimeSlot } from './time-slot.entity';

@Entity()
export class Vote implements IVote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  participantId!: string;

  @ManyToOne(() => Participant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participantId' })
  participant!: Participant;

  @Column()
  timeSlotId!: string;

  @ManyToOne(() => TimeSlot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'timeSlotId' })
  timeSlot!: TimeSlot;

  @Column({ type: 'varchar' })
  availability!: ParticipantAvailability;
}
