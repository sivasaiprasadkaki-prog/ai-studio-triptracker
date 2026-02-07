
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Theme, User } from './types';
import Login from './components/Auth';
import Dashboard from './components/Dashboard';
import TripTrackerLoader from './components/TripTrackerLoader';
import { supabase } from './lib/supabase';
import { LoadingProvider, useLoading } from './context/LoadingContext';

const AppContent: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [user, setUser] = useState<User | null>(null);
  const { isLoading, showLoading, hideLoading } = useLoading();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'light';
      setTheme(initialTheme);
      document.documentElement.classList.toggle('dark', initialTheme === 'dark');
    }

    // Use global loader for initial auth check
    showLoading();
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser({
          name: session.user.user_metadata.name || session.user.email?.split('@')[0] || 'Traveler',
          email: session.user.email || '',
          avatar: ''
        });
        setIsLoggedIn(true);
      }
      setIsAuthChecking(false);
      hideLoading();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser({
          name: session.user.user_metadata.name || session.user.email?.split('@')[0] || 'Traveler',
          email: session.user.email || '',
          avatar: ''
        });
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
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
    showLoading();
    await supabase.auth.signOut();
    hideLoading();
  };

  const handleUserUpdate = (updatedUser: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updatedUser } : null);
  };

  return (
    <div className={theme}>
      {isLoading && <TripTrackerLoader />}
      <Routes>
        <Route 
          path="/" 
          element={
            isLoggedIn ? (
              <Dashboard 
                user={user!} 
                theme={theme} 
                toggleTheme={toggleTheme} 
                onLogout={handleLogout}
                onUserUpdate={handleUserUpdate}
              />
            ) : (
              <Login 
                theme={theme} 
                toggleTheme={toggleTheme} 
                initialView="login" 
              />
            )
          } 
        />
        <Route 
          path="/reset-password" 
          element={
            <Login 
              theme={theme} 
              toggleTheme={toggleTheme} 
              initialView="update" 
            />
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LoadingProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </LoadingProvider>
  );
};

export default App;
