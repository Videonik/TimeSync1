import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../calendar.css';
import api from '../api';
import { jwtDecode } from 'jwt-decode';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ru }),
  getDay,
  locales: { 'ru': ru },
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isExternal: boolean;
  stackIndex?: number; // Used for staggered overlap
}

const CustomEvent = ({ event }: { event: CalendarEvent }) => (
  <div className={`h-full w-full p-2 border-l-[6px] rounded-r-xl transition-all shadow-sm flex flex-col justify-center overflow-hidden ${
    event.isExternal 
      ? 'bg-slate-50 border-slate-300 text-slate-600' 
      : 'bg-blue-50 border-blue-600 text-blue-900'
  }`}>
    <div className="font-extrabold text-[12px] leading-tight truncate uppercase tracking-tighter">
      {event.title}
    </div>
  </div>
);

export const MyCalendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        localStorage.setItem('userId', decoded.sub);
        return decoded.sub;
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('month');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('');
  const [endTimeStr, setEndTimeStr] = useState('');

  useEffect(() => {
    const init = async () => {
      let currentUserId = userId;
      if (!currentUserId) {
        try {
          const profileRes = await api.get('/auth/me');
          currentUserId = profileRes.data.userId || profileRes.data.id;
          if (currentUserId) {
            setUserId(currentUserId);
            localStorage.setItem('userId', currentUserId);
          }
        } catch (e) { 
          console.error(e); 
          setLoading(false);
        }
      }
      if (currentUserId) {
        fetchEvents(currentUserId);
      } else {
        setLoading(false);
      }
    };
    init();
  }, [userId]);

  const fetchEvents = async (uid: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/users/${uid}/busy-slots/view`);
      setEvents(res.data.map((e: any) => ({ 
        ...e, 
        start: new Date(e.start), 
        end: new Date(e.end) 
      })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * SMART STACK LOGIC
   * Calculates a stackIndex for overlapping events to create a staggered card effect.
   */
  const processedEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
    const dayStacks: Record<string, CalendarEvent[]> = {};

    return sorted.map(event => {
      const dayKey = format(event.start, 'yyyy-MM-dd');
      if (!dayStacks[dayKey]) dayStacks[dayKey] = [];
      
      // Find the first available stack index
      const activeInStack = dayStacks[dayKey].filter(e => 
        (event.start >= e.start && event.start < e.end) || 
        (e.start >= event.start && e.start < event.end)
      );
      
      const stackIndex = activeInStack.length;
      const enrichedEvent = { ...event, stackIndex };
      dayStacks[dayKey].push(enrichedEvent);
      return enrichedEvent;
    });
  }, [events]);

  const eventPropGetter = (event: CalendarEvent) => {
    if (currentView === 'day' || currentView === 'week') {
      const offset = (event.stackIndex || 0) * 15; // 15px stagger
      return {
        style: {
          left: `${offset}px`,
          width: `calc(100% - ${offset + 10}px)`,
          zIndex: 10 + (event.stackIndex || 0),
        }
      };
    }
    return {};
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    let adjustedEnd = new Date(end);
    if (currentView === 'month') {
      if (end.getHours() === 0 && end.getMinutes() === 0) {
        adjustedEnd = new Date(start);
        adjustedEnd.setHours(23, 59, 59);
      }
    }
    setSelectedSlot({ start, end: adjustedEnd });
    setStartTimeStr(format(start, 'HH:mm'));
    setEndTimeStr(format(adjustedEnd, 'HH:mm'));
    setNewTitle('');
    setIsCreateModalOpen(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !newTitle.trim()) return;
    const finalStart = new Date(selectedSlot.start);
    const [sH, sM] = startTimeStr.split(':').map(Number);
    finalStart.setHours(sH, sM);
    const finalEnd = new Date(selectedSlot.end);
    const [eH, eM] = endTimeStr.split(':').map(Number);
    finalEnd.setHours(eH, eM);

    try {
      await api.post(`/users/${userId}/busy-slots`, {
        startTime: finalStart.toISOString(),
        endTime: finalEnd.toISOString(),
        title: newTitle,
      });
      setIsCreateModalOpen(false);
      fetchEvents(userId!);
    } catch (e) { console.error(e); }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    try {
      await api.delete(`/busy-slots/${selectedEvent.id}`);
      setIsDetailModalOpen(false);
      fetchEvents(userId!);
    } catch (e) { console.error(e); }
  };

  if (loading && !events.length) {
    return (
      <div className="w-full h-[calc(100vh-80px)] flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-[3px] border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400">Загрузка расписания</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="w-full h-[calc(100vh-80px)] flex items-center justify-center bg-slate-50">
         <div className="text-center p-12 bg-white rounded-[3rem] shadow-xl border border-slate-100 max-w-md">
            <h2 className="text-2xl font-black mb-4">Вход не выполнен</h2>
            <button onClick={() => window.location.href = '/'} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Перейти к входу</button>
         </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-140px)] flex bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden relative premium-calendar-container">
      
      <aside className="w-64 border-r border-slate-50 p-6 hidden lg:flex flex-col gap-8 shrink-0 bg-slate-50/50">
        <button 
          onClick={() => { 
            const now = new Date();
            setSelectedSlot({ start: now, end: new Date(now.getTime() + 30*60*1000) }); 
            setStartTimeStr(format(now, 'HH:mm')); 
            setEndTimeStr(format(new Date(now.getTime() + 30*60*1000), 'HH:mm')); 
            setIsCreateModalOpen(true); 
          }}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Создать
        </button>
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5 ml-1">Календари</h3>
          <div className="flex flex-col gap-4">
             <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="w-4 h-4 bg-blue-600 rounded-md"></div>
                <span className="text-[11px] font-black text-slate-700 uppercase">TimeSync</span>
             </div>
             <div className="flex items-center gap-3 p-3 opacity-50">
                <div className="w-4 h-4 bg-slate-400 rounded-md"></div>
                <span className="text-[11px] font-black text-slate-500 uppercase">Yandex</span>
             </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        {/* Mobile Create Button */}
        <button 
          onClick={() => { 
            const now = new Date();
            setSelectedSlot({ start: now, end: new Date(now.getTime() + 30*60*1000) }); 
            setStartTimeStr(format(now, 'HH:mm')); 
            setEndTimeStr(format(new Date(now.getTime() + 30*60*1000), 'HH:mm')); 
            setIsCreateModalOpen(true); 
          }}
          className="lg:hidden absolute bottom-6 right-6 z-30 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-300 hover:scale-105 active:scale-95 transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        </button>

        <Calendar
          localizer={localizer}
          events={processedEvents}
          date={currentDate}
          view={currentView}
          onNavigate={setCurrentDate}
          onView={setCurrentView}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={(ev) => { setSelectedEvent(ev); setIsDetailModalOpen(true); }}
          selectable
          popup
          eventPropGetter={eventPropGetter}
          // @ts-ignore
          maxEvents={3}
          views={['month', 'week', 'day']}
          components={{ event: CustomEvent as any }}
          messages={{ 
            next: "→", 
            previous: "←", 
            today: "Сегодня", 
            month: "Месяц", 
            week: "Неделя", 
            day: "День",
            showMore: (total) => `+ еще ${total}`
          }}
          culture="ru"
          min={new Date(0, 0, 0, 0, 0, 0)}
          max={new Date(0, 0, 0, 23, 59, 59)}
          scrollToTime={new Date()}
        />
      </main>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-10 w-full max-w-lg shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-3xl font-[1000] text-slate-900 tracking-tighter">Новое событие</h3>
               <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>
            <form onSubmit={handleCreateEvent} className="flex flex-col gap-6">
               <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Что вы планируете?" className="w-full px-6 py-5 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-900 text-lg" required />
               <div className="grid grid-cols-2 gap-4">
                  <input type="time" value={startTimeStr} onChange={e => setStartTimeStr(e.target.value)} className="px-6 py-5 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none" required />
                  <input type="time" value={endTimeStr} onChange={e => setEndTimeStr(e.target.value)} className="px-6 py-5 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none" required />
               </div>
               <div className="flex gap-4 mt-4">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest">Отмена</button>
                  <button type="submit" className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200">Сохранить</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-10 w-full max-w-lg shadow-2xl">
            <h3 className="text-3xl font-[1000] text-slate-900 tracking-tighter mb-4">{selectedEvent.title}</h3>
            <p className="text-slate-500 font-bold mb-8 uppercase text-[10px] tracking-widest">{format(selectedEvent.start, 'd MMMM yyyy, HH:mm', { locale: ru })}</p>
            <div className="flex gap-4">
               <button onClick={() => setIsDetailModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase">Закрыть</button>
               {!selectedEvent.isExternal && (
                 <button onClick={handleDeleteEvent} className="flex-1 py-5 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase">Удалить</button>
               )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
