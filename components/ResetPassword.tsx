
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Theme } from '../types';
import { Loader2, CheckCircle2, AlertTriangle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useLoading } from '../context/LoadingContext';

interface ResetPasswordProps {
  theme: Theme;
  toggleTheme: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ theme, toggleTheme }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    // Extract tokens from hash. 
    // Since we use HashRouter, the URL looks like: #/reset-password#access_token=...
    const hash = window.location.hash;
    const hashParts = hash.split('#');
    // The tokens are usually in the last part after the routing hash
    const paramsString = hashParts.length > 2 ? hashParts[hashParts.length - 1] : (hashParts[1]?.includes('=') ? hashParts[1] : '');
    
    const hashParams = new URLSearchParams(paramsString);
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).catch(() => {
        setError("Invalid or expired reset link.");
      });
    } else {
      // Fallback: check if we already have an active session (sometimes handled by onAuthStateChange)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setError("Invalid or expired reset link.");
        }
      });
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    showLoading();
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setSuccess(true);
      // Log out after success to force them to login with new password
      await supabase.auth.signOut();
      
      setTimeout(() => {
        window.location.hash = '/';
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
      hideLoading();
    }
  };

  const isInvalidLink = error === "Invalid or expired reset link.";

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 relative overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* Background blobs for premium feel */}
      <div className="absolute top-0 -left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
      <div className="absolute top-0 -right-10 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-[400px] z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-8 sm:p-10">
            <div className="flex flex-col items-center mb-8">
              <h1 className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">New Password</h1>
              <p className="text-slate-400 font-medium text-sm mt-2 text-center">
                {isInvalidLink ? "This recovery session is no longer active." : "Set a strong new password for your TripTracker account."}
              </p>
            </div>

            {error && !isInvalidLink && (
              <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> <span>{error}</span>
              </div>
            )}

            {isInvalidLink ? (
              <div className="text-center py-6 space-y-6 animate-in fade-in zoom-in-95">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-600">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white">Link Expired</h2>
                  <p className="text-sm text-slate-500 mt-1 font-medium">Reset links are valid for a limited time. Please request a new one.</p>
                </div>
                <button 
                  onClick={() => window.location.hash = '/'}
                  className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-4 rounded-2xl transition-all"
                >
                  Return to Login
                </button>
              </div>
            ) : success ? (
              <div className="text-center py-6 space-y-6 animate-in fade-in zoom-in-95">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white">Success!</h2>
                  <p className="text-sm text-slate-500 mt-1 font-medium">Your password has been updated. Redirecting to login...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">New Password</label>
                  <div className="relative group">
                    <input 
                      autoFocus
                      type={showPassword ? "text" : "password"} 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-950 dark:text-white dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none font-bold text-sm transition-all pr-12 shadow-inner" 
                      placeholder="Enter new password" 
                      required 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Confirm Password</label>
                  <div className="relative group">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-950 dark:text-white dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none font-bold text-sm transition-all pr-12 shadow-inner" 
                      placeholder="Repeat new password" 
                      required 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 mt-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
                </button>

                <button 
                  type="button" 
                  onClick={() => window.location.hash = '/'}
                  className="w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-colors mt-4"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to Login
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
