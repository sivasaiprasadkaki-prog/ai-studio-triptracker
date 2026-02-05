
import React, { useState, useEffect } from 'react';
import { Theme } from '../types';
import { Sun, Moon, Wallet, User as UserIcon, Mail, Lock, ArrowRight, Loader2, ArrowLeft, CheckCircle2, ShieldCheck, AlertTriangle, Hourglass, Eye, EyeOff } from 'lucide-react';
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
  const [error, setError] = useState<{ message: string; type: 'rate' | 'auth' | 'general' | 'validation' } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const validatePassword = (pass: string) => {
    const hasCapital = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    const hasMinLength = pass.length >= 6; // Updated to 6 letters

    if (!hasMinLength) return "Password must be at least 6 characters long.";
    if (!hasCapital) return "Password must contain at least one capital letter.";
    if (!hasNumber) return "Password must contain at least one number.";
    if (!hasSpecial) return "Password must contain at least one special character.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (view === 'register' || view === 'update') {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        
        const passwordError = validatePassword(password);
        if (passwordError) {
          setError({ message: passwordError, type: 'validation' });
          setLoading(false);
          return;
        }
      }

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
      const msg = err.message?.toLowerCase() || '';
      if (msg.includes('rate limit')) {
        setError({ message: 'Security Limit: Too many requests. Please wait about 10 minutes.', type: 'rate' });
      } 
      else if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        setError({ message: 'Incorrect email or password.', type: 'auth' });
      }
      else if (msg === 'passwords do not match.') {
        setError({ message: 'The passwords you entered do not match.', type: 'validation' });
      }
      else {
        setError({ message: err.message || 'An unexpected error occurred.', type: 'general' });
      }
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
      {/* Dynamic Background elements for high-end feel */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <button 
        onClick={toggleTheme}
        className="absolute top-8 right-8 p-3 rounded-full bg-white dark:bg-slate-800 shadow-xl hover:scale-110 active:scale-95 transition-all z-50 border border-slate-200 dark:border-slate-700"
      >
        {theme === 'light' ? <Moon className="w-5 h-5 text-slate-700" /> : <Sun className="w-5 h-5 text-yellow-400" />}
      </button>

      <div className="w-full max-w-md perspective-1000">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-1000 relative z-10">
          <div className="p-8 sm:p-10">
            <div className="flex flex-col items-center mb-10 group">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/40 animate-bounce group-hover:rotate-12 transition-all duration-500">
                {view === 'update' ? <ShieldCheck className="w-10 h-10 text-white" /> : <Wallet className="w-10 h-10 text-white" />}
              </div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2 animate-in slide-in-from-bottom-2 duration-700">Trip Tracker</h1>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-center animate-in slide-in-from-bottom-3 duration-1000 delay-100">
                {view === 'login' && 'Secure access to your wealth records.'}
                {view === 'register' && 'Start managing your digital ledgers.'}
                {view === 'forgot' && 'Reset your password to regain access.'}
                {view === 'update' && 'Set your new secure password'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-2xl border-l-4 bg-red-50 dark:bg-red-900/10 border-red-500 text-red-700 dark:text-red-400 text-sm font-bold flex items-start gap-3 animate-in slide-in-from-left-4 duration-500">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error.message}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500 text-green-700 dark:text-green-400 text-sm font-bold rounded-2xl flex items-center gap-3 animate-in slide-in-from-left-4 duration-500">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {view === 'register' && (
                <div className="animate-in slide-in-from-top-4 duration-500 delay-100">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Full Name</label>
                  <div className="relative group/input">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold"
                      placeholder="Siva Sai"
                      required
                    />
                  </div>
                </div>
              )}
              
              {(view !== 'update') && (
                <div className="animate-in slide-in-from-top-4 duration-500 delay-200">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Email Address</label>
                  <div className="relative group/input">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold"
                      placeholder="example@gmail.com"
                      required
                    />
                  </div>
                </div>
              )}

              {view !== 'forgot' && (
                <div className="space-y-5">
                  <div className="animate-in slide-in-from-top-4 duration-500 delay-300">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">
                      {view === 'update' ? 'New Password' : 'Password'}
                    </label>
                    <div className="relative group/input">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-14 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold"
                        placeholder="••••••••"
                        required
                        minLength={view === 'login' ? 1 : 6}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {(view === 'register' || view === 'update') && (
                    <div className="animate-in slide-in-from-top-4 duration-500 delay-400">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">
                        Confirm Password
                      </label>
                      <div className="relative group/input">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`w-full pl-12 pr-14 py-4 rounded-2xl border-2 ${password && confirmPassword && password !== confirmPassword ? 'border-red-400' : 'border-slate-100 dark:border-slate-800'} dark:bg-slate-950 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold`}
                          placeholder="••••••••"
                          required
                          minLength={6}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {password && confirmPassword && password !== confirmPassword && (
                        <p className="text-[11px] text-red-500 font-black mt-2 ml-2 animate-pulse">Passwords do not match</p>
                      )}
                    </div>
                  )}

                  {view === 'login' && (
                    <div className="text-right animate-in fade-in duration-1000 delay-500">
                      <button 
                        type="button"
                        onClick={() => toggleView('forgot')}
                        className="text-xs font-black text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
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
                className="w-full relative overflow-hidden bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[1.5rem] shadow-2xl shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-3 mt-8 group disabled:opacity-70 animate-in slide-in-from-bottom-4 duration-700 delay-500"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <span>
                      {view === 'login' && 'Sign Into Tracker'}
                      {view === 'register' && 'Create Secure Account'}
                      {view === 'forgot' && 'Send Reset Link'}
                      {view === 'update' && 'Update Secure Password'}
                    </span>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {view !== 'login' && (
              <button 
                onClick={() => toggleView('login')}
                className="w-full flex items-center justify-center gap-3 mt-8 text-sm font-black text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all animate-in fade-in duration-1000"
              >
                <ArrowLeft className="w-5 h-5" /> Back to Login
              </button>
            )}
          </div>
          
          {(view === 'login' || view === 'register') && (
            <div className="bg-slate-50/50 dark:bg-slate-950/50 p-8 border-t border-slate-100 dark:border-slate-800 text-center animate-in slide-in-from-bottom-8 duration-1000">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {view === 'register' ? 'Already have an account?' : "New to digital ledgers?"}
                <button 
                  onClick={() => toggleView(view === 'register' ? 'login' : 'register')}
                  className="ml-3 text-blue-600 dark:text-blue-400 font-black hover:underline underline-offset-8 decoration-2"
                >
                  {view === 'register' ? 'Sign In' : 'Join Now'}
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
