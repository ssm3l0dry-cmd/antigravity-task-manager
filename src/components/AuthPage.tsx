import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setSubmitting(false);
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError('');
  };

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <div className="auth-card__logo">
          <Zap size={22} color="#580000" />
          <span>JRZ</span>
        </div>

        <h1 className="auth-card__title">
          {mode === 'login' ? 'Sign in to your workspace' : 'Create account'}
        </h1>
        <p className="auth-card__sub">
          {mode === 'login' ? 'Sign in to your task board' : 'Start managing your tasks'}
        </p>

        <form onSubmit={handleSubmit} className="auth-card__form">
          <div className="auth-card__field">
            <label className="auth-card__label" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="auth-card__input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <div className="auth-card__field">
            <label className="auth-card__label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="auth-card__input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && <p className="auth-card__error">{error}</p>}

          <motion.button
            type="submit"
            className="auth-card__submit"
            disabled={submitting}
            whileHover={!submitting ? { scale: 1.02 } : {}}
            whileTap={!submitting ? { scale: 0.98 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {submitting ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
          </motion.button>
        </form>

        <p className="auth-card__switch">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          {' '}
          <button className="auth-card__switch-btn" onClick={switchMode}>
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
