
import React, { useState, useEffect, useMemo } from 'react';
import { Ledger, User, Theme, Entry, Attachment } from '../types';
import Header from './Header';
import LedgerCard from './LedgerCard';
import LedgerDetails from './LedgerDetails';
import Modal from './Modal';
import { Plus, LayoutGrid, List, Wallet, Trash2, Loader2, Sparkles, ReceiptText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLoading } from '../context/LoadingContext';

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
  const [ledgerError, setLedgerError] = useState('');
  const { showLoading, hideLoading } = useLoading();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    showLoading();
    try {
      const { data: ledgersData, error: ledgersError } = await supabase
        .from('ledgers')
        .select(`
          *,
          entries (
            *,
            attachments (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (ledgersError) throw ledgersError;
      
      const formattedLedgers: Ledger[] = (ledgersData || []).map(l => ({
        id: l.id,
        name: l.name,
        createdAt: new Date(l.created_at).getTime(),
        entries: (l.entries || []).map((e: any) => ({
          ...e,
          dateTime: e.date_time,
          attachments: (e.attachments || []).map((att: any) => {
            if (!att) return null;
            const { data } = supabase.storage
              .from('triptracker-files')
              .getPublicUrl(att.file_path);
            
            return {
              ...att,
              url: data?.publicUrl || ''
            };
          }).filter(Boolean)
        })).sort((a: any, b: any) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
      }));

      setLedgers(formattedLedgers);
    } catch (err: any) {
      console.error('Error fetching data:', err);
    } finally {
      hideLoading();
    }
  };

  const handleOpenLedger = (id: string) => {
    showLoading();
    // Use a small timeout to ensure the professional loader is visible during transition
    setTimeout(() => {
      setActiveLedgerId(id);
      hideLoading();
    }, 600);
  };

  const handleBackToDashboard = () => {
    showLoading();
    setTimeout(() => {
      setActiveLedgerId(null);
      hideLoading();
    }, 400);
  };

  const activeLedger = useMemo(() => 
    ledgers.find(l => l.id === activeLedgerId), 
    [ledgers, activeLedgerId]
  );

  const filteredLedgers = useMemo(() => {
    return ledgers.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [ledgers, searchQuery]);

  const processAttachment = async (att: Attachment, userId: string, entryId: string): Promise<Attachment> => {
    if (!att) return att;
    if (att.data && att.data.startsWith('data:') && !att.file_path) {
      try {
        const res = await fetch(att.data);
        const blob = await res.blob();
        
        const filePath = `${userId}/${entryId}/${att.file_name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('triptracker-files')
          .upload(filePath, blob, { 
            contentType: att.file_type,
            upsert: true
          });

        if (uploadError) throw uploadError;

        const attachmentRow = {
          entry_id: entryId,
          user_id: userId,
          file_path: filePath,
          file_name: att.file_name,
          file_type: att.file_type
        };

        const { data: dbData, error: dbError } = await supabase
          .from('attachments')
          .insert([attachmentRow])
          .select()
          .single();

        if (dbError) throw dbError;
        if (!dbData) throw new Error("Attachment created but no data returned.");

        const { data } = supabase.storage
          .from('triptracker-files')
          .getPublicUrl(filePath);

        return {
          ...att,
          id: dbData.id,
          file_path: filePath,
          url: data?.publicUrl || '',
          data: '' 
        };
      } catch (err) {
        console.error("Failed to process attachment:", att.file_name, err);
        return att;
      }
    }
    return att;
  };

  const handleCreateLedger = async () => {
    const trimmedName = newLedgerName.trim();
    if (!trimmedName) return;

    setLedgerError('');

    const isDuplicate = ledgers.some(l => l.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      setLedgerError("Ledger already exists");
      return;
    }

    showLoading();
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No authenticated user found.");

      const { data, error } = await supabase
        .from('ledgers')
        .insert([{ 
          name: trimmedName,
          user_id: userData.user.id
        }])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Ledger created but no data returned.");

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
      setLedgerError('Failed to create ledger: ' + err.message);
    } finally {
      hideLoading();
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmationId) return;
    setIsDeleting(true);
    showLoading();
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
      hideLoading();
    }
  };

  const handleUpdateLedger = async (id: string, newName: string, createdAt?: number) => {
    const trimmedName = newName.trim();
    if (!trimmedName) return false;

    const isDuplicate = ledgers.some(l => l.id !== id && l.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      alert("Ledger with this name already exists");
      return false;
    }

    showLoading();
    try {
      const updateData: any = { name: trimmedName };
      if (createdAt) updateData.created_at = new Date(createdAt).toISOString();

      const { error } = await supabase
        .from('ledgers')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setLedgers(prev => prev.map(l => l.id === id ? { ...l, name: trimmedName, createdAt: createdAt ?? l.createdAt } : l));
      return true;
    } catch (err: any) {
      console.error('Update error:', err);
      return false;
    } finally {
      hideLoading();
    }
  };

  const handleAddEntry = async (ledgerId: string, entry: Entry) => {
    showLoading();
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { data: entryData, error: entryError } = await supabase
        .from('entries')
        .insert([{
          ledger_id: ledgerId,
          user_id: userId,
          type: entry.type,
          date_time: entry.dateTime,
          details: entry.details,
          amount: entry.amount,
          category: entry.category,
          mode: entry.mode
        }])
        .select()
        .single();

      if (entryError) throw entryError;
      if (!entryData) throw new Error("Entry created but no data returned.");

      const entryId = entryData.id;

      let finalAttachments: Attachment[] = [];
      if (entry.attachments && entry.attachments.length > 0) {
        finalAttachments = await Promise.all(
          entry.attachments.map(att => processAttachment(att, userId, entryId))
        );
      }

      const newEntry: Entry = { 
        ...entryData, 
        dateTime: entryData.date_time, 
        attachments: finalAttachments 
      };

      setLedgers(prev => prev.map(l => 
        l.id === ledgerId ? { 
          ...l, 
          entries: [...(l.entries || []), newEntry].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()) 
        } : l
      ));
    } catch (err: any) {
      console.error('Entry add error:', err);
      alert('Error adding entry: ' + (err.message || 'Check RLS policies.'));
    } finally {
      hideLoading();
    }
  };

  const handleDeleteEntry = async (ledgerId: string, entryId: string) => {
    showLoading();
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      setLedgers(prev => prev.map(l => {
        if (l.id === ledgerId) {
          return { ...l, entries: (l.entries || []).filter(e => e.id !== entryId) };
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
    } finally {
      hideLoading();
    }
  };

  const handleBulkDeleteEntries = async (ledgerId: string, entryIds: string[]) => {
    showLoading();
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      setLedgers(prev => prev.map(l => {
        if (l.id === ledgerId) {
          return { ...l, entries: (l.entries || []).filter(e => !entryIds.includes(e.id)) };
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
    } finally {
      hideLoading();
    }
  };

  const handleUpdateEntry = async (ledgerId: string, entry: Entry) => {
    showLoading();
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const { error: entryError } = await supabase
        .from('entries')
        .update({
          type: entry.type,
          date_time: entry.dateTime,
          details: entry.details,
          amount: entry.amount,
          category: entry.category,
          mode: entry.mode
        })
        .eq('id', entry.id)
        .eq('user_id', userId);

      if (entryError) throw entryError;

      const processedAttachments = await Promise.all(
        (entry.attachments || []).map(att => processAttachment(att, userId, entry.id))
      );

      setLedgers(prev => prev.map(l => 
        l.id === ledgerId ? { 
          ...l, 
          entries: (l.entries || []).map(e => e.id === entry.id ? { ...entry, attachments: processedAttachments } : e).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()) 
        } : l
      ));
    } catch (err: any) {
      console.error('Entry update error:', err);
    } finally {
      hideLoading();
    }
  };

  const handleReorderEntries = (ledgerId: string, newEntries: Entry[]) => {
    setLedgers(prev => prev.map(l => 
      l.id === ledgerId ? { ...l, entries: newEntries } : l
    ));
  };

  if (activeLedger) {
    return (
      <div className={`${theme} animate-in fade-in duration-300`}>
        <LedgerDetails 
          ledger={activeLedger} 
          onBack={handleBackToDashboard}
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
                <div key={ledger.id} onClick={() => handleOpenLedger(ledger.id)} className="cursor-pointer">
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

      <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setLedgerError(''); }} title="Create New Ledger">
        <div className="p-8">
          <div className="mb-6">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Ledger Name</label>
            <div className="relative">
               <ReceiptText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
               <input 
                autoFocus
                type="text" 
                value={newLedgerName}
                onChange={(e) => {
                  setNewLedgerName(e.target.value);
                  setLedgerError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateLedger()}
                className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 dark:bg-slate-900 dark:text-white outline-none transition-all shadow-inner ${ledgerError ? 'border-red-500 focus:border-red-500' : 'border-slate-100 dark:border-slate-700 focus:border-blue-500'}`}
                placeholder="e.g. Monthly Savings"
              />
            </div>
            {ledgerError && (
              <p className="text-red-600 text-xs mt-2 font-bold flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                <span className="w-1 h-1 bg-red-600 rounded-full"></span> {ledgerError}
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <button onClick={() => { setIsCreateModalOpen(false); setLedgerError(''); }} className="flex-1 px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
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
