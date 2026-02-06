
import React, { useState, useEffect, useMemo } from 'react';
import { Ledger, User, Theme, Entry, Attachment } from '../types';
import Header from './Header';
import LedgerCard from './LedgerCard';
import LedgerDetails from './LedgerDetails';
import Modal from './Modal';
import { Plus, LayoutGrid, List, Wallet, Trash2, Loader2, Sparkles, ReceiptText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  user: User;
  theme: Theme;
  toggleTheme: () => void;
  onLogout: () => void;
  onUserUpdate: (user: Partial<User>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, theme, toggleTheme, onLogout, onUserUpdate }) => {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [activeLedgerId, setActiveLedgerId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newLedgerName, setNewLedgerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ledgersData, error: ledgersError } = await supabase
        .from('ledgers')
        .select(`
          *,
          entries (*)
        `)
        .order('created_at', { ascending: false });

      if (ledgersError) throw ledgersError;
      
      const formattedLedgers: Ledger[] = (ledgersData || []).map(l => ({
        id: l.id,
        name: l.name,
        createdAt: new Date(l.created_at).getTime(),
        entries: (l.entries || []).map((e: any) => ({
          ...e,
          dateTime: e.date_time
        })).sort((a: any, b: any) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
      }));

      setLedgers(formattedLedgers);
    } catch (err: any) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeLedger = useMemo(() => 
    ledgers.find(l => l.id === activeLedgerId), 
    [ledgers, activeLedgerId]
  );

  const filteredLedgers = useMemo(() => {
    return ledgers.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [ledgers, searchQuery]);

  const uploadAttachments = async (attachments: Attachment[], userId: string): Promise<Attachment[]> => {
    if (!attachments || attachments.length === 0) return [];
    
    return Promise.all(attachments.map(async (att) => {
      // Only upload if it has data (base64) and hasn't been uploaded yet
      if (att.data && att.data.startsWith('data:') && !att.file_path) {
        try {
          const res = await fetch(att.data);
          const blob = await res.blob();
          const fileExt = att.file_type.split('/')[1] || 'png';
          const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
          
          const { data, error } = await supabase.storage
            .from('triptracker-files')
            .upload(fileName, blob, { contentType: att.file_type });

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from('triptracker-files')
            .getPublicUrl(data.path);

          return {
            ...att,
            file_path: data.path,
            url: publicUrl,
            data: '' // Remove base64 after upload to minimize DB footprint
          };
        } catch (err) {
          console.error("Failed to upload attachment:", att.file_name, err);
          return att;
        }
      }
      return att;
    }));
  };

  const handleCreateLedger = async () => {
    if (!newLedgerName.trim()) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No authenticated user found.");

      const { data, error } = await supabase
        .from('ledgers')
        .insert([{ 
          name: newLedgerName,
          user_id: userData.user.id
        }])
        .select()
        .single();

      if (error) throw error;

      const newLedger: Ledger = {
        id: data.id,
        name: data.name,
        createdAt: new Date(data.created_at).getTime(),
        entries: []
      };
      
      setLedgers(prev => [newLedger, ...prev]);
      setNewLedgerName('');
      setIsCreateModalOpen(false);
    } catch (err: any) {
      console.error('Create error:', err);
      alert('Failed to create ledger: ' + err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmationId) return;
    setIsDeleting(true);
    try {
      const { error: entriesError } = await supabase
        .from('entries')
        .delete()
        .eq('ledger_id', deleteConfirmationId);

      if (entriesError) throw entriesError;

      const { error: ledgerError } = await supabase
        .from('ledgers')
        .delete()
        .eq('id', deleteConfirmationId);

      if (ledgerError) throw ledgerError;

      setLedgers(prev => prev.filter(l => l.id !== deleteConfirmationId));
      if (activeLedgerId === deleteConfirmationId) setActiveLedgerId(null);
      setDeleteConfirmationId(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Delete failed. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateLedger = async (id: string, newName: string, createdAt?: number) => {
    try {
      const updateData: any = { name: newName };
      if (createdAt) updateData.created_at = new Date(createdAt).toISOString();

      const { error } = await supabase
        .from('ledgers')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setLedgers(prev => prev.map(l => l.id === id ? { ...l, name: newName, createdAt: createdAt ?? l.createdAt } : l));
    } catch (err: any) {
      console.error('Update error:', err);
    }
  };

  const handleAddEntry = async (ledgerId: string, entry: Entry) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // Upload files to storage first
      const updatedAttachments = await uploadAttachments(entry.attachments, userId);

      const { data, error } = await supabase
        .from('entries')
        .insert([{
          ledger_id: ledgerId,
          user_id: userId,
          type: entry.type,
          date_time: entry.dateTime,
          details: entry.details,
          amount: entry.amount,
          category: entry.category,
          mode: entry.mode,
          attachments: updatedAttachments
        }])
        .select()
        .single();

      if (error) {
        console.error("Supabase error during entry addition:", error);
        throw error;
      }

      const newEntry: Entry = { ...data, dateTime: data.date_time };
      setLedgers(prev => prev.map(l => 
        l.id === ledgerId ? { 
          ...l, 
          entries: [...l.entries, newEntry].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()) 
        } : l
      ));
    } catch (err: any) {
      console.error('Entry add error:', err);
      alert('Error adding entry: ' + (err.message || 'Check RLS policies.'));
    }
  };

  const handleDeleteEntry = async (ledgerId: string, entryId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      setLedgers(prev => prev.map(l => {
        if (l.id === ledgerId) {
          return { ...l, entries: l.entries.filter(e => e.id !== entryId) };
        }
        return l;
      }));

      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Entry delete error:', err);
      fetchData();
      alert('Failed to delete entry from cloud. Restoring list...');
    }
  };

  const handleBulkDeleteEntries = async (ledgerId: string, entryIds: string[]) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      setLedgers(prev => prev.map(l => {
        if (l.id === ledgerId) {
          return { ...l, entries: l.entries.filter(e => !entryIds.includes(e.id)) };
        }
        return l;
      }));

      const { error } = await supabase
        .from('entries')
        .delete()
        .in('id', entryIds)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      fetchData();
    }
  };

  const handleUpdateEntry = async (ledgerId: string, entry: Entry) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Upload new files to storage
      const updatedAttachments = await uploadAttachments(entry.attachments, userId!);

      const { error } = await supabase
        .from('entries')
        .update({
          type: entry.type,
          date_time: entry.dateTime,
          details: entry.details,
          amount: entry.amount,
          category: entry.category,
          mode: entry.mode,
          attachments: updatedAttachments
        })
        .eq('id', entry.id)
        .eq('user_id', userId);

      if (error) throw error;

      setLedgers(prev => prev.map(l => 
        l.id === ledgerId ? { 
          ...l, 
          entries: l.entries.map(e => e.id === entry.id ? { ...entry, attachments: updatedAttachments } : e).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()) 
        } : l
      ));
    } catch (err: any) {
      console.error('Entry update error:', err);
    }
  };

  const handleReorderEntries = (ledgerId: string, newEntries: Entry[]) => {
    setLedgers(prev => prev.map(l => 
      l.id === ledgerId ? { ...l, entries: newEntries } : l
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-slate-500 font-bold animate-pulse">Syncing with Cloud...</p>
        </div>
      </div>
    );
  }

  if (activeLedger) {
    return (
      <div className={`${theme} animate-in fade-in duration-300`}>
        <LedgerDetails 
          ledger={activeLedger} 
          onBack={() => setActiveLedgerId(null)}
          onAddEntry={(entry) => handleAddEntry(activeLedger.id, entry)}
          onDeleteEntry={handleDeleteEntry}
          onUpdateEntry={handleUpdateEntry}
          onBulkDelete={(ids) => handleBulkDeleteEntries(activeLedger.id, ids)}
          onReorder={(entries) => handleReorderEntries(activeLedger.id, entries)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Header 
        user={user} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onLogout={onLogout}
        onUserUpdate={onUserUpdate}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              Hello, {user.name}! <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight mt-1">Keep your financial records precise and organized.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shadow-inner border border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Grid
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className="w-4 h-4" /> List
            </button>
          </div>
        </div>

        {ledgers.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-white dark:bg-slate-800 rounded-[3rem] shadow-xl border border-dashed border-slate-300 dark:border-slate-700">
            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <Wallet className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No Ledgers Found</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">Start tracking your income and expenses by creating your first digital ledger today.</p>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-3xl font-black shadow-2xl shadow-blue-500/30 flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-6 h-6" />
              Create a Ledger
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest">Financial Ledgers</h2>
                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400">
                  {ledgers.length} Ledgers
                </span>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-3 rounded-2xl font-black transition-all flex items-center gap-2 shadow-xl bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 active:scale-95"
              >
                <Plus className="w-5 h-5" /> New Ledger
              </button>
            </div>
            
            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" : "flex flex-col gap-4"}>
              {filteredLedgers.map((ledger) => (
                <div key={ledger.id} onClick={() => setActiveLedgerId(ledger.id)} className="cursor-pointer">
                  <LedgerCard 
                    ledger={ledger} 
                    viewMode={viewMode}
                    onDelete={(id) => setDeleteConfirmationId(id)}
                    onUpdate={handleUpdateLedger}
                  />
                </div>
              ))}
              {filteredLedgers.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <div className="text-slate-400 font-bold text-lg mb-2">No results matching your search</div>
                  <p className="text-slate-500 text-sm">Try searching for a different ledger name.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Ledger">
        <div className="p-8">
          <div className="mb-6">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Ledger Name</label>
            <div className="relative">
               <ReceiptText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
               <input 
                autoFocus
                type="text" 
                value={newLedgerName}
                onChange={(e) => setNewLedgerName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 dark:bg-slate-900 dark:text-white border-slate-100 dark:border-slate-700 outline-none focus:border-blue-500 transition-all shadow-inner"
                placeholder="e.g. Monthly Savings"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
            <button onClick={handleCreateLedger} className="flex-1 px-4 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Create Ledger</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteConfirmationId} onClose={() => setDeleteConfirmationId(null)} title="Confirm Deletion">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trash2 className="w-10 h-10 text-red-600" />
          </div>
          <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Delete Ledger?</h4>
          <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">This action cannot be undone. All transactions and financial records in this ledger will be permanently deleted from the cloud.</p>
          <div className="flex gap-4">
            <button 
              disabled={isDeleting}
              onClick={() => setDeleteConfirmationId(null)} 
              className="flex-1 px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              disabled={isDeleting}
              onClick={confirmDelete} 
              className="flex-1 px-4 py-4 rounded-2xl bg-red-600 text-white font-black hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes, Delete Ledger'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
