import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import './index.css';
import { KanbanBoard } from './components/KanbanBoard';
import { AuthPage } from './components/AuthPage';
import { supabase } from './lib/supabase';
import { syncTagsFromDB } from './store';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) void syncTagsFromDB();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void syncTagsFromDB();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) return (
    <div className="auth-loading">
      <div className="auth-loading__dot" />
    </div>
  );

  if (!user) return <AuthPage />;
  return <KanbanBoard />;
}
