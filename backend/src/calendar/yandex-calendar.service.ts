import { Injectable, Logger } from '@nestjs/common';
import { createDAVClient } from 'tsdav';
import * as ical from 'node-ical';
import { TimeSlot } from '@scheduler/shared';

@Injectable()
export class YandexCalendarService {
  private readonly logger = new Logger(YandexCalendarService.name);
  private readonly CALDAV_SERVER = 'https://caldav.yandex.ru';

  /**
   * Fetches busy intervals for a given user via Yandex CalDAV
   */
  async getBusyIntervals(
    accessToken: string,
    email: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TimeSlot[]> {
    try {
      this.logger.debug(`Fetching calendars for ${email}`);

      // Use Basic auth with accessToken as password for Yandex CalDAV
      const client = await createDAVClient({
        serverUrl: this.CALDAV_SERVER,
        credentials: {
          username: email,
          password: accessToken,
        },
        authMethod: 'Basic',
        defaultAccountType: 'caldav',
      });

      const calendars = await client.fetchCalendars();

      this.logger.debug(`Found ${calendars.length} calendars for ${email}`);

      const busyIntervals: TimeSlot[] = [];

      // Query events for all calendars within the time range
      for (const calendar of calendars) {
        this.logger.debug(
          `Fetching events for calendar: ${calendar.displayName}`,
        );

        try {
          const events = await client.fetchCalendarObjects({
            calendar,
            timeRange: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
          });

          for (const eventObj of events) {
            // tsdav returns raw iCal string in eventObj.data
            // use node-ical to parse robustly
            const parsed = ical.sync.parseICS(eventObj.data);

            for (const key in parsed) {
              const ev = parsed[key] as any;
              if (ev && ev.type === 'VEVENT' && ev.start && ev.end) {
                busyIntervals.push({
                  id: 'caldav-' + Math.random().toString(36).substring(7),
                  eventId: 'external',
                  startTime: new Date(ev.start as Date),
                  endTime: new Date(ev.end as Date),
                });
              }
            }
          }
        } catch (calErr) {
          this.logger.error(
            `Error fetching from calendar ${calendar.displayName}`,
            calErr,
          );
        }
      }

      return busyIntervals;
    } catch (error) {
      this.logger.error(`Failed to fetch busy intervals for ${email}:`, error);
      // Fallback/return empty if we can't fetch so the app doesn't break
      return [];
    }
  }
}
