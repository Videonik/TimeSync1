import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getUserEvents, deleteEvent } from '../api';
import { jwtDecode } from 'jwt-decode';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
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

  useEffect(() => {
    if (!userId) {
      const token = localStorage.getItem('jwt_token');
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          setUserId(decoded.sub);
          localStorage.setItem('userId', decoded.sub);
        } catch (e) {
          console.error('Failed to parse token', e);
        }
      }
    }
  }, [userId]);

  const { data: events, isLoading } = useQuery({
    queryKey: ['userEvents', userId],
    queryFn: () => getUserEvents(userId!),
    enabled: !!userId,
  });

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Пожалуйста, войдите</h2>
        <p className="text-gray-500 max-w-xs mb-8">Для просмотра ваших встреч необходимо авторизоваться через Яндекс или VK.</p>
      </div>
    );
  }

  if (isLoading) return (
    <div className="w-full max-w-4xl py-12">
      <div className="animate-pulse flex flex-col gap-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {[1,2,3,4].map(i => <div key={i} className="h-40 bg-gray-200 rounded-2xl"></div>)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-5xl py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Мои встречи</h2>
          <p className="text-gray-500 mt-1">Управляйте вашими опросами и запланированными событиями.</p>
        </div>
        <Link 
          to="/create" 
          className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Создать новую
        </Link>
      </div>

      {(!events || events.length === 0) ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 py-20 text-center px-6">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">У вас пока нет встреч</h3>
          <p className="text-gray-500 mb-8">Создайте свой первый опрос, чтобы найти идеальное время для всех.</p>
          <Link to="/create" className="text-blue-600 font-bold hover:underline">Запланировать встречу &rarr;</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map(event => (
            <Link 
              key={event.id} 
              to={`/event/${event.id}`}
              className="group bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {event.title}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    event.status === 'planning' ? 'bg-green-100 text-green-700' : 
                    event.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {event.status === 'planning' ? 'Планируется' : 
                     event.status === 'confirmed' ? 'Завершено' : event.status}
                  </span>
                </div>
                <div className="flex flex-col gap-2 text-sm text-gray-500 mb-6">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span>{new Date(event.dateRangeStart).toLocaleDateString()} — {new Date(event.dateRangeEnd).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Длительность: {event.durationMinutes} мин</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                 <span className="text-xs font-medium text-blue-600 group-hover:translate-x-1 transition-transform">Перейти к голосованию &rarr;</span>
                 <div className="flex items-center gap-2">
                   {event.organizerId === userId && (
                     <button
                       onClick={(e) => {
                         e.preventDefault();
                         if (confirm('Удалить эту встречу навсегда?')) {
                           deleteEvent(event.id).then(() => {
                             queryClient.invalidateQueries({ queryKey: ['userEvents', userId] });
                           }).catch(_err => alert('Ошибка при удалении'));
                         }
                       }}
                       className="text-[10px] text-red-500 font-bold bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors z-10 relative"
                     >
                       Удалить
                     </button>
                   )}
                   {event.organizerId === userId && (
                     <span className="text-[10px] text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-lg">Организатор</span>
                   )}
                 </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
