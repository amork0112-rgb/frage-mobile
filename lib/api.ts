import { supabase } from './supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!API_BASE) throw new Error('Missing EXPO_PUBLIC_API_BASE_URL');

  const token = await getAccessToken();
  if (!token) throw new Error('No session token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string> || {}),
  };

  return fetch(`${API_BASE}${path}`, { ...options, headers });
}
