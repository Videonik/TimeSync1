import { Injectable } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { YandexCalendarService } from '../calendar/yandex-calendar.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusySlot } from '../entities/busy-slot.entity';

export interface TimeInterval {
  start: Date;
  end: Date;
}

export interface UserIntervals {
  userId: string;
  busyIntervals: TimeInterval[];
}

@Injectable()
export class SchedulerService {
  constructor(
    private yandexCalendarService: YandexCalendarService,
    @InjectRepository(BusySlot)
    private busySlotRepository: Repository<BusySlot>,
  ) {}

  /**
   * Step 1 & 2: Fetch busy intervals from external APIs and convert to UTC.
   */
  async fetchBusyIntervals(
    users: User[],
    searchStart: Date,
    searchEnd: Date,
  ): Promise<UserIntervals[]> {
    const promises = users.map(async (user) => {
      let busyIntervals: TimeInterval[] = [];

      // Fetch internal busy slots
      const internalSlots = await this.busySlotRepository
        .createQueryBuilder('busySlot')
        .where('busySlot.userId = :userId', { userId: user.id })
        .andWhere('busySlot.startTime < :searchEnd', { searchEnd })
        .andWhere('busySlot.endTime > :searchStart', { searchStart })
        .getMany();

      busyIntervals = internalSlots.map((slot) => ({
        start: new Date(slot.startTime),
        end: new Date(slot.endTime),
      }));

      // If user has a Yandex token (in real app, stored securely in DB upon OAuth)
      // Here we assume encryptedTokens holds the access token for MVP.
      if (user.encryptedTokens) {
        try {
          const rawIntervals =
            await this.yandexCalendarService.getBusyIntervals(
              user.encryptedTokens,
              user.email,
              searchStart,
              searchEnd,
            );
          const externalIntervals = rawIntervals.map((r) => ({
            start: new Date(r.startTime),
            end: new Date(r.endTime),
          }));
          busyIntervals = busyIntervals.concat(externalIntervals);
        } catch (e) {
          console.error(
            `Failed to fetch Yandex intervals for user ${user.id}`,
            e,
          );
        }
      }

      return {
        userId: user.id,
        busyIntervals: busyIntervals,
      };
    });

    return Promise.all(promises);
  }

  /**
   * Step 3: Merge overlapping busy intervals into single continuous blocks.
   */
  mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
    if (intervals.length === 0) return [];

    // Sort intervals by start time
    intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

    const merged: TimeInterval[] = [intervals[0]];

