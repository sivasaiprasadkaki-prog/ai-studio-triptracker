
import React, { useState, useEffect } from 'react';
import { Theme } from '../types';
import { Sun, Moon, Wallet, User as UserIcon, Mail, Lock, Loader2, ArrowLeft, CheckCircle2, ShieldCheck, AlertTriangle, Eye, EyeOff, Copy, Settings2 } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

  // Dynamically determine the redirect URL based on current environment
  const resetRedirectUrl = `${window.location.origin}/reset-password`;

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

  const copyUrl = () => {
    navigator.clipboard.writeText(resetRedirectUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        // Use dynamic URL to prevent "Site can't be reached" errors in different environments
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
        
        setSuccessMsg('Password updated successfully! Redirecting to login...');
        
        setTimeout(() => {
          window.history.replaceState({}, '', '/');
          window.location.hash = '';
          window.location.reload();
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
    <div className={`min-h-screen flex items-center justify-center p-4 transition-all duration-700 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <button onClick={toggleTheme} className="absolute top-8 right-8 p-3 rounded-full bg-white dark:bg-slate-800 shadow-xl border dark:border-slate-700 hover:scale-110 active:scale-95 transition-all z-50">
        {theme === 'light' ? <Moon className="w-5 h-5 text-slate-700" /> : <Sun className="w-5 h-5 text-yellow-400" />}
      </button>

      <div className="w-full max-w-[500px]">
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] border dark:border-slate-800 aspect-square flex flex-col justify-center relative animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
          
          <div className="px-8 sm:px-12 py-10">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-2xl shadow-blue-500/40">
                {view === 'update' ? <ShieldCheck className="w-8 h-8 text-white" /> : <Wallet className="w-8 h-8 text-white" />}
              </div>
              <h1 className="text-3xl font-black dark:text-white tracking-tighter">Trip Tracker</h1>
              <p className="text-slate-500 font-bold text-sm mt-1">
                {view === 'login' && 'Secure Ledger Login'}
                {view === 'register' && 'Create Your Account'}
                {view === 'forgot' && 'Account Recovery'}
                {view === 'update' && 'Reset Your Password'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-[10px] font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> <span>{error.message}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {view === 'register' && (
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 dark:bg-slate-950 dark:text-white border-slate-100 dark:border-slate-800 focus:border-blue-500 outline-none font-bold text-sm" placeholder="Full Name" required />
                </div>
              )}
              
              {(view === 'login' || view === 'register' || view === 'forgot') && (
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 dark:bg-slate-950 dark:text-white border-slate-100 dark:border-slate-800 focus:border-blue-500 outline-none font-bold text-sm" placeholder="Email Address" required />
                </div>
              )}

              {view !== 'forgot' && (
                <div className="space-y-3.5">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-14 py-4 rounded-2xl border-2 dark:bg-slate-950 dark:text-white border-slate-100 dark:border-slate-800 focus:border-blue-500 outline-none font-bold text-sm" placeholder={view === 'update' ? "New Password" : "Password"} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                  {(view === 'register' || view === 'update') && (
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-11 pr-14 py-4 rounded-2xl border-2 dark:bg-slate-950 dark:text-white border-slate-100 dark:border-slate-800 focus:border-blue-500 outline-none font-bold text-sm" placeholder="Confirm Password" required />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400">{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  )}
                  {view === 'login' && <div className="text-right"><button type="button" onClick={() => toggleView('forgot')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Forgot Password?</button></div>}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-95">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="text-sm uppercase tracking-wider">{view === 'login' ? 'Sign In' : view === 'register' ? 'Register' : view === 'forgot' ? 'Send Recovery Link' : 'Submit New Password'}</span>}
              </button>
            </form>

            {view === 'forgot' && (
              <div className="mt-8 p-5 bg-blue-50/50 dark:bg-slate-950 rounded-3xl border border-blue-100 dark:border-slate-800 animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Settings2 className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Supabase Config</p>
                </div>
                <p className="text-[9px] text-slate-400 mb-4 leading-relaxed font-bold">
                  Copy this URL and add it to your Supabase Dashboard <strong>"Redirect URLs"</strong>:
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <code className="text-[10px] font-mono text-blue-600 font-black flex-1 truncate">{resetRedirectUrl}</code>
                    <button onClick={copyUrl} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-all active:scale-95">
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span className="text-[9px] font-black text-slate-500">{copied ? 'COPIED' : 'COPY'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(view === 'register' || view === 'forgot' || view === 'update') && (
              <button onClick={() => toggleView('login')} className="w-full flex items-center justify-center gap-2 mt-6 text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest"><ArrowLeft className="w-4 h-4" /> Back to Login</button>
            )}
          </div>

          {(view === 'login' || view === 'register') && (
            <div className="absolute bottom-0 left-0 right-0 bg-slate-50/50 dark:bg-slate-950/50 p-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {view === 'register' ? 'Already have an account?' : "New here?"}
                <button onClick={() => toggleView(view === 'register' ? 'login' : 'register')} className="ml-2 text-blue-600 hover:underline">{view === 'register' ? 'Sign In' : 'Create Account'}</button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
