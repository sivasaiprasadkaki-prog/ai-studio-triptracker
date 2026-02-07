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

    const trimmedEmail = email.trim();

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
        // 1. Detect existing user using signInWithPassword dummy check
        // This is a reliable way to check for account existence in certain Supabase configurations
        const { error: loginCheckError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: "dummy-password-check"
        });

        // 2. If the call returns "Invalid login credentials", the email already exists in Auth
        if (loginCheckError && loginCheckError.message.includes("Invalid login credentials")) {
          throw new Error("User already exists. Please login instead.");
        }

        // 3. Only proceed if the user check suggests the account doesn't exist
        const { error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: { name },
            emailRedirectTo: window.location.origin
          }
        });

        if (signUpError) {
          // 4. Handle standard Supabase Auth conflict responses
          if (
            signUpError.message.includes("User already registered") ||
            signUpError.message.includes("already registered") ||
            signUpError.status === 422
          ) {
            throw new Error("User already exists. Please login instead.");
          }
          throw signUpError;
        }

        setSuccessMsg("Success! Please verify your email.");
      } 
      else if (view === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password
        });

        if (err) {
          if (err.message.includes("Invalid login credentials")) {
            throw new Error("Invalid email or password. Please try again.");
          }
          throw err;
        }
      } 
      else if (view === 'forgot') {
        if (!validateEmail(trimmedEmail)) {
          throw new Error("Please enter a valid email address.");
        }

        const { error: err } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: resetRedirectUrl,
        });

        if (err) throw err;
        setSuccessMsg("Password reset link sent to your email");
      } 
      else if (view === 'update') {
        const { error: err } = await supabase.auth.updateUser({
          password: password
        });

        if (err) throw err;
        setSuccessMsg("Password updated successfully! Redirecting...");

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
      
      <div className="absolute top-0 -left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
      <div className="absolute top-0 -right-10 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>

      <button 
        onClick={toggleTheme} 
        className="fixed top-6 right-6 p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm border dark:border-slate-700 hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        {theme === 'light' ? <Moon className="w-4 h-4 text-slate-700 group-hover:rotate-12 transition-transform" /> : <Sun className="w-4 h-4 text-yellow-400 group-hover:rotate-12 transition-transform" />}
      </button>

      <div className="w-full max-w-[400px] z-10 animate-in fade-in zoom-in-95 duration-700 ease-out">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 overflow-hidden">
          
          <div className="p-8 sm:p-10">
            <div className="flex flex-col items-center mb-8">
              <h1 className="text-3xl font-bold text-blue-500 dark:text-blue-400 tracking-tight text-center staggered-item" style={{ animationDelay: '100ms' }}>TripTracker</h1>
              <p className="text-slate-400 font-medium text-sm mt-2 text-center staggered-item" style={{ animationDelay: '200ms' }}>
                {view === 'login' && 'Welcome back! Please login to continue.'}
                {view === 'register' && 'Join us to start tracking your trips.'}
                {view === 'forgot' && 'Reset your forgotten password.'}
                {view === 'update' && 'Choose a strong new password.'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> <span>{error.message}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/20 text-green-600 dark:text-green-400 text-xs font-medium rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {view === 'register' && (
                <div className="space-y-1.5 staggered-item" style={{ animationDelay: '300ms' }}>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 ml-0.5">Full Name</label>
                  <div className="relative group">
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:bg-slate-950 dark:text-white dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none font-medium text-sm transition-all" placeholder="Enter your full name" required />
                  </div>
                </div>
              )}
              
              {(view === 'login' || view === 'register' || view === 'forgot') && (
                <div className="space-y-1.5 staggered-item" style={{ animationDelay: '400ms' }}>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 ml-0.5">Email</label>
                  <div className="relative group">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:bg-slate-950 dark:text-white dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none font-medium text-sm transition-all" placeholder="Enter your email" required />
                  </div>
                </div>
              )}

              {view !== 'forgot' && (
                <div className="space-y-4">
                  <div className="space-y-1.5 staggered-item" style={{ animationDelay: '500ms' }}>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 ml-0.5">{view === 'update' ? 'New Password' : 'Password'}</label>
                    <div className="relative group">
                      <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:bg-slate-950 dark:text-white dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none font-medium text-sm transition-all pr-10" placeholder="Enter your password" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                  
                  {(view === 'register' || view === 'update') && (
                    <div className="space-y-1.5 staggered-item" style={{ animationDelay: '600ms' }}>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 ml-0.5">Confirm Password</label>
                      <div className="relative group">
                        <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:bg-slate-950 dark:text-white dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none font-medium text-sm transition-all pr-10" placeholder="Confirm your password" required />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors">{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 font-bold py-2.5 rounded-lg border border-blue-500/10 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 mt-2 staggered-item" style={{ animationDelay: '700ms' }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-sm">{view === 'login' ? 'Login' : view === 'register' ? 'Sign Up' : view === 'forgot' ? 'Reset Password' : 'Update Password'}</span>}
              </button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-3 staggered-item" style={{ animationDelay: '800ms' }}>
              {view === 'login' && (
                <button type="button" onClick={() => toggleView('forgot')} className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-all">Forgot password?</button>
              )}
              
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {view === 'login' ? "Don't have an account?" : "Already have an account?"}
                <button onClick={() => toggleView(view === 'login' ? 'register' : 'login')} className="ml-1 text-blue-500 font-bold hover:text-blue-600 transition-all">{view === 'login' ? 'Sign up' : 'Login'}</button>
              </p>

              {(view === 'forgot' || view === 'update') && (
                <button onClick={() => toggleView('login')} className="flex items-center gap-2 mt-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-all"><ArrowLeft className="w-3 h-3" /> Back to Login</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;