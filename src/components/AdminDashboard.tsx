import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Package, 
  Image as ImageIcon,
  ChevronLeft,
  ExternalLink,
  LogOut,
  RefreshCw,
  Star,
  MapPin,
  TrendingUp,
  Store
} from 'lucide-react';
import { Product } from '../types';
import { initialProduksList } from '../data';

const generateProdukId = () => {
  const chars = 'asdf0123456789';
  let n = Date.now();
  let res = '';
  for (let i = 0; i < 8; i++) {
    const r = Math.floor(Math.random() * chars.length);
    res += chars[(n + r) % chars.length];
    n = Math.floor(n / chars.length);
  }
  return res;
};

interface AdminDashboardProps {
  produks: Product[];
  onAdd: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onRefresh?: () => Promise<void>;
  user: { id: string; username: string; name: string; role: 'admin' | 'super_admin' };
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  produks, 
  onAdd, 
  onEdit, 
  onDelete,
  onRefresh,
  user,
  onLogout
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [seeding, setSeeding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleCopyUrl = (p: Product) => {
    // If we have p.url and the user is super_admin, we can copy that; otherwise always copy the mirror URL
    const urlToCopy = (user.role === 'super_admin' && p.url) ? p.url : `${window.location.origin}/?produks_id=${p.produks_id}`;
    navigator.clipboard.writeText(urlToCopy).then(() => {
      setCopiedId(p.produks_id);
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy URL:', err);
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = urlToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedId(p.produks_id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (fallbackErr) {
        alert('Gagal menyalin URL');
      }
      document.body.removeChild(textArea);
    });
  };

  const handleLogout = async () => {
    try {
      const storedSession = sessionStorage.getItem('tokped_admin_session');
      const headers: Record<string, string> = {};
      if (storedSession) {
        headers['X-Admin-Session'] = storedSession;
      }
      const res = await fetch('/api/auth/logout', { 
        method: 'POST',
        headers
      });
      if (res.ok) {
        sessionStorage.removeItem('tokped_admin_session');
        onLogout();
      }
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  const handleTransition = async (produks_id: string, next_status: 'pending' | 'ready' | 'done') => {
    setTransitioningId(produks_id);
    try {
      const storedSession = sessionStorage.getItem('tokped_admin_session');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (storedSession) {
        headers['X-Admin-Session'] = storedSession;
      } else if (user) {
        headers['X-Admin-Session'] = JSON.stringify(user);
      }

      const res = await fetch('/api/produks/transition', {
        method: 'POST',
        headers,
        body: JSON.stringify({ produks_id, next_status }),
      });

      if (res.ok) {
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Gagal mengubah status');
      }
    } catch (error) {
      console.error('Error transitioning status:', error);
      alert('Gagal mengubah status: Kesalahan koneksi');
    } finally {
      setTransitioningId(null);
    }
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error("Failed to refresh products:", error);
      } finally {
        setRefreshing(false);
      }
    }
  };

  const handleSeedMocks = async () => {
    setSeeding(true);
    try {
      let count = 0;
      for (const p of initialProduksList) {
        if (!produks.some(existing => existing.produks_id === p.produks_id)) {
          await onAdd(p);
          count++;
        }
      }
      if (count > 0) {
        alert(`Berhasil menambahkan ${count} produk contoh ke database!`);
        if (onRefresh) await onRefresh();
      } else {
        alert("Semua produk contoh sudah ada di database.");
      }
    } catch (error) {
      console.error("Failed to seed mocks:", error);
      alert("Gagal memuat produk contoh");
    } finally {
      setSeeding(false);
    }
  };

  const emptyProduct: Product = {
    produks_id: '',
    title: '',
    description: '',
    category: 'Elektronik',
    brand: '',
    media: [''],
    stock_total: 1,
    stock_sold: 0,
    price: 0,
    sale_price: 0,
    colors: '[]',
    variants: '[]',
    shop_name: 'iBox Official Shop',
    shop_rating: 4.9,
    shop_followers: 1200000,
    shop_location: 'Jakarta Pusat',
    shop_response_time: '± 2 jam',
    shop_image: 'https://images.tokopedia.net/img/cache/215-square/shops-1/2020/1/22/7516801/7516801_f4f165e0-5cf0-43a5-bdfc-851f618a80d4.jpg',
    shop_verified: true,
    reviews_average: 5,
    reviews_total: 0,
    url: 'https://www.tokopedia.com'
  };

  const handleEdit = (product: Product) => {
    setFormData(product);
    setEditingId(product.produks_id);
    setIsAdding(false);
  };

  const handleAddNew = () => {
    setFormData({ ...emptyProduct, produks_id: generateProdukId() });
    setIsAdding(true);
    setEditingId(null);
  };

  const compressAndConvertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(dataUrl);
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('upload_preset', 'webflow');

    try {
      const response = await fetch('https://api.cloudinary.com/v1_1/daj5cu840/image/upload', {
        method: 'POST',
        body: uploadData,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.secure_url) {
        updateField('media', [...(formData.media || []), data.secure_url]);
      } else {
        throw new Error('No secure_url found in Cloudinary response');
      }
    } catch (error) {
      console.warn('Cloudinary upload failed, falling back to local base64 compression:', error);
      try {
        const base64Data = await compressAndConvertToBase64(file);
        updateField('media', [...(formData.media || []), base64Data]);
      } catch (fallbackError) {
        console.error('Local compression fallback failed:', fallbackError);
        alert('Gagal memuat gambar: ' + (fallbackError instanceof Error ? fallbackError.message : String(fallbackError)));
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!formData.produks_id || !formData.title) {
      alert("ID and Title are required!");
      return;
    }

    const finalProduct = {
      ...emptyProduct,
      ...formData,
      price: formData.price !== undefined ? formData.price : 0,
      stock_total: formData.stock_total !== undefined ? formData.stock_total : 1,
      stock_sold: formData.stock_sold !== undefined ? formData.stock_sold : 0,
      shop_rating: formData.shop_rating !== undefined ? formData.shop_rating : 4.9,
      reviews_average: formData.reviews_average !== undefined ? formData.reviews_average : 5,
    };

    try {
      if (isAdding) {
        await onAdd(finalProduct as Product);
      } else {
        await onEdit(finalProduct as Product);
      }
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error("Gagal menyimpan produk:", error);
    }
    setEditingId(null);
    setIsAdding(false);
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  let content;

  if (editingId || isAdding) {
    content = (
      <div className="w-full h-full flex flex-col bg-[#F8FAFC] relative overflow-hidden">
        {/* Sticky Header */}
        <header className="flex-shrink-0 px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
          <button 
            onClick={() => { setEditingId(null); setIsAdding(false); }} 
            className="p-2 hover:bg-gray-50 text-gray-600 rounded-full active:scale-95 transition-all"
          >
            <ChevronLeft size={20} className="stroke-[2.5]" />
          </button>
          <div>
            <h1 className="text-base font-black text-gray-900 tracking-tight leading-none mb-1">
              {isAdding ? "Tambah Produk" : "Edit Produk"}
            </h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Formulir Produk</p>
          </div>
        </header>

        {/* Form Fields */}
        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-24 space-y-6 no-scrollbar">
          {/* Main Info */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100/80 shadow-sm space-y-4">
            <h2 className="text-[11px] font-black text-green-600 uppercase tracking-widest border-b border-green-50 pb-2 mb-2">Informasi Utama</h2>
            
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Nama Produk</label>
              <input 
                type="text" 
                value={formData.title || ''} 
                onChange={e => updateField('title', e.target.value)}
                className="w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 placeholder:text-gray-300 outline-none focus:bg-white focus:border-[#00AA5B] focus:ring-2 focus:ring-green-100 transition-all duration-200"
                placeholder="Contoh: iPhone 14 Pro Max 256GB"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Brand</label>
                <input 
                  type="text" 
                  value={formData.brand || ''} 
                  onChange={e => updateField('brand', e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 placeholder:text-gray-300 outline-none focus:bg-white focus:border-[#00AA5B] focus:ring-2 focus:ring-green-100 transition-all duration-200"
                  placeholder="Apple"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Kategori</label>
                <select 
                  value={formData.category || 'Elektronik'} 
                  onChange={e => updateField('category', e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#00AA5B] focus:ring-2 focus:ring-green-100 transition-all duration-200"
                >
                  <option value="Elektronik">Elektronik</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Kecantikan">Kecantikan</option>
                  <option value="Rumah Tangga">Rumah Tangga</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Deskripsi Produk</label>
              <textarea 
                value={formData.description || ''} 
                onChange={e => updateField('description', e.target.value)}
                className="w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 placeholder:text-gray-300 outline-none focus:bg-white focus:border-[#00AA5B] focus:ring-2 focus:ring-green-100 transition-all duration-200 min-h-[100px] resize-none"
                placeholder="Tulis spesifikasi lengkap..."
              />
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100/80 shadow-sm space-y-4">
            <h2 className="text-[11px] font-black text-green-600 uppercase tracking-widest border-b border-green-50 pb-2 mb-2">Harga & Persediaan</h2>
            
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Harga Jual (Rp)</label>
              <input 
                type="number" 
                value={formData.sale_price || ''} 
                onChange={e => updateField('sale_price', Number(e.target.value))}
                className="w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 placeholder:text-gray-300 outline-none focus:bg-white focus:border-[#00AA5B] focus:ring-2 focus:ring-green-100 transition-all duration-200"
                placeholder="0"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Stok Total</label>
                <input 
                  type="number" 
                  value={formData.stock_total !== undefined ? formData.stock_total : ''} 
                  onChange={e => updateField('stock_total', Number(e.target.value))}
                  className="w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 placeholder:text-gray-300 outline-none focus:bg-white focus:border-[#00AA5B] focus:ring-2 focus:ring-green-100 transition-all duration-200"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Terjual</label>
                <input 
                  type="number" 
                  value={formData.stock_sold !== undefined ? formData.stock_sold : ''} 
                  onChange={e => updateField('stock_sold', Number(e.target.value))}
                  className="w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 placeholder:text-gray-300 outline-none focus:bg-white focus:border-[#00AA5B] focus:ring-2 focus:ring-green-100 transition-all duration-200"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Media Uploder */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100/80 shadow-sm space-y-4">
            <h2 className="text-[11px] font-black text-green-600 uppercase tracking-widest border-b border-green-50 pb-2 mb-2">Media & Gambar</h2>
            
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Daftar Link Gambar (Satu per baris)</label>
              
              <div className="grid grid-cols-4 gap-2">
                {(formData.media || []).map((url, idx) => (
                  <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100 relative group flex items-center justify-center">
                    {url ? (
                      <>
                        <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => {
                            const nextMedia = [...(formData.media || [])];
                            nextMedia.splice(idx, 1);
                            updateField('media', nextMedia);
                          }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <ImageIcon size={20} className="text-gray-300" />
                    )}
                  </div>
                ))}
                
                <label className={`aspect-square rounded-xl border border-dashed border-gray-200 hover:border-green-500 cursor-pointer flex flex-col items-center justify-center text-gray-400 hover:text-green-600 transition-all ${uploading ? 'animate-pulse pointer-events-none' : ''}`}>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  <Plus size={20} className={uploading ? 'animate-spin' : ''} />
                  <span className="text-[8px] font-bold uppercase tracking-wider mt-1">{uploading ? 'Proses' : 'Upload'}</span>
                </label>
              </div>

              <textarea 
                value={(formData.media || []).join('\n')} 
                onChange={e => updateField('media', e.target.value.split('\n'))}
                className="w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-4 py-3 text-[11px] font-mono text-gray-600 placeholder:text-gray-300 outline-none focus:bg-white focus:border-[#00AA5B] focus:ring-2 focus:ring-green-100 transition-all duration-200 min-h-[80px]"
                placeholder="Atau tempel link gambar di sini..."
              />
            </div>
          </div>

          {/* Shop Information */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100/80 shadow-sm space-y-4">
            <h2 className="text-[11px] font-black text-green-600 uppercase tracking-widest border-b border-green-50 pb-2 mb-2">Informasi Toko</h2>
            
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Nama Toko Resmi</label>
              <input 
                type="text" 
                value={formData.shop_name || ''} 
                onChange={e => updateField('shop_name', e.target.value)}
                className="w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 placeholder:text-gray-300 outline-none focus:bg-white focus:border-[#00AA5B] focus:ring-2 focus:ring-green-100 transition-all duration-200"
                placeholder="Nama Toko Resmi"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Lokasi Toko</label>
              <input 
                type="text" 
                value={formData.shop_location || ''} 
                onChange={e => updateField('shop_location', e.target.value)}
                className="w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 placeholder:text-gray-300 outline-none focus:bg-white focus:border-[#00AA5B] focus:ring-2 focus:ring-green-100 transition-all duration-200"
                placeholder="Lokasi pengiriman (Contoh: Jakarta Barat)"
              />
            </div>

            {user.role === 'super_admin' && (
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">URL Produk (Hanya Super Admin)</label>
                <input 
                  type="text" 
                  value={formData.url || ''} 
                  onChange={e => updateField('url', e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 placeholder:text-gray-300 outline-none focus:bg-white focus:border-[#00AA5B] focus:ring-2 focus:ring-green-100 transition-all duration-200"
                  placeholder="https://tokopedia.com/..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer */}
        <footer className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 flex gap-3 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <button 
            onClick={() => { setEditingId(null); setIsAdding(false); }} 
            className="flex-1 py-3.5 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition active:scale-95 text-xs uppercase tracking-wider"
          >
            Batal
          </button>
          <button 
            onClick={handleSave} 
            className="flex-1 py-3.5 bg-[#00AA5B] hover:bg-[#009650] text-white rounded-xl font-black shadow-lg shadow-green-100 flex items-center justify-center gap-2 active:scale-95 transition text-xs uppercase tracking-wider"
          >
            <Save size={14} /> Simpan
          </button>
        </footer>
      </div>
    );
  } else {
    content = (
      <div className="w-full h-full flex flex-col bg-[#FAFBFD] relative overflow-hidden">
        
        {/* Compact Admin Info Header (Name, Username, Role) */}
        <header className="p-4 bg-white border-b border-gray-100 sticky top-0 z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-[#00AA5B]">
                <Store size={18} />
              </div>
              <div>
                <h1 className="text-xs font-black text-gray-900 tracking-tight leading-none mb-0.5">Admin Dashboard</h1>
                <p className="text-[9px] text-[#00AA5B] font-black uppercase tracking-wider">
                  {user.role === 'super_admin' ? 'Super Admin' : 'Admin Area'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleRefresh} 
                disabled={refreshing}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition"
                title="Refresh Database"
              >
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              </button>
              
              <button 
                onClick={handleLogout} 
                className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition"
                title="Logout"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>

          {/* User Details & Seeder */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-2.5 border border-gray-100">
            <div className="min-w-0">
              <div className="text-[11px] font-black text-gray-800 truncate">{user.name}</div>
              <div className="text-[9px] text-gray-400 font-bold lowercase">@{user.username}</div>
            </div>

            <div className="flex items-center gap-1.5">
              {produks.length === 0 && (
                <button 
                  onClick={handleSeedMocks} 
                  disabled={seeding}
                  className="py-1 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-amber-700 text-[9px] font-black uppercase tracking-wider transition"
                >
                  {seeding ? 'Memuat...' : 'Mocks'}
                </button>
              )}
              <button 
                onClick={handleAddNew} 
                className="py-1 px-2 bg-[#00AA5B] hover:bg-[#00914d] text-white text-[9px] font-black uppercase tracking-wider rounded-lg transition flex items-center gap-1"
              >
                <Plus size={10} className="stroke-[3]" />
                <span>Tambah</span>
              </button>
            </div>
          </div>
        </header>

        {/* Product Cards Container (Mobile Cards) */}
        <main className="flex-1 p-3 space-y-2.5 overflow-y-auto no-scrollbar pb-16">
          {produks.map((p, idx) => {
            const currentStatus = p.internal_status || 'pending';
            
            // Status Tag colors & text
            let statusLabel = 'PENDING';
            let statusStyle = 'bg-amber-50 text-amber-700 border-amber-100';
            if (currentStatus === 'ready') {
              statusLabel = 'READY';
              statusStyle = 'bg-blue-50 text-blue-700 border-blue-100';
            } else if (currentStatus === 'done') {
              statusLabel = 'DONE';
              statusStyle = 'bg-green-50 text-green-700 border-green-100';
            }

            return (
              <div 
                key={p.produks_id || `admin-prod-${idx}`} 
                className="bg-white rounded-2xl p-3.5 border border-gray-100 flex flex-col gap-3 hover:border-gray-200 transition-colors duration-150 shadow-[0_2px_8px_rgba(0,0,0,0.015)]"
              >
                {/* Image and Basic Info Row */}
                <div className="flex gap-3 items-start">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100 flex items-center justify-center">
                    {p.media?.[0] ? (
                      <img src={p.media[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[8px] font-black text-[#00AA5B] bg-green-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                        {p.brand || 'No Brand'}
                      </span>
                      <span className="text-[8px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                        {p.category}
                      </span>
                    </div>

                    <h3 className="text-[11px] font-black text-gray-900 leading-snug line-clamp-1 mb-1">{p.title}</h3>
                    
                    {/* Prices list - non shortened, full Rupiah */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-black text-gray-950">{formatRupiah(p.sale_price)}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Info Grid (Stock, Location, Shop name, rating) */}
                <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-xl p-2.5 border border-gray-100/50 text-[9px] font-bold text-gray-500">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <TrendingUp size={10} className="text-gray-400 shrink-0" />
                      <span>Stok: <strong className="text-gray-800">{p.stock_total}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star size={10} className="text-amber-500 shrink-0 fill-amber-500" />
                      <span>Rating: <strong className="text-gray-800">{p.shop_rating}</strong></span>
                    </div>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1 truncate">
                      <Store size={10} className="text-gray-400 shrink-0" />
                      <span className="truncate">{p.shop_name}</span>
                    </div>
                    <div className="flex items-center gap-1 truncate">
                      <MapPin size={10} className="text-gray-400 shrink-0" />
                      <span className="truncate">{p.shop_location}</span>
                    </div>
                  </div>
                </div>

                {/* Status Indicator Bar */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status:</span>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${statusStyle}`}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* Role Transition Button (Swap/Toggle) */}
                  {user.role === 'admin' && (currentStatus === 'pending' || currentStatus === 'ready') && (
                    <button 
                      onClick={() => handleTransition(p.produks_id, currentStatus === 'pending' ? 'ready' : 'pending')}
                      disabled={transitioningId === p.produks_id}
                      className={`py-1 px-2.5 rounded-lg shadow-sm transition duration-150 active:scale-95 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        currentStatus === 'pending' 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      <RefreshCw size={8} className={transitioningId === p.produks_id ? 'animate-spin' : ''} />
                      <span>{transitioningId === p.produks_id ? 'Proses...' : currentStatus === 'pending' ? 'Mark Ready' : 'Swap Pending'}</span>
                    </button>
                  )}

                  {user.role === 'super_admin' && (currentStatus === 'ready' || currentStatus === 'done') && (
                    <button 
                      onClick={() => handleTransition(p.produks_id, currentStatus === 'ready' ? 'done' : 'ready')}
                      disabled={transitioningId === p.produks_id}
                      className={`py-1 px-2.5 rounded-lg shadow-sm transition duration-150 active:scale-95 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        currentStatus === 'ready' 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <RefreshCw size={8} className={transitioningId === p.produks_id ? 'animate-spin' : ''} />
                      <span>{transitioningId === p.produks_id ? 'Proses...' : currentStatus === 'ready' ? 'Mark Done' : 'Swap Ready'}</span>
                    </button>
                  )}
                </div>

                {/* Operations & Optional Super Admin URL Block */}
                <div className="grid grid-cols-3 gap-1.5 border-t border-gray-50 pt-2.5">
                  {user.role === 'super_admin' && p.url ? (
                    <button 
                      onClick={() => window.open(p.url, '_blank')} 
                      className="flex items-center justify-center gap-1 py-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wider rounded-lg transition active:scale-95 border border-emerald-100" 
                      title="Buka URL Tokopedia"
                    >
                      <ExternalLink size={10} />
                      <span>Link</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => window.open(`/?produks_id=${p.produks_id}`, '_blank')} 
                      className="flex items-center justify-center gap-1 py-1 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-wider rounded-lg transition active:scale-95 border border-slate-100" 
                      title="Buka Detail Tokopedia"
                    >
                      <ExternalLink size={10} />
                      <span>Buka</span>
                    </button>
                  )}

                  <button 
                    onClick={() => handleEdit(p)} 
                    className="flex items-center justify-center gap-1 py-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-wider rounded-lg transition active:scale-95 border border-blue-100" 
                    title="Edit"
                  >
                    <Edit3 size={10} />
                    <span>Edit</span>
                  </button>

                  <button 
                    onClick={() => { if(confirm('Hapus produk ini?')) onDelete(p.produks_id) }} 
                    className="flex items-center justify-center gap-1 py-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[9px] font-black uppercase tracking-wider rounded-lg transition active:scale-95 border border-rose-100" 
                    title="Hapus"
                  >
                    <Trash2 size={10} />
                    <span>Hapus</span>
                  </button>
                </div>

                {/* Copy URL Button - available ONLY if status is done */}
                {currentStatus === 'done' && (
                  <button 
                    onClick={() => handleCopyUrl(p)}
                    className={`w-full py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 border ${
                      copiedId === p.produks_id
                        ? 'bg-[#00AA5B] border-[#00AA5B] text-white shadow-md shadow-green-100'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200/60 text-slate-700'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      {copiedId === p.produks_id ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376A8.965 8.965 0 0012 12.75a8.965 8.965 0 00-3.75 4.002m9.75 3.125c.621 0 1.125-.504 1.125-1.125V9.75c0-.621-.504-1.125-1.125-1.125h-3.375c-.621 0-1.125.504-1.125 1.125v3.375c0 .621.504 1.125 1.125 1.125h3.375z" />
                      )}
                    </svg>
                    <span>{copiedId === p.produks_id ? 'Berhasil Disalin!' : 'Salin URL Produk'}</span>
                  </button>
                )}
              </div>
            );
          })}

          {produks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 border border-gray-100">
                <Package size={28} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black text-gray-900">Belum ada produk</p>
                <p className="text-[10px] text-gray-400 font-bold max-w-[200px] mx-auto uppercase tracking-wide">Tambahkan item baru sekarang</p>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 md:bg-[#0B0F19] flex items-center justify-center font-sans relative antialiased selection:bg-[#00AA5B]/20">
      {/* Premium background light glow on desktop */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-green-500/10 blur-[120px]" />
        <div className="absolute top-1/2 right-10 w-80 h-80 rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      {/* Main smartphone device frame mockup on desktop, full-screen on mobile */}
      <div className="w-full h-screen md:h-[850px] md:max-w-[412px] bg-white md:rounded-[48px] md:border-[12px] md:border-slate-900 md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative flex flex-col overflow-hidden transition-all duration-300 md:ring-1 md:ring-white/10">
        
        {/* Dynamic Notch / Island on desktop */}
        <div className="hidden md:flex absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-50 items-center justify-center pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-950 mr-2 border border-white/5" />
          <div className="w-12 h-1 bg-slate-950 rounded-full" />
        </div>

        {/* Dynamic status bar for authentic mobile experience */}
        <div className="flex-shrink-0 px-6 pt-3 pb-1 flex justify-between items-center text-[10px] font-black text-gray-500 bg-white select-none z-40 border-b border-gray-50">
          <span>09:41</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.79-1.79C9.09 19.63 10.51 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
            </svg>
            <span className="text-[9px] font-bold">5G</span>
            <div className="w-5 h-2.5 border border-gray-400 rounded-sm p-0.5 flex items-center">
              <div className="h-full w-3.5 bg-gray-500 rounded-[1px]" />
            </div>
          </div>
        </div>

        {/* Device content space */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50">
          {content}
        </div>

        {/* Bottom virtual home indicator on desktop */}
        <div className="hidden md:flex flex-shrink-0 h-4 bg-white items-center justify-center select-none z-40">
          <div className="w-28 h-1 bg-gray-300 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
