import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile } from '../api';

export const Profile: React.FC = () => {
  const queryClient = useQueryClient();
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('18:00');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: getProfile,
  });

  useEffect(() => {
    if (profile) {
      setTimezone(profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      setWorkingHoursStart(profile.workingHoursStart || '09:00');
      setWorkingHoursEnd(profile.workingHoursEnd || '18:00');
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: (data: any) => updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      alert('Профиль успешно обновлен!');
    },
    onError: (error: any) => {
      alert('Ошибка при обновлении профиля: ' + (error.response?.data?.message || error.message));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ timezone, workingHoursStart, workingHoursEnd });
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    window.location.href = '/';
  };

  if (isLoading) return <div className="text-center py-10 text-gray-500">Загрузка профиля...</div>;

  if (!profile) return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Пожалуйста, войдите</h2>
      <p className="text-gray-500 mb-8">Для настройки профиля необходимо авторизоваться.</p>
    </div>
  );

  return (
    <div className="w-full max-w-2xl py-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Настройки профиля</h2>
          <p className="text-gray-500 mt-1">Управляйте вашими рабочими часами и часовым поясом.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-bold text-sm"
        >
          Выйти
        </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold overflow-hidden">
             {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Avatar" /> : (profile.name ? profile.name[0] : 'U')}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{profile.name || 'Пользователь'}</h3>
            <p className="text-gray-500">{profile.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Часовой пояс</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-900 appearance-none"
            >
               {/* Just a few common options for simplicity, in a real app use a full IANA list */}
               <option value="Europe/Moscow">Москва (UTC+3)</option>
               <option value="Europe/Kaliningrad">Калининград (UTC+2)</option>
               <option value="Europe/Samara">Самара (UTC+4)</option>
               <option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option>
               <option value="Asia/Omsk">Омск (UTC+6)</option>
               <option value="Asia/Krasnoyarsk">Красноярск (UTC+7)</option>
               <option value="Asia/Irkutsk">Иркутск (UTC+8)</option>
               <option value="Asia/Yakutsk">Якутск (UTC+9)</option>
               <option value="Asia/Vladivostok">Владивосток (UTC+10)</option>
               <option value="Asia/Magadan">Магадан (UTC+11)</option>
               <option value="Asia/Kamchatka">Камчатка (UTC+12)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Начало рабочих часов</label>
              <input 
                type="time" 
                value={workingHoursStart}
                onChange={(e) => setWorkingHoursStart(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Конец рабочих часов</label>
              <input 
                type="time" 
                value={workingHoursEnd}
                onChange={(e) => setWorkingHoursEnd(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-900"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-2 px-1">
            Эти часы используются по умолчанию при планировании новых встреч, чтобы не предлагать вам время глубокой ночью.
          </p>

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-md mt-2 disabled:opacity-50"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </form>
      </div>
    </div>
  );
};
