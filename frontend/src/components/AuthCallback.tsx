import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      // 1. Store the token securely
      localStorage.setItem('jwt_token', token);
      
      // 2. Redirect back to home or the page they were on
      navigate('/', { replace: true });
    } else {
      // Handle error scenario
      console.error('No token found in callback URL');
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <h2 className="text-xl font-medium text-gray-700">Завершение авторизации...</h2>
      <p className="text-gray-500 mt-2">Пожалуйста, подождите.</p>
    </div>
  );
}
