import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Package, 
  Store, 
  Image as ImageIcon,
  ChevronLeft,
  ExternalLink,
  RefreshCw,
  Lock,
  Delete
} from 'lucide-react';
import { Product, ColorVariant, StorageVariant } from '../types';
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
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  produks, 
  onAdd, 
  onEdit, 
  onDelete,
  onRefresh 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [seeding, setSeeding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [pin, setPin] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const handleNumClick = (num: string) => {
    if (pin.length >= 6) return;
    setPinError(null);
    const newPin = pin + num;
    setPin(newPin);

    if (newPin.length === 6) {
      if (newPin === '677677') {
        setIsAuthenticated(true);
        setPin('');
      } else {
        setPinError('PIN salah, silakan coba lagi');
        setPin('');
      }
    }
  };

  const handleBackspace = () => {
    setPinError(null);
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPinError(null);
    setPin('');
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

  const [uploading, setUploading] = useState(false);

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
        img.onerror = (err) => {
          reject(err);
        };
      };
      reader.onerror = (err) => {
        reject(err);
      };
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
      // Reset input
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

  const updateNestedField = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...(prev as any)[parent], [field]: value }
    }));
  };

  if (editingId || isAdding) {
    return (
      <div className="w-full h-full flex flex-col bg-[#F8FAFC] relative overflow-hidden">
        {/* Sticky Header */}
        <header className="flex-shrink-0 px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
          <button 
            onClick={() => { setEditingId(null); setIsAdding(false); }} 
            className="p-2 hover:bg-gray-50 text-gray-600 rounded-full active:scale-95 transition-all"
          >
            <ChevronLeft size={20} className="stroke-[2.5]" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-base font-black text-gray-900 tracking-tight">
              {isAdding ? 'Tambah Produk Baru' : 'Ubah Detail Produk'}
            </h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              {isAdding ? 'Buat item katalog baru' : `ID: ${formData.produks_id || '-'}`}
            </p>
          </div>
        </header>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-5 pb-24 no-scrollbar">
          {/* Card 1: Informasi Utama */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
              <span className="w-1 h-4 bg-[#00AA5B] rounded-full"></span>
              <h2 className="text-xs font-black text-gray-800 uppercase tracking-wider">Informasi Utama</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">ID Produk (Unik)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={formData.produks_id || ''} 
                    onChange={e => updateField('produks_id', e.target.value.replace(/[^asdf0123456789]/g, '').slice(0, 8))}
                    className="flex-1 bg-[#FAFAFA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-mono tracking-wider font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#00AA5B] focus:ring-2 focus:ring-green-100 transition-all duration-200"
                    placeholder="a1s2d3f4"
                    maxLength={8}
                  />
                  <button 
                    onClick={() => updateField('produks_id', generateProdukId())}
                    className="p-3 bg-green-50 text-[#00AA5B] rounded-xl hover:bg-green-100 transition-all active:scale-95 border border-green-100 flex items-center justify-center shrink-0"
                    title="Generate ID Baru"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Judul Produk</label>
                <input 
                  type="text" 
                  value={formData.title || ''} 
                  onChange={e => updateField('title', e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 placeholder:text-gray-300 outline-none focus:bg-white focus:border-[#00AA5B] focus:ring-2 focus:ring-green-100 transition-all duration-200"
                  placeholder="Masukkan judul lengkap produk"
                />
              </div>

              <input type="hidden" value={formData.price !== undefined ? formData.price : 0} />
              <input type="hidden" value={formData.stock_total !== undefined ? formData.stock_total : 1} />
              <input type="hidden" value={formData.stock_sold !== undefined ? formData.stock_sold : 0} />

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Harga Jual</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Rp</span>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={formData.sale_price ? Number(formData.sale_price).toLocaleString('id-ID') : ''} 
                    onChange={e => {
                      const clean = e.target.value.replace(/\D/g, '');
                      updateField('sale_price', clean ? Number(clean) : 0);
                    }}
                    className="w-full bg-[#FAFAFA] border border-gray-100 rounded-xl pl-10 pr-4 py-3 text-sm font-black text-[#00AA5B] outline-none focus:bg-white focus:border-[#00AA5B] focus:ring-2 focus:ring-green-100 transition-all duration-200"
                    placeholder="Contoh: 150.000"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Deskripsi Produk</label>
                <textarea 
                  rows={4}
                  value={formData.description || ''} 
                  onChange={e => updateField('description', e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 placeholder:text-gray-300 outline-none focus:bg-white focus:border-[#00AA5B] focus:ring-2 focus:ring-green-100 transition-all duration-200 resize-none"
                  placeholder="Tulis spesifikasi lengkap dan keunggulan produk..."
                />
              </div>
            </div>
          </div>

          {/* Card 2: Media & Gambar */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
              <span className="w-1 h-4 bg-[#00AA5B] rounded-full"></span>
              <h2 className="text-xs font-black text-gray-800 uppercase tracking-wider">Media & Gambar</h2>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Daftar URL Gambar</label>
              <div className="space-y-2">
                {(formData.media || []).map((url, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                      {url ? (
                        <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </div>
                    <input 
                      type="text" 
                      value={url} 
                      onChange={e => {
                        const newMedia = [...(formData.media || [])];
                        newMedia[idx] = e.target.value;
                        updateField('media', newMedia);
                      }}
                      className="flex-1 bg-[#FAFAFA] border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#00AA5B] transition-all"
                      placeholder="Masukkan URL Gambar"
                    />
                    <button 
                      onClick={() => {
                        const newMedia = (formData.media || []).filter((_, i) => i !== idx);
                        updateField('media', newMedia);
                      }} 
                      className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                ))}
                
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <label className={`cursor-pointer py-3 border border-dashed rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${uploading ? 'bg-gray-50 border-gray-200 text-gray-400' : 'border-[#00AA5B]/30 hover:border-[#00AA5B] text-[#00AA5B] bg-green-50/30 hover:bg-green-50'}`}>
                    <ImageIcon size={14} /> 
                    {uploading ? 'Mengunggah...' : 'Upload File'}
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                  <button 
                    onClick={() => updateField('media', [...(formData.media || []), ''])}
                    className="py-3 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-black flex items-center justify-center gap-2 hover:bg-gray-50 hover:text-gray-600 transition-all"
                  >
                    <Plus size={14} /> Tambah URL
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Informasi Toko */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
              <span className="w-1 h-4 bg-[#00AA5B] rounded-full"></span>
              <h2 className="text-xs font-black text-gray-800 uppercase tracking-wider">Informasi Toko</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Nama Toko</label>
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

              <input type="hidden" value={formData.shop_rating !== undefined ? formData.shop_rating : 4.9} />
              <input type="hidden" value={formData.reviews_average !== undefined ? formData.reviews_average : 5} />

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">URL Produk (Tokopedia)</label>
                <input 
                  type="text" 
                  value={formData.url || ''} 
                  onChange={e => updateField('url', e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 placeholder:text-gray-300 outline-none focus:bg-white focus:border-[#00AA5B] focus:ring-2 focus:ring-green-100 transition-all duration-200"
                  placeholder="https://tokopedia.link/..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer with subtle outline and shadow */}
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
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full h-full flex flex-col bg-white max-w-md mx-auto relative overflow-hidden select-none">
        {/* Header with back button */}
        <header className="flex-shrink-0 px-4 py-4 border-b border-gray-50 flex items-center gap-3">
          <button 
            onClick={() => window.location.href = '/'} 
            className="p-2 hover:bg-gray-50 text-gray-600 rounded-full active:scale-95 transition-all"
          >
            <ChevronLeft size={20} className="stroke-[2.5]" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-base font-black text-gray-950 tracking-tight">Katalog Admin</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Area Terbatas</p>
          </div>
        </header>

        {/* Content of PIN screen */}
        <div className="flex-1 flex flex-col justify-between p-6">
          {/* Lock Icon & Title */}
          <div className="flex flex-col items-center justify-center mt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
              <Lock size={28} className="stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-black text-gray-950">Masukkan PIN Admin</h2>
              <p className="text-xs font-bold text-gray-400">Silakan masukkan 6 digit PIN keamanan untuk mengakses</p>
            </div>
          </div>

          {/* 6 Column Input slots */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isFilled = pin.length > idx;
                return (
                  <div 
                    key={idx}
                    className={`w-11 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-100 ${
                      pinError 
                        ? 'border-red-500 bg-red-50/50' 
                        : isFilled 
                          ? 'border-[#00AA5B] bg-green-50/20' 
                          : 'border-gray-100 bg-[#FAFAFA]'
                    }`}
                  >
                    <div 
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-75 ${
                        isFilled 
                          ? 'bg-[#00AA5B] scale-100' 
                          : 'bg-transparent scale-0'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            {pinError && (
              <p className="text-xs font-bold text-red-500 text-center">
                {pinError}
              </p>
            )}
          </div>

          {/* custom mobile on-screen Numberpad (numpad) */}
          <div className="w-full max-w-xs mx-auto pb-6">
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumClick(num)}
                  className="h-14 rounded-2xl bg-[#FAFAFA] active:bg-gray-100 hover:bg-gray-50 flex items-center justify-center text-lg font-extrabold text-gray-900 transition-colors duration-75 active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="h-14 rounded-2xl bg-transparent flex items-center justify-center text-xs font-black text-gray-400 hover:text-gray-600 active:scale-95 transition-all duration-75"
              >
                CLEAR
              </button>
              <button
                onClick={() => handleNumClick('0')}
                className="h-14 rounded-2xl bg-[#FAFAFA] active:bg-gray-100 hover:bg-gray-50 flex items-center justify-center text-lg font-extrabold text-gray-900 transition-colors duration-75 active:scale-95"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="h-14 rounded-2xl bg-transparent flex items-center justify-center text-gray-500 hover:text-gray-700 active:scale-95 transition-all duration-75"
                title="Hapus"
              >
                <Delete size={20} className="stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 flex flex-col max-w-md mx-auto shadow-2xl relative">
      <header className="p-4 bg-white border-b sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
           <button onClick={() => window.location.href = '/'} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Katalog Admin</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleAddNew} className="p-2.5 bg-green-500 text-white rounded-full shadow-lg shadow-green-100 active:scale-95 transition">
            <Plus size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
        {produks.map((p, idx) => (
          <div key={p.produks_id || `admin-prod-${idx}`} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3 group">
            <div className="flex gap-4 items-start">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-50 transition-transform group-hover:scale-105">
                {p.media?.[0] ? (
                  <img src={p.media[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                    <ImageIcon size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{p.brand}</p>
                <h3 className="text-[14px] font-bold text-gray-900 leading-tight line-clamp-2 mb-2">{p.title}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-black text-green-600">Rp {(p.sale_price/1000000).toFixed(1)}jt</span>
                  <span className="text-[10px] text-gray-400 line-through">Rp {(p.price/1000000).toFixed(1)}jt</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-gray-50 pt-2">
              <button 
                onClick={() => window.open(`/?produks_id=${p.produks_id}`, '_blank')} 
                className="flex items-center justify-center gap-1.5 py-2 px-1 bg-blue-50 text-blue-600 text-[11px] font-extrabold rounded-xl transition hover:bg-blue-100 active:scale-95" 
                title="Buka Produk"
              >
                <ExternalLink size={13} />
                <span>Buka</span>
              </button>
              <button 
                onClick={() => handleEdit(p)} 
                className="flex items-center justify-center gap-1.5 py-2 px-1 bg-green-50 text-green-600 text-[11px] font-extrabold rounded-xl transition hover:bg-green-100 active:scale-95" 
                title="Edit Produk"
              >
                <Edit3 size={13} />
                <span>Edit</span>
              </button>
              <button 
                onClick={() => { if(confirm('Hapus produk ini?')) onDelete(p.produks_id) }} 
                className="flex items-center justify-center gap-1.5 py-2 px-1 bg-red-50 text-red-600 text-[11px] font-extrabold rounded-xl transition hover:bg-red-100 active:scale-95" 
                title="Hapus Produk"
              >
                <Trash2 size={13} />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        ))}

        {produks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <Package size={40} className="text-gray-300" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="font-bold text-gray-900">Belum ada produk</p>
              <p className="text-sm text-gray-500 mb-3">Tambahkan produk baru dengan mengklik tombol + di kanan atas</p>
            </div>
          </div>
        )}
      </main>

      
    </div>
  );
};

export default AdminDashboard;
