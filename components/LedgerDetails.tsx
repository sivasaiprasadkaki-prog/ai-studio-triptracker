
import React, { useState, useMemo, useRef } from 'react';
import { Ledger, Entry } from '../types';
import { 
  ArrowLeft, FileDown, TrendingUp, TrendingDown, Wallet, 
  PlusCircle, MinusCircle, ChevronDown, Paperclip, X, 
  Image as ImageIcon, Edit2, Trash2, FileText, Download,
  IndianRupee, Eye, CheckSquare, Square, ArrowUp, ArrowDown,
  ZoomIn, ZoomOut, RotateCcw, UploadCloud
} from 'lucide-react';
import Modal from './Modal';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface LedgerDetailsProps {
  ledger: Ledger;
  onBack: () => void;
  onAddEntry: (entry: Entry) => void;
  onDeleteEntry: (ledgerId: string, entryId: string) => void;
  onUpdateEntry: (ledgerId: string, entry: Entry) => void;
  onBulkDelete: (ids: string[]) => void;
  onReorder: (entries: Entry[]) => void;
}

const formatDate = (dateStr: string | number) => {
  const date = new Date(dateStr);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
};

const formatTime = (dateStr: string | number) => {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const LedgerDetails: React.FC<LedgerDetailsProps> = ({ 
  ledger, onBack, onAddEntry, onDeleteEntry, onUpdateEntry, onBulkDelete, onReorder
}) => {
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [entryModalType, setEntryModalType] = useState<'in' | 'out' | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [galleryEntry, setGalleryEntry] = useState<Entry | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const tableData = useMemo(() => {
    let currentBalance = 0;
    return ledger.entries.map(entry => {
      if (entry.type === 'in') currentBalance += entry.amount;
      else currentBalance -= entry.amount;
      return { ...entry, balance: currentBalance };
    });
  }, [ledger.entries]);

  const stats = useMemo(() => {
    const cashIn = ledger.entries.filter(e => e.type === 'in').reduce((sum, e) => sum + e.amount, 0);
    const cashOut = ledger.entries.filter(e => e.type === 'out').reduce((sum, e) => sum + e.amount, 0);
    return { cashIn, cashOut, net: cashIn - cashOut };
  }, [ledger.entries]);

  const handleIndividualDelete = (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this transaction?')) {
      onDeleteEntry(ledger.id, entryId);
      const next = new Set(selectedIds);
      next.delete(entryId);
      setSelectedIds(next);
    }
  };

  const handleBulkDeleteAction = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Delete ${selectedIds.size} selected entries?`)) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === ledger.entries.length && ledger.entries.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ledger.entries.map(e => e.id)));
    }
  };

  const moveEntry = (index: number, direction: 'up' | 'down') => {
    const newEntries = [...ledger.entries];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newEntries.length) return;
    [newEntries[index], newEntries[targetIndex]] = [newEntries[targetIndex], newEntries[index]];
    onReorder(newEntries);
  };

  const handleExportPdf = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${formatDate(Date.now())}`, 14, 20);

    const tableRows = tableData.map(entry => [
      `${formatDate(entry.dateTime)}\n${formatTime(entry.dateTime)}`,
      entry.details,
      entry.category,
      entry.mode,
      entry.type === 'in' ? `+₹${entry.amount.toLocaleString()}` : `-₹${entry.amount.toLocaleString()}`,
      `₹${entry.balance.toLocaleString()}`
    ]);

    (doc as any).autoTable({
      startY: 30,
      head: [['Date', 'Details', 'Category', 'Mode', 'Amount', 'Balance']],
      body: tableRows,
      headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 3 },
    });

    for (const entry of ledger.entries) {
      if (entry.attachments && entry.attachments.length > 0) {
        for (const att of entry.attachments) {
          if (att.data.startsWith('data:image/')) {
            doc.addPage();
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Attachment for: ${entry.details} (${formatDate(entry.dateTime)})`, 14, 15);
            try {
              const imgProps = doc.getImageProperties(att.data);
              const margin = 14;
              const maxImgWidth = pageWidth - (margin * 2);
              const maxImgHeight = pageHeight - 40; 
              const ratio = Math.min(maxImgWidth / imgProps.width, maxImgHeight / imgProps.height);
              const finalWidth = imgProps.width * ratio;
              const finalHeight = imgProps.height * ratio;
              doc.addImage(att.data, 'JPEG', margin, 25, finalWidth, finalHeight);
              const overlayY = 25 + finalHeight - 15;
              doc.setFillColor(0, 0, 0);
              doc.setGState(new (doc as any).GState({ opacity: 0.15 })); 
              doc.rect(margin, overlayY, finalWidth, 15, 'F');
              doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(8);
              doc.text(`${entry.details} | ₹${entry.amount.toLocaleString()}`, margin + 5, overlayY + 9);
            } catch (err) {
              console.error("PDF Export Image Error:", err);
            }
          }
        }
      }
    }
    doc.save(`${ledger.name.replace(/\s+/g, '_')}_Report.pdf`);
    setIsReportsOpen(false);
  };

  const handleExportExcel = () => {
    // Exact column layout from reference image:
    // Date | Details | Category | Mode | Cash In | Cash Out
    const headers = ['Date', 'Details', 'Category', 'Mode', 'Cash In', 'Cash Out'];
    const rows = tableData.map(e => [
      formatDate(e.dateTime),
      `"${e.details.replace(/"/g, '""')}"`,
      e.category,
      e.mode,
      e.type === 'in' ? e.amount : '',
      e.type === 'out' ? e.amount : ''
    ]);

    // Summary footer rows exactly as in user reference:
    // TOTAL in Mode column (D), values in E and F
    // BALANCE in Mode column (D), net in E
    const totalRow = ["", "", "", "TOTAL", stats.cashIn, stats.cashOut];
    const balanceRow = ["", "", "", "BALANCE", stats.net, ""];

    const csvContent = [
      headers,
      ...rows,
      [""], // Spacing row
      totalRow,
      balanceRow
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${ledger.name}.csv`;
    link.click();
    setIsReportsOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors pb-20">
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 h-16 flex items-center justify-between px-4 sm:px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-600 dark:text-slate-300">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-none">
            {ledger.name}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button 
              onClick={handleBulkDeleteAction}
              className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-red-600 active:scale-95 transition-all shadow-lg"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedIds.size})
            </button>
          )}
          <div className="relative">
            <button 
              onClick={() => setIsReportsOpen(!isReportsOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-95"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Reports</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isReportsOpen ? 'rotate-180' : ''}`} />
            </button>
            {isReportsOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border py-2 z-20">
                <button onClick={handleExportExcel} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm flex items-center gap-3 font-medium">
                  <Download className="w-4 h-4 text-green-500" /> Excel (.csv)
                </button>
                <button onClick={handleExportPdf} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm flex items-center gap-3 font-medium">
                  <FileText className="w-4 h-4 text-red-500" /> PDF (.pdf)
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="sticky top-[64px] z-40 bg-slate-50 dark:bg-slate-900 pt-2 pb-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SummaryCard title="Cash In" amount={stats.cashIn} color="green" icon={<TrendingUp className="w-5 h-5" />} />
            <SummaryCard title="Cash Out" amount={stats.cashOut} color="red" icon={<TrendingDown className="w-5 h-5" />} />
            <SummaryCard title="Net Balance" amount={stats.net} color="blue" icon={<Wallet className="w-5 h-5" />} />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setEntryModalType('in')} className="flex-1 flex items-center justify-center gap-2 bg-green-500/10 text-green-600 py-3 rounded-2xl font-black border-2 border-green-500/20 active:scale-95 transition-all text-sm">
              <PlusCircle className="w-5 h-5" /> Cash In
            </button>
            <button onClick={() => setEntryModalType('out')} className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 text-red-600 py-3 rounded-2xl font-black border-2 border-red-500/20 active:scale-95 transition-all text-sm">
              <MinusCircle className="w-5 h-5" /> Cash Out
            </button>
          </div>
        </div>

        <div className="mt-4 bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b">
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  <th className="px-6 py-4 w-12 text-center">
                    <button onClick={toggleSelectAll} className="p-1">
                      {selectedIds.size === ledger.entries.length && ledger.entries.length > 0 ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                    </button>
                  </th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Details</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Mode</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Balance</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {tableData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                      No records found. Entries will appear below the header once added.
                    </td>
                  </tr>
                ) : (
                  tableData.map((entry, idx) => (
                    <tr key={entry.id} className={`group transition-colors ${selectedIds.has(entry.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/50'}`}>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => toggleSelect(entry.id)} className="p-1">
                          {selectedIds.has(entry.id) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-slate-300" />}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[11px] font-bold text-slate-500">
                          {formatDate(entry.dateTime)}<br/><span className="text-[9px] opacity-60">{formatTime(entry.dateTime)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-white text-sm">{entry.details}</span>
                          {entry.attachments?.length > 0 && (
                            <button onClick={() => setGalleryEntry(entry)} className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-[9px] font-black">
                              <Paperclip className="w-2.5 h-2.5" /> {entry.attachments.length}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-slate-100 text-slate-500 uppercase">{entry.category}</span></td>
                      <td className="px-6 py-4"><span className="text-xs font-semibold text-slate-400">{entry.mode}</span></td>
                      <td className="px-6 py-4 font-black text-sm"><div className={entry.type === 'in' ? 'text-green-600' : 'text-red-600'}>{entry.type === 'in' ? '+' : '-'}₹{entry.amount.toLocaleString()}</div></td>
                      <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-slate-200">₹{entry.balance.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex flex-col gap-0.5 mr-2">
                            <button onClick={() => moveEntry(idx, 'up')} disabled={idx === 0} className="p-0.5 hover:text-blue-600 disabled:opacity-20"><ArrowUp className="w-3.5 h-3.5"/></button>
                            <button onClick={() => moveEntry(idx, 'down')} disabled={idx === tableData.length - 1} className="p-0.5 hover:text-blue-600 disabled:opacity-20"><ArrowDown className="w-3.5 h-3.5"/></button>
                          </div>
                          <button onClick={() => setEditingEntry(entry)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={(e) => handleIndividualDelete(e, entry.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Modal isOpen={!!entryModalType} onClose={() => setEntryModalType(null)} title={entryModalType === 'in' ? "Add Cash In" : "Add Cash Out"}>
        <EntryForm type={entryModalType || 'in'} onSave={(e) => { onAddEntry(e); setEntryModalType(null); }} onCancel={() => setEntryModalType(null)} />
      </Modal>

      <Modal isOpen={!!editingEntry} onClose={() => setEditingEntry(null)} title="Edit Entry">
        {editingEntry && <EntryForm type={editingEntry.type} initialData={editingEntry} onSave={(e) => { onUpdateEntry(ledger.id, { ...e, id: editingEntry.id }); setEditingEntry(null); }} onCancel={() => setEditingEntry(null)} />}
      </Modal>

      <GalleryModal isOpen={!!galleryEntry} onClose={() => setGalleryEntry(null)} entry={galleryEntry} />
    </div>
  );
};

const SummaryCard: React.FC<{ title: string; amount: number; color: 'green' | 'red' | 'blue'; icon: React.ReactNode }> = ({ title, amount, color, icon }) => {
  const colors = {
    green: 'bg-green-500/10 text-green-600 border-green-500/10',
    red: 'bg-red-500/10 text-red-600 border-red-500/10',
    blue: 'bg-blue-600/10 text-blue-600 border-blue-600/10'
  };
  return (
    <div className={`${colors[color]} p-4 rounded-3xl border transition-all hover:scale-[1.01]`}>
      <div className="flex flex-col gap-1">
        <div className="w-9 h-9 bg-white/50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center shadow-sm">{icon}</div>
        <div>
          <p className="font-black text-[9px] uppercase tracking-widest opacity-60">{title}</p>
          <h3 className="text-xl font-black flex items-center gap-1"><IndianRupee className="w-4 h-4" /> {amount.toLocaleString()}</h3>
        </div>
      </div>
    </div>
  );
};

const GalleryModal: React.FC<{ isOpen: boolean; onClose: () => void; entry: Entry | null }> = ({ isOpen, onClose, entry }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !entry || !entry.attachments.length) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleClose = () => {
    setZoom(1);
    setRotation(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in transition-all">
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-[110]">
        <div className="text-white font-black uppercase tracking-widest text-[10px] bg-white/10 px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-md">
          {entry.details} • {activeIndex + 1} / {entry.attachments.length}
        </div>
        <div className="flex gap-2">
          <button onClick={handleZoomIn} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all border border-white/10" title="Zoom In"><ZoomIn className="w-5 h-5" /></button>
          <button onClick={handleZoomOut} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all border border-white/10" title="Zoom Out"><ZoomOut className="w-5 h-5" /></button>
          <button onClick={handleRotate} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all border border-white/10" title="Rotate"><RotateCcw className="w-5 h-5" /></button>
          <button onClick={handleClose} className="p-2 text-white/80 hover:text-white hover:bg-red-500 rounded-full transition-all border border-white/10" title="Close"><X className="w-6 h-6" /></button>
        </div>
      </div>

      <div className="w-full h-full flex flex-col items-center justify-center p-4 overflow-hidden">
        <div 
          className="transition-transform duration-300 ease-out cursor-grab active:cursor-grabbing"
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
        >
          <img 
            src={entry.attachments[activeIndex].data} 
            className="max-w-[90vw] max-h-[80vh] object-contain rounded shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10" 
            alt="Attachment" 
          />
        </div>

        <div className="absolute bottom-8 flex gap-3 overflow-x-auto max-w-[90%] p-3 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 scrollbar-hide">
          {entry.attachments.map((att, idx) => (
            <button key={att.id} onClick={() => { setActiveIndex(idx); setZoom(1); setRotation(0); }} className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${idx === activeIndex ? 'border-blue-500 scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}>
              <img src={att.data} className="w-full h-full object-cover" alt="" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const EntryForm: React.FC<{ type: 'in' | 'out'; initialData?: Partial<Entry>; onSave: (e: Entry) => void; onCancel: () => void; }> = ({ type: initialType, initialData, onSave, onCancel }) => {
  const [activeType, setActiveType] = useState<'in' | 'out'>(initialType);
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState({
    dateTime: initialData?.dateTime || new Date().toISOString().slice(0, 16),
    details: initialData?.details || '',
    amount: initialData?.amount?.toString() || '',
    category: initialData?.category || 'Food',
    mode: initialData?.mode || 'Cash'
  });
  const [attachments, setAttachments] = useState<{ id: string; name: string; data: string; type: string }[]>(initialData?.attachments || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | File[]) => {
    const filesArray = Array.from(files);
    filesArray.forEach((file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          // Explicitly update attachments state to trigger a re-render of previews
          setAttachments(prev => [...prev, { 
            id: Math.random().toString(36).substr(2, 9), 
            name: file.name, 
            data: event.target?.result as string, 
            type: file.type 
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: initialData?.id || crypto.randomUUID(), type: activeType, ...formData, amount: parseFloat(formData.amount), attachments });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
      <div className="flex p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl">
        <button type="button" onClick={() => setActiveType('in')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${activeType === 'in' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400'}`}>CASH IN</button>
        <button type="button" onClick={() => setActiveType('out')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${activeType === 'out' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}>CASH OUT</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Date & Time</label><input type="datetime-local" value={formData.dateTime} onChange={e => setFormData({ ...formData, dateTime: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm border-2 border-transparent focus:border-blue-500 outline-none transition-all" required /></div>
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Amount (₹)</label><input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl font-black text-sm border-2 border-transparent focus:border-blue-500 outline-none transition-all" placeholder="0.00" required /></div>
      </div>
      <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Details</label><input type="text" value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm border-2 border-transparent focus:border-blue-500 outline-none transition-all" placeholder="Enter transaction details" required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Category</label><select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm border-2 border-transparent focus:border-blue-500 outline-none transition-all">{['Food', 'Fuel', 'Utilities', 'Transport', 'Shopping', 'Travel', 'Other'].map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Mode</label><select value={formData.mode} onChange={e => setFormData({ ...formData, mode: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm border-2 border-transparent focus:border-blue-500 outline-none transition-all">{['Cash', 'UPI', 'Card', 'Other'].map(m => <option key={m} value={m}>{m}</option>)}</select></div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center"><label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Attachments</label></div>
        
        <div 
          onDragOver={onDragOver} 
          onDragLeave={onDragLeave} 
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className={`w-10 h-10 transition-colors ${isDragging ? 'text-blue-500' : 'text-slate-300 group-hover:text-slate-400'}`} />
          <p className="text-xs font-bold text-slate-400 group-hover:text-slate-500">Drag & Drop images here or click to upload</p>
          <input type="file" multiple onChange={(e) => e.target.files && handleFiles(e.target.files)} className="hidden" ref={fileInputRef} accept="image/*" />
        </div>

        {attachments.length > 0 && (
          <div className="grid grid-cols-5 gap-2 pt-2 animate-in fade-in slide-in-from-bottom-2">
            {attachments.map((att) => (
              <div key={att.id} className="relative aspect-square rounded-xl overflow-hidden border group/item shadow-sm bg-slate-100 dark:bg-slate-700">
                <img src={att.data} className="w-full h-full object-cover transition-transform group-hover/item:scale-110" alt="Preview" />
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); setAttachments(prev => prev.filter(a => a.id !== att.id)); }} 
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors shadow-md transform hover:scale-110"
                >
                  <X className="w-3 h-3"/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-4 pt-4 sticky bottom-0 bg-white dark:bg-slate-800 pb-2 border-t mt-4 transition-colors">
        <button type="button" onClick={onCancel} className="flex-1 py-3 border rounded-xl font-bold active:scale-95 transition-all text-slate-600 dark:text-slate-300">Cancel</button>
        <button type="submit" className={`flex-1 py-3 rounded-xl text-white font-black shadow-lg active:scale-95 transition-all ${activeType === 'in' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>Save Transaction</button>
      </div>
    </form>
  );
};

export default LedgerDetails;
