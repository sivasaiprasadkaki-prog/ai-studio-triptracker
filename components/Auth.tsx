
import React, { useState, useEffect } from 'react';
import { Theme } from '../types';
import { Sun, Moon, MapPin, User as UserIcon, Mail, Lock, ArrowRight, Loader2, ArrowLeft, CheckCircle2, ShieldCheck, AlertTriangle, Hourglass } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AuthView = 'login' | 'register' | 'forgot' | 'update';

interface LoginProps {
  theme: Theme;
  toggleTheme: () => void;
  initialView?: AuthView;
}

const Login: React.FC<LoginProps> = ({ theme, toggleTheme, initialView = 'login' }) => {
  const [view, setView] = useState<AuthView>(initialView);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; type: 'rate' | 'auth' | 'general' } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (view === 'register') {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { name }
          }
        });
        if (signUpError) throw signUpError;
        setSuccessMsg('Account created! Please check your email for a verification link.');
      } 
      else if (view === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        });
        if (signInError) throw signInError;
      } 
      else if (view === 'forgot') {
        // Fix for "Site can't be reached": 
        // Ensure origin is clean and uses HTTPS if applicable
        const cleanOrigin = window.location.origin.replace(/\/$/, '');
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${cleanOrigin}/`,
        });
        if (resetError) throw resetError;
        setSuccessMsg('Reset link sent! Please check your email (and spam folder) to update your password.');
      }
      else if (view === 'update') {
        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        });
        if (updateError) throw updateError;
        setSuccessMsg('Success! Your password has been updated. Logging you in...');
        setTimeout(() => {
          window.location.hash = ''; 
          window.location.reload(); 
        }, 2000);
      }
    } catch (err: any) {
      console.error('Auth Error Details:', err);
      
      const msg = err.message?.toLowerCase() || '';
      
      if (msg.includes('rate limit')) {
        setError({ 
          message: 'Security Limit: Too many requests. Please wait about 10 minutes before trying again.', 
          type: 'rate' 
        });
      } 
      else if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        setError({ 
          message: 'Incorrect email or password. Please double-check your credentials.', 
          type: 'auth' 
        });
      }
      else if (msg.includes('email not confirmed')) {
        setError({ 
          message: 'Email not confirmed. Please check your inbox for the activation link.', 
          type: 'auth' 
        });
      }
      else {
        setError({ 
          message: err.message || 'An unexpected error occurred. Please try again later.', 
          type: 'general' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleView = (newView: AuthView) => {
    setError(null);
    setSuccessMsg(null);
    setView(newView);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <button 
        onClick={toggleTheme}
        className="absolute top-8 right-8 p-3 rounded-full bg-white dark:bg-slate-800 shadow-lg hover:scale-110 transition-all z-50 border border-slate-200 dark:border-slate-700"
      >
        {theme === 'light' ? <Moon className="w-5 h-5 text-slate-700" /> : <Sun className="w-5 h-5 text-yellow-400" />}
      </button>

      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
          <div className="p-8">
            <div className="flex flex-col items-center mb-10">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-blue-500/20 rotate-3 hover:rotate-0 transition-transform duration-300">
                {view === 'update' ? <ShieldCheck className="w-8 h-8 text-white" /> : <MapPin className="w-8 h-8 text-white" />}
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Trip Tracker</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-center">
                {view === 'login' && 'Welcome back, explorer!'}
                {view === 'register' && 'Create your travel account'}
                {view === 'forgot' && 'Reset your password'}
                {view === 'update' && 'Set your new secure password'}
              </p>
            </div>

            {error && (
              <div className={`mb-6 p-4 rounded-r-xl border-l-4 flex items-start gap-3 animate-in slide-in-from-left-2 ${
                error.type === 'rate' 
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-800 dark:text-amber-400' 
                  : 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400'
              }`}>
                {error.type === 'rate' ? <Hourglass className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                <span className="text-sm font-bold leading-tight">{error.message}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-400 text-sm font-bold rounded-r-xl flex items-center gap-3 animate-in slide-in-from-left-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {view === 'register' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 ml-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Your Name"
                      required
                    />
                  </div>
                </div>
              )}
              
              {(view !== 'update') && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="explorer@trip.com"
                      required
                    />
                  </div>
                </div>
              )}

              {view !== 'forgot' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 ml-1">
                    {view === 'update' ? 'New Password' : 'Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                  {view === 'login' && (
                    <div className="text-right mt-2">
                      <button 
                        type="button"
                        onClick={() => toggleView('forgot')}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 group disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    {view === 'login' && 'Sign In'}
                    {view === 'register' && 'Create Account'}
                    {view === 'forgot' && 'Send Reset Link'}
                    {view === 'update' && 'Update Password'}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {view !== 'login' && (
              <button 
                onClick={() => toggleView('login')}
                className="w-full flex items-center justify-center gap-2 mt-6 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </button>
            )}
          </div>
          
          {(view === 'login' || view === 'register') && (
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-t border-slate-100 dark:border-slate-700 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {view === 'register' ? 'Already have an account?' : "Don't have an account?"}
                <button 
                  onClick={() => toggleView(view === 'register' ? 'login' : 'register')}
                  className="ml-2 text-blue-600 dark:text-blue-400 font-bold hover:underline underline-offset-4"
                >
                  {view === 'register' ? 'Sign In' : 'Sign Up Now'}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
