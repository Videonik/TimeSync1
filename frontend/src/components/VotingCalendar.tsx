import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { EventPropGetter } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../calendar.css';
import api from '../api';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ru }),
  getDay,
  locales: { 'ru': ru },
});

interface VotingCalendarProps {
  eventId: string;
  participantId: string;
  currentUserId?: string | null;
  onVote: (slotId: string, availability: 'available' | 'preferred' | 'unavailable') => void;
  proposedSlots: any[];
  eventStatus?: string;
}

export const VotingCalendar: React.FC<VotingCalendarProps> = ({ 
  eventId: _eventId, 
  participantId, 
  currentUserId,
  onVote,
  proposedSlots,
  eventStatus
}) => {
  const [busySlots, setBusySlots] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(() => {
    if (proposedSlots && proposedSlots.length > 0) {
      return new Date(proposedSlots[0].startTime);
    }
    return new Date();
  });
  const [currentView, setCurrentView] = useState<'week' | 'day'>('week');

  useEffect(() => {
    if (currentUserId) {
      fetchParticipantBusySlots();
    } else {
      setBusySlots([]);
    }
  }, [currentUserId]);

  const fetchParticipantBusySlots = async () => {
    try {
      const res = await api.get(`/users/${currentUserId}/busy-slots/view`).catch(() => ({ data: [] }));
      setBusySlots(res.data.map((s: any) => ({
        ...s,
        start: new Date(s.start),
        end: new Date(s.end),
        isBusy: true
      })));
    } catch (e) {
      console.error("Failed to fetch busy slots", e);
    }
  };

  const calendarEvents = [
    ...busySlots,
    ...proposedSlots.map(slot => ({
      id: slot.id,
      title: `Match: ${slot.score}%`,
      start: new Date(slot.startTime),
      end: new Date(slot.endTime),
      isProposed: true,
      score: slot.score,
      votes: slot.votes || []
    }))
  ];

  const eventPropGetter: EventPropGetter<any> = (event: any) => {
    if (event.isBusy) {
      return {
        style: {
          backgroundColor: '#f1f5f9',
          borderLeft: '4px solid #cbd5e1',
          color: '#64748b',
          opacity: 0.6,
          pointerEvents: 'none' as const
        }
      };
    }

    const myVote = event.votes.find((v: any) => v.participantId === participantId);
    let bgColor = '#eff6ff'; 
    let borderColor = '#3b82f6';

    if (myVote) {
      if (myVote.availability === 'preferred') {
        bgColor = '#fefce8';
        borderColor = '#eab308';
      } else if (myVote.availability === 'available') {
        bgColor = '#f0fdf4';
        borderColor = '#22c55e';
      } else if (myVote.availability === 'unavailable') {
        bgColor = '#fef2f2';
        borderColor = '#ef4444';
      }
    }

    return {
      className: 'proposed-slot-event',
      style: {
        backgroundColor: bgColor,
        borderLeft: `6px solid ${borderColor}`,
        color: '#1e3a8a',
        zIndex: 10
      }
    };
  };

  const handleSelectEvent = (event: any) => {
    if (eventStatus === 'confirmed') return;

    if (event.isProposed) {
      const myVote = event.votes.find((v: any) => v.participantId === participantId);
      let nextStatus: 'available' | 'preferred' | 'unavailable' = 'available';
      
      if (!myVote) nextStatus = 'available';
      else if (myVote.availability === 'available') nextStatus = 'preferred';
      else if (myVote.availability === 'preferred') nextStatus = 'unavailable';
      else if (myVote.availability === 'unavailable') nextStatus = 'available';

      onVote(event.id, nextStatus);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden premium-calendar-container flex flex-col h-[500px] md:h-[750px] transition-all duration-500 hover:shadow-2xl">
      <div className="p-5 bg-white border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-[1000] text-slate-900 uppercase tracking-tighter flex items-center gap-2">
            <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
            Выбор в сетке
          </h3>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Кликайте по предложенным блокам для смены статуса</p>
        </div>
        <div className="flex flex-wrap gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]"></div>
            <span className="text-[10px] font-black text-slate-600 uppercase">Идеально</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]"></div>
            <span className="text-[10px] font-black text-slate-600 uppercase">Хочу</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]"></div>
            <span className="text-[10px] font-black text-slate-600 uppercase">Нет</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 opacity-50">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Ваша занятость</span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          date={currentDate}
          view={currentView}
          onNavigate={setCurrentDate}
          onView={(view: any) => setCurrentView(view)}
          views={['week', 'day']}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventPropGetter}
          components={{
            event: (props: any) => (
              <div className="h-full w-full flex flex-col justify-center items-center text-center p-1 group">
                <span className="font-black text-[10px] uppercase leading-none opacity-80 group-hover:scale-110 transition-transform">
                  {props.event.isProposed ? props.title : 'ЗАНЯТО'}
                </span>
                {props.event.isProposed && (
                   <div className="mt-1 flex gap-0.5">
                     {[...Array(3)].map((_, i) => (
                       <div key={i} className={`w-1 h-1 rounded-full ${i < (props.event.votes.length) ? 'bg-current' : 'bg-current opacity-20'}`}></div>
                     ))}
                   </div>
                )}
              </div>
            )
          }}
          messages={{
            next: "→",
            previous: "←",
            today: "Сегодня",
            week: "Неделя",
            day: "День"
          }}
          culture="ru"
          min={new Date(0, 0, 0, 8, 0, 0)}
          max={new Date(0, 0, 0, 22, 0, 0)}
          scrollToTime={new Date(0, 0, 0, 9, 0, 0)}
        />
      </div>
    </div>
  );
};