    for (let i = 1; i < intervals.length; i++) {
      const current = intervals[i];
      const lastMerged = merged[merged.length - 1];

      if (current.start.getTime() <= lastMerged.end.getTime()) {
        // Overlapping intervals, merge them
        lastMerged.end = new Date(
          Math.max(lastMerged.end.getTime(), current.end.getTime()),
        );
      } else {
        // No overlap, add to merged list
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Helper to parse HH:MM string to time numbers
   */
  private parseTimeStr(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  /**
   * Step 4: Invert merged busy blocks to calculate free time windows for each participant within the search range.
   * Also respects working hours.
   */
  invertIntervals(
    busyIntervals: TimeInterval[],
    searchStart: Date,
    searchEnd: Date,
    user: User,
  ): TimeInterval[] {
    const freeIntervals: TimeInterval[] = [];

    // Parse working hours
    const startStr = user.workingHoursStart || '09:00';
    const endStr = user.workingHoursEnd || '18:00';
    const { hours: startHour, minutes: startMin } = this.parseTimeStr(startStr);
    const { hours: endHour, minutes: endMin } = this.parseTimeStr(endStr);

    // Iterate day by day from searchStart to searchEnd
    const currentDay = new Date(searchStart);
    currentDay.setHours(0, 0, 0, 0);

    while (currentDay.getTime() <= searchEnd.getTime()) {
      const dayStart = new Date(currentDay);
      dayStart.setHours(startHour, startMin, 0, 0);

      const dayEnd = new Date(currentDay);
      dayEnd.setHours(endHour, endMin, 0, 0);

      // Ensure dayStart is not before searchStart
      const actualStart = new Date(
        Math.max(dayStart.getTime(), searchStart.getTime()),
      );
      // Ensure dayEnd is not after searchEnd
      const actualEnd = new Date(
        Math.min(dayEnd.getTime(), searchEnd.getTime()),
      );

      if (actualStart.getTime() < actualEnd.getTime()) {
        let currentStart = actualStart.getTime();

        for (const busy of busyIntervals) {
          // If busy block is completely before actualStart, skip
          if (busy.end.getTime() <= currentStart) continue;

          // If busy block is completely after actualEnd, we can stop checking for this day
          if (busy.start.getTime() >= actualEnd.getTime()) break;

          // Found an overlap within our working hours
          if (busy.start.getTime() > currentStart) {
            freeIntervals.push({
              start: new Date(currentStart),
              end: new Date(busy.start.getTime()),
            });
          }
          currentStart = Math.max(currentStart, busy.end.getTime());
        }

        if (currentStart < actualEnd.getTime()) {
          freeIntervals.push({
            start: new Date(currentStart),
            end: actualEnd,
          });
        }
      }

      // Move to next day
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return freeIntervals;
  }

  /**
   * Step 5: Intersect lists of free windows using two pointers (O(n+m))
   */
  intersectIntervals(
    list1: TimeInterval[],
    list2: TimeInterval[],
  ): TimeInterval[] {
    const intersections: TimeInterval[] = [];
    let i = 0;
    let j = 0;

    while (i < list1.length && j < list2.length) {
      const a = list1[i];
      const b = list2[j];

      // Find overlap start and end
      const start = new Date(Math.max(a.start.getTime(), b.start.getTime()));
      const end = new Date(Math.min(a.end.getTime(), b.end.getTime()));

      // If there's an overlap
      if (start.getTime() < end.getTime()) {
        intersections.push({ start, end });
      }

      // Move pointer for the interval that ends earlier
      if (a.end.getTime() < b.end.getTime()) {
        i++;
      } else {
        j++;
      }
    }

    return intersections;
  }

  /**
   * Filter intervals by required duration + buffer
   */
  filterByDuration(
    intervals: TimeInterval[],
    durationMinutes: number,
    bufferMinutes: number = 0,
  ): TimeInterval[] {
    const requiredMs = (durationMinutes + bufferMinutes) * 60 * 1000;
    return intervals.filter(
      (slot) => slot.end.getTime() - slot.start.getTime() >= requiredMs,
    );
  }

  /**
   * Helper to generate all combinations of a specific size
   */
  getCombinations<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    const helper = (start: number, combo: T[]) => {
      if (combo.length === size) {
        result.push([...combo]);
        return;
      }
      for (let i = start; i < array.length; i++) {
        combo.push(array[i]);
        helper(i + 1, combo);
        combo.pop();
      }
    };
    helper(0, []);
    return result;
  }

  /**
   * Orchestrator for steps 1-8
   */
  async findIntersections(
    users: User[],
    searchStart: Date,
    searchEnd: Date,
    durationMinutes: number,
    bufferMinutes: number = 0,
  ): Promise<(TimeInterval & { score: number; unavailableUsers: string[] })[]> {
    // For demo/diploma purposes: if no users are provided, generate mock slots within the requested range
    if (users.length === 0) {
      const mockSlots = [];
      const currentStart = new Date(searchStart);
      currentStart.setHours(10, 0, 0, 0); // Start mock slots at 10:00 AM

      for (let i = 0; i < 5; i++) {
        const slotEnd = new Date(currentStart);
        slotEnd.setMinutes(
          slotEnd.getMinutes() + durationMinutes + bufferMinutes,
        );

        if (slotEnd.getTime() <= searchEnd.getTime()) {
          mockSlots.push({
            start: new Date(currentStart),
            end: new Date(slotEnd),
            score: 100,
            unavailableUsers: [],
          });
        }
        // Next slot is 1 hour later
        currentStart.setHours(currentStart.getHours() + 1);
      }
      return mockSlots;
    }

    // 1 & 2: Fetch and UTC format
    const usersBusy = await this.fetchBusyIntervals(
      users,
      searchStart,
      searchEnd,
    );

    // Get free intervals for each user
    const usersFree = usersBusy.map((ub) => {
      // 3: Merge
      const mergedBusy = this.mergeIntervals(ub.busyIntervals);
      // Get full user object
      const user = users.find((u) => u.id === ub.userId)!;
      // 4: Invert
      return {
        userId: ub.userId,
        freeIntervals: this.invertIntervals(
          mergedBusy,
          searchStart,
          searchEnd,
          user,
        ),
      };
    });

    const allUserIds = usersFree.map((u) => u.userId);
    const results: (TimeInterval & {
      score: number;
      unavailableUsers: string[];
      availableIds: string[];
    })[] = [];

    // Steps 5, 6, 7, 8: Iterate from full matches down to partial matches
    for (let k = usersFree.length; k > 0; k--) {
      const combinations = this.getCombinations(usersFree, k);

      for (const combo of combinations) {
        let commonFree = combo[0].freeIntervals;
        // Step 5: Pairwise intersect using two pointers
        for (let i = 1; i < combo.length; i++) {
          commonFree = this.intersectIntervals(
            commonFree,
            combo[i].freeIntervals,
          );
        }

        // Step 6: Filter by duration
        const filtered = this.filterByDuration(
          commonFree,
          durationMinutes,
          bufferMinutes,
        );
        const comboUserIds = combo.map((u) => u.userId);
        const unavailableUsers = allUserIds.filter(
          (id) => !comboUserIds.includes(id),
        );
        const score = Math.round((k / usersFree.length) * 100);

        for (const slot of filtered) {
          // Ensure we don't add subsets of already found full matches
          const isCovered = results.some(
            (existing) =>
              existing.start.getTime() <= slot.start.getTime() &&
              existing.end.getTime() >= slot.end.getTime() &&
              comboUserIds.every((id) => existing.availableIds.includes(id)),
          );

          if (!isCovered) {
            results.push({
              ...slot,
              score,
              unavailableUsers,
              availableIds: comboUserIds,
            });
          }
        }
      }
    }

    // Step 7: Rank by score (participants available), then chronological
    results.sort(
      (a, b) => b.score - a.score || a.start.getTime() - b.start.getTime(),
    );

    return results.map(({ availableIds: _availableIds, ...rest }) => rest);
  }
}
