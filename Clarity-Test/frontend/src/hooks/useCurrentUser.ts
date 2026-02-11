import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export interface User {
  id: number;
  email: string;
  name?: string;
  role: string;
}

async function fetchCurrentUser(): Promise<User> {
  const res = await api.get('/api/auth/me');
  const user = res.data;
  
  // Guardar en localStorage para uso offline
  try {
    localStorage.setItem('user', JSON.stringify(user));
  } catch {}
  
  return user;
}

export function useCurrentUser() {
  return useQuery<User>({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
    // Solo hacer query si hay token
    enabled: !!localStorage.getItem('token'),
    // Usar datos de localStorage como initial data
    placeholderData: () => {
      try {
        const cached = localStorage.getItem('user');
        return cached ? JSON.parse(cached) : undefined;
      } catch {
        return undefined;
      }
    }
  });
}
