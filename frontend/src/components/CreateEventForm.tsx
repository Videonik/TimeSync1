import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createEvent } from '../api';
import { jwtDecode } from 'jwt-decode';

export const CreateEventForm: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [buffer, setBuffer] = useState(0);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [participantsInput, setParticipantsInput] = useState('');
  
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUserId(decoded.sub);
      } catch (e) {
        console.error('Failed to parse token', e);
      }
    }
  }, []);

  const mutation = useMutation({
    mutationFn: (payload: { eventData: any, emails: string[] }) => createEvent(payload.eventData, payload.emails),
    onSuccess: (data) => {
      navigate(`/event/${data.id}`);
    },
    onError: (error: any) => {
      alert('Ошибка при создании встречи: ' + (error.response?.data?.message || error.message));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      alert('Пожалуйста, войдите через Яндекс/VK!');
      return;
    }

    const emails = participantsInput.split(',').map(email => email.trim()).filter(email => email !== '');
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    mutation.mutate({
      eventData: {
        title,
        durationMinutes: duration,
        bufferMinutes: buffer,
        dateRangeStart: start,
        dateRangeEnd: end,
        organizerId: userId,
        status: 'planning'
      },
      emails: emails
    });
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="bg-white rounded-[2rem] shadow-2xl shadow-blue-100 border border-gray-100 p-10 max-w-xl w-full">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Новая встреча</h2>
        <p className="text-gray-500">Заполните детали, чтобы запустить магию поиска времени.</p>
      </div>

      {/* Progress Bar */}
      <div className="flex justify-between items-center mb-10 relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 -translate-y-1/2 rounded-full">
           <div 
             className="h-full bg-blue-600 transition-all duration-300 rounded-full"
             style={{ width: `${((step - 1) / 2) * 100}%` }}
           ></div>
        </div>
        
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
              step >= i 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                : 'bg-white text-gray-300 border-2 border-gray-200'
            }`}
          >
            {i}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        {step === 1 && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Название встречи</label>
              <input 
                type="text" 
                placeholder="например, Еженедельный синк"
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                required
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-300"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Длительность</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700 appearance-none cursor-pointer"
                >
                  <option value={15}>15 минут</option>
                  <option value={30}>30 минут</option>
                  <option value={45}>45 минут</option>
                  <option value={60}>1 час</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Буфер</label>
                <select
                  value={buffer}
                  onChange={(e) => setBuffer(Number(e.target.value))}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700 appearance-none cursor-pointer"
                >
                  <option value={0}>Без буфера</option>
                  <option value={5}>5 минут</option>
                  <option value={10}>10 минут</option>
                  <option value={15}>15 минут</option>
                  <option value={30}>30 минут</option>
                </select>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={nextStep}
              disabled={!title}
              className="mt-4 w-full bg-gray-900 hover:bg-black text-white font-black py-4 px-4 rounded-[1.5rem] transition-all shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              Далее: Даты
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Начало</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  required
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Конец</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  required
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700"
                />
              </div>
            </div>
            
            <div className="flex gap-4 mt-4">
              <button 
                type="button"
                onClick={prevStep}
                className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 px-4 rounded-[1.5rem] transition-all"
              >
                Назад
              </button>
              <button 
                type="button"
                onClick={nextStep}
                disabled={!startDate || !endDate}
                className="w-2/3 bg-gray-900 hover:bg-black text-white font-black py-4 px-4 rounded-[1.5rem] transition-all shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                Далее: Участники
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Участники (email через запятую)</label>
              <div className="relative mb-2">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </span>
                <input 
                  type="text" 
                  placeholder="Поиск по добавленным..." 
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                />
              </div>
              <textarea 
                placeholder="alice@example.com, bob@example.com" 
                value={participantsInput} 
                onChange={(e) => setParticipantsInput(e.target.value)} 
                rows={3}
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-300 resize-none"
              />
              <p className="text-xs text-gray-400 ml-1 mt-1">Они получат уведомления, когда вы выберете финальное время.</p>
            </div>

            <div className="flex gap-4 mt-4">
              <button 
                type="button"
                onClick={prevStep}
                className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 px-4 rounded-[1.5rem] transition-all"
              >
                Назад
              </button>
              <button 
                type="submit"
                className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-4 rounded-[1.5rem] transition-all shadow-xl shadow-blue-100 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Создаем...' : 'Создать встречу'}
              </button>
            </div>
          </div>
        )}

      </form>
    </div>
  );
};
