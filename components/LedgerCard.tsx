
import React, { useState } from 'react';
import { Ledger } from '../types';
import { Edit2, Trash2, Calendar, ChevronRight, Check, X, ArrowRight } from 'lucide-react';

interface LedgerCardProps {
  ledger: Ledger;
  viewMode?: 'grid' | 'list';
  onDelete: (id: string) => void;
  onUpdate: (id: string, name: string, createdAt?: number) => void;
}

const LedgerCard: React.FC<LedgerCardProps> = ({ ledger, viewMode = 'grid', onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editName, setEditName] = useState(ledger.name);
  const [editDate, setEditDate] = useState(new Date(ledger.createdAt).toISOString().split('T')[0]);

  const handleUpdate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editName.trim()) {
      onUpdate(ledger.id, editName, new Date(editDate).getTime());
    }
    setIsEditing(false);
    setIsEditingDate(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(ledger.name);
    setEditDate(new Date(ledger.createdAt).toISOString().split('T')[0]);
    setIsEditing(false);
    setIsEditingDate(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(ledger.id);
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleStartEditDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingDate(true);
  };

  const formattedDate = new Date(ledger.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const entriesCount = ledger.entries?.length || 0;

  if (viewMode === 'list') {
    return (
      <div className="group bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-between hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={handleStartEditDate}
            className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all"
          >
            <Calendar className="w-5 h-5" />
          </button>
          
          <div className="flex-1 min-w-0">
            {isEditing || isEditingDate ? (
              <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                {isEditing && (
                  <input 
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-1 text-sm rounded-lg bg-slate-50 dark:bg-slate-700 border border-blue-500 outline-none text-slate-900 dark:text-white"
                  />
                )}
                {isEditingDate && (
                  <input 
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-1 text-sm rounded-lg bg-slate-50 dark:bg-slate-700 border border-blue-500 outline-none text-slate-900 dark:text-white"
                  />
                )}
                <div className="flex gap-2">
                  <button onClick={handleUpdate} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Save</button>
                  <button onClick={handleCancel} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-400 rounded-lg text-xs font-bold flex items-center gap-1"><X className="w-3 h-3" /> Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {ledger.name}
                </h3>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-400">Created: {formattedDate}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    {entriesCount} {entriesCount === 1 ? 'Entry' : 'Entries'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
          <button 
            onClick={handleStartEdit}
            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            title="Edit Name"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={handleDelete}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
          <ArrowRight className="w-5 h-5 text-slate-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 transition-all duration-300 flex flex-col h-full hover:-translate-y-2 hover:ring-2 hover:ring-blue-500/20">
      <div className="flex-1">
        <div className="flex items-start justify-between mb-4">
          <button 
            onClick={handleStartEditDate}
            className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:scale-110"
          >
            <Calendar className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
            {!isEditing && !isEditingDate && (
              <>
                <button 
                  onClick={handleStartEdit}
                  className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  title="Edit Name"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleDelete}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing || isEditingDate ? (
          <div className="mb-4" onClick={e => e.stopPropagation()}>
            {isEditing && (
              <input 
                autoFocus
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-blue-500 outline-none text-slate-900 dark:text-white mb-3 shadow-inner"
              />
            )}
            {isEditingDate && (
              <input 
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-blue-500 outline-none text-slate-900 dark:text-white mb-3 shadow-inner"
              />
            )}
            <div className="flex gap-2">
              <button onClick={handleUpdate} className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1 shadow-md active:scale-95"><Check className="w-3 h-3" /> Update</button>
              <button onClick={handleCancel} className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 active:scale-95"><X className="w-3 h-3" /> Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {ledger.name}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Created {formattedDate}
            </p>
            
            <div className="mt-4 flex items-center gap-2">
               <div className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold">
                 {entriesCount} {entriesCount === 1 ? 'Entry' : 'Entries'}
               </div>
            </div>
          </div>
        )}
      </div>

      {!isEditing && !isEditingDate && (
        <div className="mt-6 w-full flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 group-hover:bg-blue-600 text-slate-600 dark:text-slate-400 group-hover:text-white transition-all text-sm font-bold shadow-sm">
          View Ledger
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </div>
  );
};

export default LedgerCard;
