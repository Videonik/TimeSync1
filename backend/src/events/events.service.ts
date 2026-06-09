import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { Participant } from '../entities/participant.entity';
import { TimeSlot } from '../entities/time-slot.entity';
import { User } from '../entities/user.entity';
import { Vote } from '../entities/vote.entity';
import { SchedulerService } from '../scheduler/scheduler.service';
import { ParticipantAvailability } from '@scheduler/shared';
import * as ics from 'ics';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Participant)
    private participantRepository: Repository<Participant>,
    @InjectRepository(TimeSlot)
    private timeSlotRepository: Repository<TimeSlot>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Vote)
    private voteRepository: Repository<Vote>,
    private schedulerService: SchedulerService,
  ) {}

  async exportToICS(
    eventId: string,
    slotId: string,
  ): Promise<{ filename: string; content: string }> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });
    const slot = await this.timeSlotRepository.findOne({
      where: { id: slotId },
    });
    if (!event || !slot) throw new Error('Event or slot not found');

    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);

    const icsEvent: ics.EventAttributes = {
      start: [
        start.getFullYear(),
        start.getMonth() + 1,
        start.getDate(),
        start.getHours(),
        start.getMinutes(),
      ],
      end: [
        end.getFullYear(),
        end.getMonth() + 1,
        end.getDate(),
        end.getHours(),
        end.getMinutes(),
      ],
      title: event.title,
      description: `Запланировано через TimeSync.`,
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
    };

    return new Promise((resolve, reject) => {
      ics.createEvent(icsEvent, (error, value) => {
        if (error) return reject(error);
        resolve({
          filename: `${event.title.replace(/\s+/g, '_')}.ics`,
          content: value,
        });
      });
    });
  }

  private async sendConfirmationEmails(
    event: Event,
    slot: TimeSlot,
    participants: Participant[],
  ) {
    try {
      const { filename, content } = await this.exportToICS(event.id, slot.id);

      // Create a test account for Ethereal email testing
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const emails = participants
        .map((p) => p.email)
        .filter(Boolean) as string[];
      if (emails.length === 0) return;

      const start = new Date(slot.startTime).toLocaleString('ru-RU');
      const end = new Date(slot.endTime).toLocaleString('ru-RU');

      for (const email of emails) {
        const info = await transporter.sendMail({
          from: '"TimeSync" <no-reply@timesync.local>',
          to: email,
          subject: `Встреча подтверждена: ${event.title}`,
          text: `Организатор подтвердил время встречи "${event.title}".\nНачало: ${start}\nОкончание: ${end}\n\nФайл события прикреплен.`,
          html: `<p>Организатор подтвердил время встречи <b>${event.title}</b>.</p><p>Начало: ${start}<br>Окончание: ${end}</p><p>Добавьте прикрепленный файл в свой календарь.</p>`,
          attachments: [
            {
              filename: filename,
              content: content,
              contentType: 'text/calendar',
            },
          ],
        });
        console.log(
          `Confirmation email sent to ${email}. Preview URL: ${nodemailer.getTestMessageUrl(info)}`,
        );
      }
    } catch (err) {
      console.error('Failed to send confirmation emails', err);
    }
  }

  async createEvent(
    eventData: Partial<Event>,
    participantsEmails: string[],
  ): Promise<Event> {
    const event = this.eventRepository.create({
      ...eventData,
      status: 'planning',
    });
    const savedEvent = await this.eventRepository.save(event);

    // 1. Always add the organizer as a participant
    const organizer = await this.userRepository.findOne({ where: { id: savedEvent.organizerId } });
    if (organizer) {
      await this.participantRepository.save(
        this.participantRepository.create({
          eventId: savedEvent.id,
          userId: organizer.id,
          email: organizer.email,
          name: organizer.name,
          availability: 'unknown',
        })
      );
    }

    if (participantsEmails && participantsEmails.length > 0) {
      // 2. Map emails to existing users if possible
      const existingUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('user.email IN (:...emails)', { emails: participantsEmails })
        .getMany();

      const participants = participantsEmails.map((email) => {
        const foundUser = existingUsers.find(u => u.email === email);
        return this.participantRepository.create({
          eventId: savedEvent.id,
          email: email,
          userId: foundUser ? foundUser.id : undefined,
          name: foundUser ? foundUser.name : undefined,
          availability: 'unknown',
        });
      });
      await this.participantRepository.save(participants);

      // Send invitations asynchronously
      void this.sendInvitations(savedEvent, participantsEmails);
    }

    // Automatically generate initial slots based on current logic
    await this.generateTimeSlots(savedEvent.id);

    return savedEvent;
  }

  private async sendInvitations(event: Event, emails: string[]) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      // Assuming frontend runs on localhost:5173 for local dev
      // In production, this would be an environment variable
      const votingUrl = `http://localhost:5173/event/${event.id}`;

      for (const email of emails) {
        const info = await transporter.sendMail({
          from: '"TimeSync" <no-reply@timesync.local>',
          to: email,
          subject: `Приглашение на встречу: ${event.title}`,
          text: `Организатор приглашает вас выбрать время для встречи "${event.title}". Пожалуйста, проголосуйте по ссылке: ${votingUrl}`,
          html: `<p>Организатор приглашает вас выбрать время для встречи <b>${event.title}</b>.</p><p><a href="${votingUrl}">Проголосовать за время</a></p>`,
        });
        console.log(
          `Invitation email sent to ${email}. Preview URL: ${nodemailer.getTestMessageUrl(info)}`,
        );
      }
    } catch (err) {
      console.error('Failed to send invitation emails', err);
    }
  }

  async confirmFinalSlot(
    eventId: string,
    slotId: string,
    organizerId: string,
  ): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });
    if (!event) throw new Error('Event not found');
    if (event.organizerId !== organizerId)
      throw new Error('Only organizer can confirm slot');

    const slot = await this.timeSlotRepository.findOne({
      where: { id: slotId },
    });
    if (!slot) throw new Error('Slot not found');

    event.finalSlotId = slotId;
    event.status = 'confirmed';
    const savedEvent = await this.eventRepository.save(event);

    // Send emails
    const participants = await this.participantRepository.find({
      where: { eventId },
    });
    void this.sendConfirmationEmails(savedEvent, slot, participants);

    return savedEvent;
  }

  async getEvent(id: string): Promise<{
    event: Event;
    participants: Participant[];
    timeSlots: TimeSlot[];
  }> {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) throw new Error('Event not found');

    const participants = await this.participantRepository.find({
      where: { eventId: id },
    });

    // Fetch slots with votes
    const timeSlots = await this.timeSlotRepository.find({
      where: { eventId: id },
      relations: { votes: true },
      order: { score: 'DESC', startTime: 'ASC' },
    });

    return { event, participants, timeSlots };
  }

  async addParticipant(eventId: string, email: string): Promise<Participant> {
    const participant = this.participantRepository.create({
      eventId,
      email,
      availability: 'unknown',
    });
    return this.participantRepository.save(participant);
  }

  async addGuest(eventId: string, name: string): Promise<Participant> {
    const participant = this.participantRepository.create({
      eventId,
      name,
      availability: 'unknown',
    });
    return this.participantRepository.save(participant);
  }

  async generateTimeSlots(eventId: string): Promise<TimeSlot[]> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });
    if (!event) throw new Error('Event not found');

    const participants = await this.participantRepository.find({
      where: { eventId },
    });
    if (participants.length === 0) return [];

    // Find users for participants (assuming we can match by email for now or they are linked)
    // In a real app, you'd ensure users are linked to participants
    const userIds = participants
      .map((p) => p.userId)
      .filter(Boolean) as string[];
    const users =
      userIds.length > 0
        ? await this.userRepository
            .createQueryBuilder('user')
            .where('user.id IN (:...userIds)', { userIds })
            .getMany()
        : [];

    const intersections = await this.schedulerService.findIntersections(
      users,
      event.dateRangeStart,
      event.dateRangeEnd,
      event.durationMinutes,
      event.bufferMinutes,
    );

    // Save generated slots
    const timeSlots = intersections.map((slot) =>
      this.timeSlotRepository.create({
        eventId,
        startTime: slot.start,
        endTime: slot.end,
        score: slot.score,
      }),
    );

    // Clear old slots and save new ones
    await this.timeSlotRepository.delete({ eventId });
    return this.timeSlotRepository.save(timeSlots);
  }

  async getEventTimeSlots(eventId: string): Promise<TimeSlot[]> {
    return this.timeSlotRepository.find({
      where: { eventId },
      relations: { votes: true },
      order: { score: 'DESC', startTime: 'ASC' },
    });
  }

  async getUserEvents(userId: string): Promise<Event[]> {
    return this.eventRepository
      .createQueryBuilder('event')
      .leftJoin('participant', 'participant', 'participant.eventId = event.id')
      .where('event.organizerId = :userId', { userId })
      .orWhere('participant.userId = :userId', { userId })
      .distinct(true)
      .orderBy('event.dateRangeStart', 'DESC')
      .getMany();
  }

  async submitVote(
    participantId: string,
    timeSlotId: string,
    availability: ParticipantAvailability,
  ): Promise<Vote> {
    const participant = await this.participantRepository.findOne({
      where: { id: participantId },
    });
    if (!participant) throw new Error('Participant not found');

    let vote = await this.voteRepository.findOne({
      where: { participantId, timeSlotId },
    });

    if (vote) {
      vote.availability = availability;
    } else {
      vote = this.voteRepository.create({
        participantId,
        timeSlotId,
        availability,
      });
    }

    return this.voteRepository.save(vote);
  }

  async deleteEvent(eventId: string, userId: string): Promise<void> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });
    if (!event) throw new Error('Event not found');
    if (event.organizerId !== userId)
      throw new Error('Only the organizer can delete this event');

    await this.eventRepository.remove(event);
  }
}
