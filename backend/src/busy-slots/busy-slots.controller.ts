import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { BusySlotsService } from './busy-slots.service';
import { BusySlot } from '../entities/busy-slot.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users/:userId/busy-slots')
@UseGuards(JwtAuthGuard)
export class BusySlotsController {
  constructor(private readonly busySlotsService: BusySlotsService) {}

  @Get()
  async getUserBusySlots(
    @Param('userId') userId: string,
    @Req() req: any,
  ): Promise<BusySlot[]> {
    if (req.user.id !== userId) {
      throw new ForbiddenException('You can only view your own busy slots');
    }
    return this.busySlotsService.getUserBusySlots(userId);
  }

  @Get('view')
  async getCalendarView(@Param('userId') userId: string, @Req() req: any) {
    if (req.user.id !== userId) {
      throw new ForbiddenException(`You can only view your own calendar. ${req.user.id} !== ${userId}`);
    }
    return this.busySlotsService.getCalendarView(userId);
  }

  @Post()
  async createBusySlot(
    @Param('userId') userId: string,
    @Req() req: any,
    @Body() body: { startTime: string; endTime: string; title?: string },
  ): Promise<BusySlot> {
    if (req.user.id !== userId) {
      throw new ForbiddenException('You can only create your own busy slots');
    }
    return this.busySlotsService.createBusySlot(userId, {
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      title: body.title,
    });
  }
}

@Controller('busy-slots')
@UseGuards(JwtAuthGuard)
export class BusySlotsControllerRoot {
  constructor(private readonly busySlotsService: BusySlotsService) {}

  @Delete(':id')
  async deleteBusySlot(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<void> {
    // Need to verify ownership of the slot
    const slots = await this.busySlotsService.getUserBusySlots(req.user.id);
    const ownsSlot = slots.some((slot) => slot.id === id);
    if (!ownsSlot) {
      throw new ForbiddenException('You can only delete your own busy slots');
    }
    return this.busySlotsService.deleteBusySlot(id);
  }
}
