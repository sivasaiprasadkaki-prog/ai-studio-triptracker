
import React, { useState, useEffect } from 'react';
import { Theme, User } from './types';
import Login from './components/Auth';
import Dashboard from './components/Dashboard';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }

    // Direct check for recovery token in URL hash
    const checkRecovery = () => {
      const hash = window.location.hash;
      if (hash && (hash.includes('type=recovery') || hash.includes('access_token='))) {
        setIsRecovering(true);
      }
    };

    checkRecovery();

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser({
          name: session.user.user_metadata.name || session.user.email?.split('@')[0] || 'Traveler',
          email: session.user.email || '',
          avatar: ''
        });
        setIsLoggedIn(true);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true);
      } else if (session) {
        setUser({
          name: session.user.user_metadata.name || session.user.email?.split('@')[0] || 'Traveler',
          email: session.user.email || '',
          avatar: ''
        });
        setIsLoggedIn(true);
        setIsRecovering(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoggedIn(false);
        setIsRecovering(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show Auth screen if not logged in OR if in password recovery mode
  if (!isLoggedIn || isRecovering) {
    return (
      <Login 
        theme={theme} 
        toggleTheme={toggleTheme} 
        initialView={isRecovering ? 'update' : 'login'} 
      />
    );
  }

  return (
    <div className={theme}>
      <Dashboard 
        user={user!} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        onLogout={handleLogout}
      />
    </div>
  );
};

export default App;
