import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

export function useCurrentSession() {
  const client = useQueryClient();
  const previousUserId = useRef<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        previousUserId.current = data.session?.user.id ?? null;
        setLoading(false);
      }
    });
    const listener = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null;
      if (!nextUserId || (previousUserId.current && previousUserId.current !== nextUserId)) client.removeQueries();
      previousUserId.current = nextUserId;
      setSession(nextSession);
    });
    return () => { active = false; listener.data.subscription.unsubscribe(); };
  }, []);

  return { session, loading };
}
