import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Res,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { Event } from '../entities/event.entity';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать новую встречу и отправить приглашения' })
  @UseGuards(AuthGuard('jwt'))
  async createEvent(
    @Body() body: { eventData: Partial<Event>; participantsEmails: string[] },
    @Req() req: any,
  ) {
    // Override the organizer ID with the authenticated user's ID
    body.eventData.organizerId = req.user.id;
    return this.eventsService.createEvent(
      body.eventData,
      body.participantsEmails,
    );
  }

  @Get(':id')
  async getEvent(@Param('id') id: string) {
    return this.eventsService.getEvent(id);
  }

  @Get('user/:userId')
  async getUserEvents(@Param('userId') userId: string) {
    return this.eventsService.getUserEvents(userId);
  }

  @Get(':id/export/:slotId')
  async exportToICS(
    @Param('id') eventId: string,
    @Param('slotId') slotId: string,
    @Res() res: Response,
  ) {
    const { filename, content } = await this.eventsService.exportToICS(
      eventId,
      slotId,
    );
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(content);
  }

  @Post(':id/participants')
  async addParticipant(
    @Param('id') eventId: string,
    @Body('email') email: string,
  ) {
    return this.eventsService.addParticipant(eventId, email);
  }

  @Post(':id/participants/guest')
  async addGuest(@Param('id') eventId: string, @Body('name') name: string) {
    return this.eventsService.addGuest(eventId, name);
  }

  @Post(':id/generate-slots')
  async generateSlots(@Param('id') eventId: string) {
    return this.eventsService.generateTimeSlots(eventId);
  }

  @Get(':id/slots')
  async getSlots(@Param('id') eventId: string) {
    return this.eventsService.getEventTimeSlots(eventId);
  }

  @Post(':id/confirm-slot')
  @UseGuards(AuthGuard('jwt'))
  async confirmSlot(
    @Param('id') eventId: string,
    @Body('slotId') slotId: string,
    @Req() req: any,
  ) {
    return this.eventsService.confirmFinalSlot(eventId, slotId, req.user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async deleteEvent(@Param('id') eventId: string, @Req() req: any) {
    return this.eventsService.deleteEvent(eventId, req.user.id);
  }

  @Post(':id/vote')
  async submitVote(
    @Param('id') eventId: string,
    @Body('participantId') participantId: string,
    @Body('timeSlotId') timeSlotId: string,
    @Body('availability') availability: any,
  ) {
    return this.eventsService.submitVote(
      participantId,
      timeSlotId,
      availability,
    );
  }
}
