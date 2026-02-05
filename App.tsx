
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

    const checkUrlState = () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname;
      
      // Strict check for recovery markers or the specific route /reset-password
      const isRecovery = hash.includes('type=recovery') || 
                         hash.includes('access_token=') || 
                         params.get('type') === 'recovery' ||
                         hash.includes('recovery') ||
                         pathname === '/reset-password';
                         
      if (isRecovery) {
        setIsRecovering(true);
      }
    };

    checkUrlState();

    // Check current session immediately
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

    // Listen for all auth events
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
        setIsRecovering(false); // If we have a session, we are no longer "recovering"
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

  const handleUserUpdate = (updatedUser: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updatedUser } : null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If the user is on /reset-password or has a recovery token, show the Update view
  if (isRecovering) {
    return (
      <Login 
        theme={theme} 
        toggleTheme={toggleTheme} 
        initialView="update" 
      />
    );
  }

  // Normal flow: check login status
  if (!isLoggedIn) {
    return (
      <Login 
        theme={theme} 
        toggleTheme={toggleTheme} 
        initialView="login" 
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
        onUserUpdate={handleUserUpdate}
      />
    </div>
  );
};

export default App;
