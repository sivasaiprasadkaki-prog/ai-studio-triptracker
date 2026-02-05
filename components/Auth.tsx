
import React, { useState, useEffect } from 'react';
import { Theme } from '../types';
import { Sun, Moon, Wallet, User as UserIcon, Mail, Lock, Loader2, ArrowLeft, CheckCircle2, ShieldCheck, AlertTriangle, Eye, EyeOff } from 'lucide-react';
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; type: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetRedirectUrl = `${window.location.origin}/#/reset-password`;

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const validateEmail = (emailStr: string) => {
    return String(emailStr)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (view === 'register' || view === 'update') {
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
      }

      if (view === 'register') {
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name }, emailRedirectTo: window.location.origin }
        });
        if (err) throw err;
        setSuccessMsg('Success! Please verify your email.');
      } 
      else if (view === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      } 
      else if (view === 'forgot') {
        if (!validateEmail(email.trim())) {
          throw new Error("Please enter a valid email address.");
        }
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: resetRedirectUrl,
        });
        if (err) throw err;
        setSuccessMsg('Password reset link sent to your email');
      }
      else if (view === 'update') {
        const { error: err } = await supabase.auth.updateUser({
          password: password
        });
        if (err) throw err;
        setSuccessMsg('Password updated successfully! Redirecting...');
        setTimeout(() => {
          window.location.href = `${window.location.origin}/#/`;
        }, 2000);
      }
    } catch (err: any) {
      setError({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleView = (newView: AuthView) => {
    setError(null);
    setSuccessMsg(null);
    setPassword('');
    setConfirmPassword('');
    setView(newView);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 relative overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
      
      {/* Animated Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <button 
        onClick={toggleTheme} 
        className="fixed top-6 right-6 p-3 rounded-full bg-white dark:bg-slate-800 shadow-lg border dark:border-slate-700 hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        {theme === 'light' ? <Moon className="w-5 h-5 text-slate-700 group-hover:rotate-12 transition-transform" /> : <Sun className="w-5 h-5 text-yellow-400 group-hover:rotate-12 transition-transform" />}
      </button>

      <div className="w-full max-w-[440px] z-10 animate-in fade-in zoom-in-95 duration-700 ease-out">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.08)] border border-white dark:border-slate-800 overflow-hidden">
          
          <div className="px-8 sm:px-12 py-10">
            <div className="flex flex-col items-center mb-10">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-2xl shadow-blue-600/30 animate-float">
                {view === 'update' ? <ShieldCheck className="w-7 h-7 text-white" /> : <Wallet className="w-7 h-7 text-white" />}
              </div>
              <h1 className="text-3xl font-black dark:text-white tracking-tighter text-center staggered-item" style={{ animationDelay: '100ms' }}>Trip Tracker</h1>
              <p className="text-slate-400 font-bold text-[10px] mt-1 uppercase tracking-[0.2em] opacity-80 staggered-item" style={{ animationDelay: '200ms' }}>
                {view === 'login' && 'Secure Ledger Login'}
                {view === 'register' && 'Create Your Account'}
                {view === 'forgot' && 'Account Recovery'}
                {view === 'update' && 'Reset Your Password'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" /> <span>{error.message}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500 text-green-700 dark:text-green-400 text-xs font-bold rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {view === 'register' && (
                <div className="space-y-2 staggered-item" style={{ animationDelay: '300ms' }}>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 dark:bg-slate-950 dark:text-white dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none font-medium text-sm transition-all" placeholder="Enter your full name" required />
                  </div>
                </div>
              )}
              
              {(view === 'login' || view === 'register' || view === 'forgot') && (
                <div className="space-y-2 staggered-item" style={{ animationDelay: '400ms' }}>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 dark:bg-slate-950 dark:text-white dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none font-medium text-sm transition-all" placeholder="Enter your email" required />
                  </div>
                </div>
              )}

              {view !== 'forgot' && (
                <div className="space-y-5">
                  <div className="space-y-2 staggered-item" style={{ animationDelay: '500ms' }}>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">{view === 'update' ? 'New Password' : 'Password'}</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                      <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-14 py-3.5 rounded-xl border border-slate-200 dark:bg-slate-950 dark:text-white dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none font-medium text-sm transition-all" placeholder="Enter your password" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-blue-500 transition-colors">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                  
                  {(view === 'register' || view === 'update') && (
                    <div className="space-y-2 staggered-item" style={{ animationDelay: '600ms' }}>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Confirm Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                        <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-11 pr-14 py-3.5 rounded-xl border border-slate-200 dark:bg-slate-950 dark:text-white dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none font-medium text-sm transition-all" placeholder="Confirm your password" required />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-blue-500 transition-colors">{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                      </div>
                    </div>
                  )}
                  {view === 'login' && <div className="text-center staggered-item" style={{ animationDelay: '600ms' }}><button type="button" onClick={() => toggleView('forgot')} className="text-sm font-bold text-blue-500 hover:text-blue-600 transition-all hover:scale-105">Forgot password?</button></div>}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 font-bold py-4 rounded-xl border border-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.96] disabled:opacity-70 mt-2 shadow-sm hover:shadow-blue-500/20 staggered-item" style={{ animationDelay: '700ms' }}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="text-sm">{view === 'login' ? 'Login' : view === 'register' ? 'Sign Up' : view === 'forgot' ? 'Reset Password' : 'Update Password'}</span>}
              </button>
            </form>

            {(view === 'register' || view === 'forgot' || view === 'update') && (
              <button onClick={() => toggleView('login')} className="w-full flex items-center justify-center gap-2 mt-8 text-sm font-bold text-slate-400 hover:text-slate-600 transition-all hover:-translate-x-1"><ArrowLeft className="w-4 h-4" /> Back to Login</button>
            )}
          </div>

          {(view === 'login' || view === 'register') && (
            <div className="bg-slate-50/50 dark:bg-slate-950/50 p-8 border-t border-slate-100 dark:border-slate-800 text-center staggered-item" style={{ animationDelay: '800ms' }}>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {view === 'register' ? 'Already have an account?' : "Don't have an account?"}
                <button onClick={() => toggleView(view === 'register' ? 'login' : 'register')} className="ml-2 text-blue-500 font-bold hover:text-blue-600 transition-all hover:underline underline-offset-4">{view === 'register' ? 'Login' : 'Sign up'}</button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;