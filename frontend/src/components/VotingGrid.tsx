import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEvent, submitVote, addGuest, confirmSlot, API_BASE_URL } from '../api';
import type { ParticipantAvailability } from '@scheduler/shared';
import { VotingCalendar } from './VotingCalendar';
import { jwtDecode } from 'jwt-decode';

export const VotingGrid: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  
  // A simple state to track which participant is voting.
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(() => {
    return localStorage.getItem(`participantId_${id}`) || '';
  });
  const [guestName, setGuestName] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedParticipantId) {
      localStorage.setItem(`participantId_${id}`, selectedParticipantId);
    } else {
      localStorage.removeItem(`participantId_${id}`);
    }
  }, [selectedParticipantId, id]);

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setCurrentUserId(decoded.sub);
      } catch (e) {
        console.error('Failed to parse token', e);
      }
    }
  }, []);

  const { data: eventDetails, isLoading } = useQuery({
    queryKey: ['eventDetails', id],
    queryFn: () => getEvent(id!),
    enabled: !!id,
  });

  const guestMutation = useMutation({
    mutationFn: (name: string) => addGuest(id!, name),
    onSuccess: (newParticipant) => {
      queryClient.invalidateQueries({ queryKey: ['eventDetails', id] });
      setSelectedParticipantId(newParticipant.id);
      setGuestName('');
      alert(`Добро пожаловать, ${newParticipant.name}! Теперь вы можете голосовать.`);
    }
  });

  const handleJoinAsGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    guestMutation.mutate(guestName);
  };

  const voteMutation = useMutation({
    mutationFn: ({ slotId, vote }: { slotId: string; vote: ParticipantAvailability }) => 
      submitVote(id!, selectedParticipantId, slotId, vote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventDetails', id] });
    },
    onError: (err: any) => {
      alert('Ошибка при записи голоса: ' + (err.message || 'Неизвестная ошибка'));
    }
  });

  const confirmSlotMutation = useMutation({
    mutationFn: (slotId: string) => confirmSlot(id!, slotId, currentUserId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventDetails', id] });
      alert('Финальный слот успешно зафиксирован!');
    },
    onError: (err: any) => {
      alert('Ошибка при подтверждении слота: ' + (err.response?.data?.message || err.message));
    }
  });

  const handleVote = (slotId: string, vote: ParticipantAvailability) => {
    if (!selectedParticipantId) {
      alert('Пожалуйста, выберите себя или присоединитесь как гость!');
      return;
    }
    voteMutation.mutate({ slotId, vote });
  };

  const handleConfirmSlot = (slotId: string) => {
    if (confirm('Вы уверены, что хотите зафиксировать этот слот как финальный? Голосование будет завершено.')) {
      confirmSlotMutation.mutate(slotId);
    }
  };

  if (isLoading) return <div className="text-center py-10 text-gray-500">Загрузка деталей встречи...</div>;
  if (!eventDetails) return (
    <div className="text-center py-10 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100 p-8">
      Встреча не найдена.
    </div>
  );

  const { event, participants, timeSlots } = eventDetails;

  // Group slots by date
  const groupedSlots = (timeSlots || []).reduce((acc: Record<string, typeof timeSlots>, slot) => {
    const dateKey = new Date(slot.startTime).toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {});

  const shareText = `Давайте выберем время для встречи "${event.title}". Проголосовать можно здесь:`;
  const shareUrl = window.location.href;

  const copyResults = () => {
    if (!timeSlots || timeSlots.length === 0) return;
    const topSlots = timeSlots.slice(0, 3).map(slot => {
      const start = new Date(slot.startTime);
      const end = new Date(slot.endTime);
      return `${start.toLocaleDateString()} ${start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} (${slot.score}% совпадение)`;
    }).join('\n');
    
    const text = `Результаты подбора времени для "${event.title}":\n\n${topSlots}\n\nПроголосовать: ${shareUrl}`;
    navigator.clipboard.writeText(text);
    alert('Результаты скопированы в буфер обмена!');
  };

  const handleExport = (slotId: string) => {
    window.location.href = `http://localhost:3000/events/${id}/export/${slotId}`;
  };

  return (
    <div className="w-full max-w-5xl flex flex-col gap-6">
      
      {/* Event Header & Share */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">{event.title}</h2>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Ваш часовой пояс: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
              </div>
              <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 shadow-inner self-start md:self-auto">
                <button 
                  onClick={() => setViewMode('calendar')}
                  className={`px-5 py-2 rounded-xl text-xs font-[1000] uppercase tracking-widest transition-all duration-300 ${viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Сетка
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`px-5 py-2 rounded-xl text-xs font-[1000] uppercase tracking-widest transition-all duration-300 ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Список
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 w-full md:w-auto">
            <button 
              onClick={copyResults}
              className="col-span-2 md:col-span-1 md:flex-none px-6 py-3 bg-white text-slate-700 rounded-2xl hover:bg-slate-50 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-200 shadow-sm active:scale-95"
            >
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              Копировать
            </button>
            <a 
              href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
              target="_blank" rel="noreferrer"
              className="col-span-1 px-6 py-3 bg-[#229ED9] text-white rounded-2xl hover:bg-[#1d8dbf] hover:shadow-lg hover:shadow-blue-200 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95"
            >
              Telegram
            </a>
            <a 
              href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
              target="_blank" rel="noreferrer"
              className="col-span-1 px-6 py-3 bg-[#25D366] text-white rounded-2xl hover:bg-[#20bd5a] transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Sticky Participant Selection */}
      <div className="sticky top-[4.1rem] z-20 -mx-4 px-4 py-3 bg-gray-50/80 backdrop-blur-md border-b border-gray-200 mb-2">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <select 
              value={selectedParticipantId}
              onChange={(e) => setSelectedParticipantId(e.target.value)}
              className="w-full pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm appearance-none font-medium text-gray-700"
            >
              <option value="" disabled>Я в списке участников...</option>
              {participants && participants.map(p => (
                <option key={p.id} value={p.id}>{p.name || p.email}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          {!selectedParticipantId && (
            <form onSubmit={handleJoinAsGuest} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Или введите имя гостя" 
                value={guestName} 
                onChange={(e) => setGuestName(e.target.value)}
                className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
              />
              <button 
                type="submit"
                disabled={guestMutation.isPending}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-md disabled:opacity-50"
              >
                Ок
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Main Content: Calendar or List */}
      <div className="flex flex-col gap-8 pb-12">
        {event.status === 'confirmed' && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-2xl shadow-sm mb-6 flex items-start gap-4">
             <svg className="w-8 h-8 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             <div>
               <h3 className="text-xl font-bold text-blue-900 mb-1">Голосование завершено</h3>
               <p className="text-blue-700">Организатор зафиксировал финальное время встречи. Спасибо за участие!</p>
             </div>
          </div>
        )}

        {(!timeSlots || timeSlots.length === 0) ? (
           <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 font-medium">
             К сожалению, общих свободных слотов не найдено.
           </div>
        ) : (
          viewMode === 'calendar' ? (
            <VotingCalendar 
              eventId={id!} 
              participantId={selectedParticipantId}
              currentUserId={currentUserId}
              onVote={handleVote}
              proposedSlots={timeSlots}
              eventStatus={event.status}
            />
          ) : (
            Object.entries(groupedSlots).map(([date, slots]) => (
              <div key={date} className="flex flex-col gap-4">
                <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2 px-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  {date}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {slots.map(slot => (
                    <div 
                      key={slot.id} 
                      className={`relative bg-white rounded-xl border p-4 transition-all flex flex-col gap-4 ${
                        event.finalSlotId === slot.id ? 'border-blue-500 ring-2 ring-blue-200 shadow-xl' : 'border-gray-200 hover:border-blue-400 hover:shadow-lg'
                      }`}
                    >
                      {event.finalSlotId === slot.id && (
                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl rounded-tr-xl">
                          Финальный выбор
                        </div>
                      )}
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-xl font-bold text-gray-900 leading-tight">
                            {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-sm text-gray-500 font-medium">
                            до {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            slot.score === 100 ? 'bg-green-100 text-green-700' : 
                            (slot.score ?? 0) > 50 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {slot.score}% match
                          </span>
                          <button 
                            onClick={() => handleExport(slot.id)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors bg-gray-50 rounded-lg"
                            title="Добавить в календарь"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </button>
                        </div>
                      </div>

                      {/* Display Votes */}
                      {slot.votes && slot.votes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {slot.votes.map((v: any) => {
                            const p = participants.find((part) => part.id === v.participantId);
                            if (!p) return null;
                            const name = p.name || p.email?.split('@')[0] || 'Guest';
                            let bgColor = 'bg-gray-100 text-gray-600';
                            if (v.availability === 'preferred') bgColor = 'bg-yellow-100 text-yellow-700';
                            if (v.availability === 'available') bgColor = 'bg-green-100 text-green-700';
                            if (v.availability === 'unavailable') bgColor = 'bg-red-100 text-red-700 line-through';
                            
                            return (
                              <span key={v.id} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${bgColor}`} title={v.availability}>
                                {name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      
                      {event.status === 'planning' && (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleVote(slot.id, 'available')}
                              className="flex-1 py-2 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white rounded-lg transition-all font-bold text-xs"
                            >
                              OK
                            </button>
                            <button 
                              onClick={() => handleVote(slot.id, 'preferred')}
                              className="flex-1 py-2 bg-yellow-50 text-yellow-700 hover:bg-yellow-500 hover:text-white rounded-lg transition-all font-bold text-xs"
                            >
                              LOVE
                            </button>
                            <button 
                              onClick={() => handleVote(slot.id, 'unavailable')}
                              className="flex-1 py-2 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white rounded-lg transition-all font-bold text-xs"
                            >
                              NO
                            </button>
                          </div>
                          
                          {currentUserId && currentUserId === event.organizerId && (
                            <button
                              onClick={() => handleConfirmSlot(slot.id)}
                              className="w-full py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all font-bold text-xs shadow-sm"
                            >
                              ЗАФИКСИРОВАТЬ
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};
