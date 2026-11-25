import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  Lock, 
  Calendar, 
  Hash, 
  Info,
  ChevronLeft,
  X,
  FileText,
  CheckCircle,
  AlertOctagon,
  CornerDownRight
} from 'lucide-react';

interface BlockedItem {
  id: string;
  is_blocked: boolean;
  status: string;
  reference: string;
  message: string;
  title: string;
  description: string;
  created_at: string;
}

export default function IsBlocked() {
  const [items, setItems] = useState<BlockedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<BlockedItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const endpoint = "https://jvqrturbkgyxsycdcfwp.supabase.co/rest/v1/blocked?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2cXJ0dXJia2d5eHN5Y2RjZndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDUzNjEsImV4cCI6MjA5Mjk4MTM2MX0.zMwmCC5s6M1hvPD5cRcde-cGxRc5E9NsIGoEnE2htis";

  const toggleBlockedStatus = async (item: BlockedItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent opening/selecting row when clicking toggle in table
    }
    setTogglingId(item.id);
    const newBlockedValue = !item.is_blocked;
    const newStatus = newBlockedValue ? "Akses dibatasi" : "Aktif";
    
    const updateUrl = `https://jvqrturbkgyxsycdcfwp.supabase.co/rest/v1/blocked?id=eq.${item.id}&apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2cXJ0dXJia2d5eHN5Y2RjZndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDUzNjEsImV4cCI6MjA5Mjk4MTM2MX0.zMwmCC5s6M1hvPD5cRcde-cGxRc5E9NsIGoEnE2htis`;
    
    try {
      const res = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          is_blocked: newBlockedValue,
          status: newStatus
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      const updatedItem = Array.isArray(data) ? data[0] : data;

      if (updatedItem) {
        setItems(prevItems => prevItems.map(i => i.id === item.id ? { ...i, ...updatedItem } : i));
        
        if (selectedItem?.id === item.id) {
          setSelectedItem(prev => prev ? { ...prev, ...updatedItem } : null);
        }
      } else {
        // Fallback if representation is not returned
        const updated = { ...item, is_blocked: newBlockedValue, status: newStatus };
        setItems(prevItems => prevItems.map(i => i.id === item.id ? updated : i));
        if (selectedItem?.id === item.id) {
          setSelectedItem(updated);
        }
      }
    } catch (err) {
      console.error("Gagal memperbarui status blocked:", err);
      alert("Gagal mengubah status: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setTogglingId(null);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        headers: {
          'Accept': 'application/json',
          'Prefer': 'return=representation'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching blocked list:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat data blocked");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter items based on search term and status dropdown
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      (item.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.message || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'blocked' && item.is_blocked) ||
      (statusFilter === 'active' && !item.is_blocked);

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div id="is-blocked-page" className="min-h-full bg-[#F8FAFC] text-slate-800 pb-12">
      {/* Header Banner */}
      <header id="blocked-header" className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div id="header-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div id="header-left" className="flex items-center gap-3">
            <button 
              id="back-btn"
              onClick={() => window.location.href = '/'}
              className="p-2 hover:bg-slate-50 text-slate-500 rounded-xl transition duration-150 active:scale-95"
              title="Kembali ke Beranda"
            >
              <ChevronLeft size={20} className="stroke-[2.5]" />
            </button>
            <div id="header-titles" className="flex items-center gap-2">
              <span id="shield-icon" className="w-8 h-8 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                <ShieldAlert size={18} className="stroke-[2.5]" />
              </span>
              <div>
                <h1 id="main-title" className="text-sm font-black text-slate-900 tracking-tight leading-none mb-1">
                  Database Jaringan Terblokir
                </h1>
                <p id="sub-title" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Internal Restriction logs
                </p>
              </div>
            </div>
          </div>

          <div id="header-actions" className="flex items-center gap-2">
            <button
              id="refresh-btn"
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 bg-slate-50 border border-slate-100 hover:bg-slate-100 active:scale-95 text-slate-600 rounded-xl transition flex items-center gap-1.5 text-xs font-black uppercase tracking-wider disabled:opacity-50"
              title="Perbarui Data"
            >
              <RefreshCw size={14} className={`stroke-[2.5] ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="blocked-main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Stats Panel */}
        <div id="stats-grid" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div id="stat-card-total" className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-center gap-4">
            <div id="total-badge" className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-black text-lg shrink-0">
              {loading ? '...' : items.length}
            </div>
            <div>
              <p id="total-lbl" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Entri Database</p>
              <h3 id="total-val" className="text-base font-black text-slate-900 leading-tight">Seluruh Rekaman Jaringan</h3>
            </div>
          </div>

          <div id="stat-card-blocked" className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-center gap-4">
            <div id="blocked-badge" className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black text-lg shrink-0">
              {loading ? '...' : items.filter(i => i.is_blocked).length}
            </div>
            <div>
              <p id="blocked-lbl" className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Status Terblokir</p>
              <h3 id="blocked-val" className="text-base font-black text-slate-900 leading-tight">Akses Jaringan Dibatasi</h3>
            </div>
          </div>

          <div id="stat-card-active" className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-center gap-4">
            <div id="active-badge" className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg shrink-0">
              {loading ? '...' : items.filter(i => !i.is_blocked).length}
            </div>
            <div>
              <p id="active-lbl" className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-semibold">Status Bebas</p>
              <h3 id="active-val" className="text-base font-black text-slate-900 leading-tight">Akses Jaringan Normal</h3>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div id="filters-container" className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col md:flex-row gap-4 items-center justify-between">
          <div id="search-box" className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              id="search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#FAFAFA] border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-50 transition"
              placeholder="Cari berdasarkan ID, referensi, judul..."
            />
            {searchTerm && (
              <button 
                id="clear-search"
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div id="filters-right" className="flex items-center gap-3 w-full md:w-auto">
            <span id="filter-lbl" className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 hidden sm:inline">Filter Status:</span>
            <select 
              id="status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48 bg-[#FAFAFA] border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-300 transition"
            >
              <option value="all">Semua Status</option>
              <option value="blocked">Terblokir Saja</option>
              <option value="active">Aktif Saja</option>
            </select>
          </div>
        </div>

        {/* Table & Details Layout */}
        <div id="table-layout" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Table Card (2 cols) */}
          <div id="table-card" className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] overflow-hidden">
            
            {loading ? (
              <div id="loading-container" className="py-20 flex flex-col items-center justify-center gap-3">
                <div id="spinner" className="w-10 h-10 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin"></div>
                <p id="loading-txt" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Menghubungkan ke API Supabase...</p>
              </div>
            ) : error ? (
              <div id="error-container" className="py-16 px-6 flex flex-col items-center justify-center text-center space-y-4">
                <div id="err-icon" className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                  <ShieldAlert size={24} className="stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <h3 id="err-title" className="text-sm font-black text-slate-900">Gagal Mengambil Data</h3>
                  <p id="err-desc" className="text-xs text-slate-400 font-semibold max-w-sm">{error}</p>
                </div>
                <button 
                  id="retry-btn"
                  onClick={fetchData} 
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl active:scale-95 transition"
                >
                  Coba Lagi
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div id="empty-container" className="py-20 px-6 flex flex-col items-center justify-center text-center space-y-4">
                <div id="empty-icon" className="w-14 h-14 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center">
                  <FileText size={24} />
                </div>
                <div className="space-y-1">
                  <h3 id="empty-title" className="text-sm font-black text-slate-800">Tidak Ada Log Kecocokan</h3>
                  <p id="empty-desc" className="text-xs text-slate-400 font-semibold">Ubah filter pencarian Anda atau perbarui log jaringan.</p>
                </div>
              </div>
            ) : (
              <div id="table-wrapper" className="overflow-x-auto">
                <table id="blocked-table" className="w-full text-left border-collapse">
                  <thead>
                    <tr id="table-hdr-row" className="bg-[#FAFBFD] border-b border-slate-100">
                      <th id="hdr-ref" className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">ID / Referensi</th>
                      <th id="hdr-title" className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Judul & Keterangan</th>
                      <th id="hdr-status" className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                      <th id="hdr-date" className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Waktu Pemblokiran</th>
                      <th id="hdr-actions-col" className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="table-body" className="divide-y divide-slate-50">
                    {filteredItems.map((item, idx) => {
                      const isSelected = selectedItem?.id === item.id;
                      return (
                        <tr 
                          key={item.id || `block-item-${idx}`}
                          id={`row-${item.id || idx}`}
                          onClick={() => setSelectedItem(item)}
                          className={`hover:bg-slate-50/75 cursor-pointer transition-colors duration-100 ${isSelected ? 'bg-slate-50 font-medium' : ''}`}
                        >
                          <td id={`td-ref-${idx}`} className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span id={`row-id-${idx}`} className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-lg w-max border border-slate-200/50">
                                {item.id || 'N/A'}
                              </span>
                              <span id={`row-ref-${idx}`} className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                {item.reference || '-'}
                              </span>
                            </div>
                          </td>
                          <td id={`td-title-${idx}`} className="px-6 py-4 max-w-xs">
                            <div className="space-y-0.5">
                              <p id={`row-title-${idx}`} className="text-xs font-black text-slate-900 leading-snug line-clamp-1">
                                {item.title || 'Tanpa Judul'}
                              </p>
                              <p id={`row-desc-${idx}`} className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                                {item.description || 'Tidak ada keterangan tambahan'}
                              </p>
                            </div>
                          </td>
                          <td id={`td-status-${idx}`} className="px-6 py-4">
                            <span 
                              id={`row-status-badge-${idx}`}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                item.is_blocked 
                                  ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${item.is_blocked ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                              {item.status || (item.is_blocked ? 'Dibatasi' : 'Aktif')}
                            </span>
                          </td>
                          <td id={`td-date-${idx}`} className="px-6 py-4">
                            <div id={`row-date-container-${idx}`} className="flex items-center gap-1.5 text-slate-400">
                              <Calendar size={12} />
                              <span id={`row-date-val-${idx}`} className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                {formatDate(item.created_at)}
                              </span>
                            </div>
                          </td>
                          <td id={`td-actions-col-${idx}`} className="px-6 py-4 text-right">
                            <button
                              id={`row-toggle-btn-${idx}`}
                              onClick={(e) => toggleBlockedStatus(item, e)}
                              disabled={togglingId === item.id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition active:scale-95 disabled:opacity-50 ${
                                item.is_blocked 
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {togglingId === item.id ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <span>{item.is_blocked ? 'Aktifkan' : 'Blokir'}</span>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Details Sidebar (1 col) */}
          <div id="details-card" className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] p-5 space-y-4">
            <div id="details-header" className="border-b border-slate-50 pb-3 flex items-center justify-between">
              <h3 id="details-title" className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Info size={14} className="text-slate-400" />
                Rincian Log Terpilih
              </h3>
              {selectedItem && (
                <button 
                  id="deselect-btn"
                  onClick={() => setSelectedItem(null)} 
                  className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg transition"
                  title="Tutup Detail"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {selectedItem ? (
              <div id="details-content" className="space-y-4 animate-fadeIn">
                <div id="details-status-box" className={`p-4 rounded-xl border flex gap-3 ${
                  selectedItem.is_blocked 
                    ? 'bg-rose-50/50 border-rose-100 text-rose-800' 
                    : 'bg-emerald-50/50 border-emerald-100 text-emerald-800'
                }`}>
                  <div id="status-icon-wrapper" className="shrink-0 mt-0.5">
                    {selectedItem.is_blocked ? (
                      <AlertOctagon size={18} className="text-rose-500 stroke-[2.5]" />
                    ) : (
                      <CheckCircle size={18} className="text-emerald-500 stroke-[2.5]" />
                    )}
                  </div>
                  <div>
                    <h4 id="status-lbl" className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status Keamanan</h4>
                    <p id="status-desc" className="text-xs font-bold leading-tight mt-0.5">{selectedItem.status || (selectedItem.is_blocked ? 'Akses Dibatasi' : 'Aktif')}</p>
                  </div>
                </div>

                <div id="details-toggle-box" className="pt-1">
                  <button
                    id="details-toggle-btn"
                    onClick={() => toggleBlockedStatus(selectedItem)}
                    disabled={togglingId === selectedItem.id}
                    className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 ${
                      selectedItem.is_blocked
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100'
                        : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-100'
                    }`}
                  >
                    {togglingId === selectedItem.id ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Memproses Perubahan...</span>
                      </>
                    ) : (
                      <span>{selectedItem.is_blocked ? 'Aktifkan Akses Jaringan' : 'Blokir Akses Jaringan'}</span>
                    )}
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span id="dtl-id-lbl" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID Log</span>
                    <span id="dtl-id-val" className="font-mono font-bold bg-slate-50 px-2 py-1 rounded-md inline-block mt-1 border border-slate-100 text-slate-800">
                      {selectedItem.id}
                    </span>
                  </div>

                  <div>
                    <span id="dtl-title-lbl" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Judul Kasus</span>
                    <p id="dtl-title-val" className="font-black text-slate-900 mt-0.5">{selectedItem.title || 'Tanpa Judul'}</p>
                  </div>

                  <div>
                    <span id="dtl-desc-lbl" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Keterangan</span>
                    <p id="dtl-desc-val" className="text-slate-500 leading-relaxed font-semibold mt-0.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                      {selectedItem.description || 'Tidak ada keterangan tambahan'}
                    </p>
                  </div>

                  {selectedItem.message && (
                    <div>
                      <span id="dtl-msg-lbl" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pesan Sistem</span>
                      <div id="dtl-msg-box" className="mt-1 flex gap-1.5 items-start bg-[#FAFBFD] p-3 rounded-xl border border-slate-100">
                        <CornerDownRight size={14} className="text-slate-400 shrink-0 mt-0.5" />
                        <p id="dtl-msg-val" className="text-slate-600 font-bold leading-relaxed">{selectedItem.message}</p>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3">
                    <span id="dtl-ref-lbl" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nomor Referensi</span>
                    <p id="dtl-ref-val" className="font-mono font-black text-slate-800 mt-0.5">{selectedItem.reference || '-'}</p>
                  </div>

                  <div>
                    <span id="dtl-date-lbl" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Waktu Tercatat</span>
                    <p id="dtl-date-val" className="text-slate-600 font-bold mt-0.5">{formatDate(selectedItem.created_at)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div id="no-selection-container" className="py-24 text-center text-slate-400 space-y-2">
                <Lock size={32} className="mx-auto text-slate-200 stroke-[1.5]" />
                <p id="no-sel-txt" className="text-xs font-bold uppercase tracking-wider text-slate-300">Pilih salah satu log</p>
                <p id="no-sel-sub" className="text-[11px] text-slate-400 font-semibold px-4">Klik pada baris tabel untuk memuat informasi teknis lengkap</p>
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
