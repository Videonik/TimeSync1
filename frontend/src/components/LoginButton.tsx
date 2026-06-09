import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../api';

export function LoginButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Basic check for token existence
    const token = localStorage.getItem('jwt_token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/yandex`;
  };

  const handleVkLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/vkontakte`;
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    setIsLoggedIn(false);
    window.location.reload();
  };

  if (isLoggedIn) {
    return (
      <button 
        onClick={handleLogout}
        className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors ml-4"
      >
        Выйти
      </button>
    );
  }

  return (
    <div className="flex gap-2 ml-4">
      <button
        onClick={handleLogin}
        className="px-4 py-2 bg-[#ffcc00] hover:bg-[#ffdb4d] text-black text-sm font-medium rounded-md shadow-sm transition-colors flex items-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.61863 15.864C8.61863 15.864 12.0626 15.864 12.6366 15.864C13.2106 15.864 13.7846 15.29 13.7846 14.716V1.51602C13.7846 0.942021 13.2106 0.368021 12.6366 0.368021C12.0626 0.368021 8.61863 0.368021 8.61863 0.368021V3.23802C8.61863 3.23802 10.9146 3.23802 10.9146 5.53402V10.702C10.9146 12.998 8.61863 12.998 8.61863 12.998V15.864Z" fill="black"/>
          <path d="M7.38092 0.368021C7.38092 0.368021 3.93692 0.368021 3.36292 0.368021C2.78892 0.368021 2.21492 0.942021 2.21492 1.51602V14.716C2.21492 15.29 2.78892 15.864 3.36292 15.864C3.93692 15.864 7.38092 15.864 7.38092 15.864V12.994C7.38092 12.994 5.08492 12.994 5.08492 10.698V5.53002C5.08492 3.23402 7.38092 3.23402 7.38092 3.23402V0.368021Z" fill="#F03D25"/>
        </svg>
        Yandex
      </button>
      <button
        onClick={handleVkLogin}
        className="px-4 py-2 bg-[#0077FF] hover:bg-[#005bb5] text-white text-sm font-medium rounded-md shadow-sm transition-colors flex items-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.072 2h-6.144C4.93 2 2 4.93 2 8.928v6.144C2 19.07 4.93 22 8.928 22h6.144c4 0 6.928-2.93 6.928-6.928V8.928C22 4.93 19.072 2 15.072 2zM17.485 15.403c.535.535.535 1.403 0 1.938-.535.535-1.403.535-1.938 0l-1.547-1.547c-.535-.535-.535-1.403 0-1.938.535-.535 1.403-.535 1.938 0l1.547 1.547zM12 14.5c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zm5.485-6.903l-1.547 1.547c-.535.535-1.403.535-1.938 0-.535-.535-.535-1.403 0-1.938l1.547-1.547c.535-.535 1.403-.535 1.938 0 .535.535.535 1.403 0 1.938z"/>
        </svg>
        VK
      </button>
    </div>
  );
}
