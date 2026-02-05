
import React, { useState } from 'react';
import { User, Theme } from '../types';
import { Search, Sun, Moon, LogOut, Wallet, User as UserIcon, ChevronDown, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from './Modal';

interface HeaderProps {
  user: User;
  theme: Theme;
  toggleTheme: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onLogout: () => void;
  onUserUpdate: (user: Partial<User>) => void;
}

const Header: React.FC<HeaderProps> = ({ user, theme, toggleTheme, searchQuery, setSearchQuery, onLogout, onUserUpdate }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [newName, setNewName] = useState(user.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName === user.name) return;

    setIsUpdating(true);
    setUpdateSuccess(false);

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { name: newName.trim() }
      });

      if (error) throw error;

      onUserUpdate({ name: newName.trim() });
      setUpdateSuccess(true);
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setUpdateSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error('Update profile error:', err);
      alert('Failed to update profile: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent hidden sm:block font-black">
            Trip Tracker
          </h1>
        </div>

        <div className="flex-1 max-w-md mx-4 sm:mx-8">
          <div className={`relative flex items-center transition-all duration-300 ${isSearchExpanded ? 'scale-105' : ''}`}>
            <Search className="absolute left-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search ledgers..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchExpanded(true)}
              onBlur={() => setIsSearchExpanded(false)}
              className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:text-white font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black shadow-sm ring-2 ring-white dark:ring-slate-800">
                {getInitials(user.name)}
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProfileOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsProfileOpen(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-20 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 mb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signed in as</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsProfileModalOpen(true);
                      setIsProfileOpen(false);
                      setNewName(user.name);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors font-bold"
                  >
                    <UserIcon className="w-4 h-4" /> Profile Settings
                  </button>
                  <button 
                    onClick={onLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors font-bold"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isProfileModalOpen} 
        onClose={() => !isUpdating && setIsProfileModalOpen(false)} 
        title="Profile Settings"
      >
        <form onSubmit={handleUpdateProfile} className="p-8">
          <div className="mb-6 flex flex-col items-center">
            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-xl ring-4 ring-blue-50 dark:ring-slate-700 mb-4">
              {getInitials(newName || user.name)}
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{user.email}</p>
          </div>

          <div className="mb-8">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-1">Display Name</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                autoFocus
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isUpdating}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 dark:bg-slate-900 dark:text-white border-slate-100 dark:border-slate-700 outline-none focus:border-blue-500 transition-all shadow-inner font-bold disabled:opacity-50"
                placeholder="What should we call you?"
                required
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              type="button"
              disabled={isUpdating}
              onClick={() => setIsProfileModalOpen(false)} 
              className="flex-1 px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isUpdating || !newName.trim() || newName === user.name}
              className={`flex-1 px-4 py-4 rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 ${updateSuccess ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'}`}
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : updateSuccess ? <Check className="w-5 h-5" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </header>
  );
};

export default Header;
