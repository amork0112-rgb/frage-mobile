import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Redirect will be handled by index.tsx
          router.replace('/');
        } else if (event === 'SIGNED_OUT') {
          router.replace('/auth/login');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <Slot />;
}
