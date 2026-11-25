import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Search
} from 'lucide-react';
import { Product, ProductFeature, ColorVariant, StorageVariant, createDefaultProductFeatures } from '../types';
import { initialProduksList } from '../data';
import { adminUploadImage } from '../lib/adminApi';

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
  role: 'admin' | 'users';
  enableManagementTabs?: boolean;
  produksLoading?: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  produks, 
  onAdd, 
  onEdit, 
  onDelete,
  onRefresh,
  role,
  enableManagementTabs = false,
  produksLoading = false
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [routeNotFound, setRouteNotFound] = useState(false);
  const initializedRoute = useRef('');
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [seeding, setSeeding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Semua');

  const uniqueBrands = React.useMemo(() => {
    const list = new Set<string>();
    produks.forEach(p => {
      if (p.brand) list.add(p.brand);
    });
    return ['Semua', ...Array.from(list)];
  }, [produks]);

  const filteredProduks = React.useMemo(() => {
    return produks.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (p.produks_id && p.produks_id.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesBrand = selectedBrand === 'Semua' || p.brand === selectedBrand;
      return matchesSearch && matchesBrand;
    });
  }, [produks, searchQuery, selectedBrand]);

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
    features: createDefaultProductFeatures(),
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

  useEffect(() => {
    if (!enableManagementTabs) return;
    const path = location.pathname.replace(/\/$/, '');
    if (!path.startsWith('/admin/produks/')) {
      initializedRoute.current = ''; setEditingId(null); setIsAdding(false); setRouteNotFound(false); return;
    }
    if (initializedRoute.current === path) return;
    initializedRoute.current = path; setRouteNotFound(false);
    if (path === '/admin/produks/new') {
      setFormData({ ...emptyProduct, produks_id: generateProdukId() }); setIsAdding(true); setEditingId(null); return;
    }
    const productId = decodeURIComponent(path.slice('/admin/produks/'.length));
    const product = produks.find(item => item.produks_id === productId);
    if (!product) { setEditingId(null); setIsAdding(false); setRouteNotFound(true); return; }
    setFormData({ ...product, features: Array.isArray(product.features) ? product.features : createDefaultProductFeatures() });
    setEditingId(product.produks_id); setIsAdding(false);
  }, [location.pathname, produks, enableManagementTabs]);

  const handleEdit = (product: Product) => {
    if (enableManagementTabs) navigate('/admin/produks/' + encodeURIComponent(product.produks_id));
    else { setFormData({ ...product, features: Array.isArray(product.features) ? product.features : createDefaultProductFeatures() }); setEditingId(product.produks_id); setIsAdding(false); }
  };
  const handleAddNew = () => {
    if (enableManagementTabs) navigate('/admin/produks/new');
    else { setFormData({ ...emptyProduct, produks_id: generateProdukId() }); setIsAdding(true); setEditingId(null); }
  };
  const handleCancel = () => {
    if (enableManagementTabs) navigate('/admin');
    else { setEditingId(null); setIsAdding(false); }
  };

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.type)) {
      alert('Format gambar harus JPEG, PNG, WebP, GIF, atau AVIF.');
      e.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 8 MB.');
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const uploaded = await adminUploadImage(file);
      updateField('media', [...(formData.media || []).filter(Boolean), uploaded.publicUrl]);
    } catch (error) {
      console.error('Supabase Storage upload failed:', error);
      alert('Gagal mengunggah gambar: ' + (error instanceof Error ? error.message : String(error)));
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
      const colors = typeof finalProduct.colors === 'string' ? JSON.parse(finalProduct.colors || '[]') : finalProduct.colors;
      const variants = typeof finalProduct.variants === 'string' ? JSON.parse(finalProduct.variants || '[]') : finalProduct.variants;
      const features = finalProduct.features;
      if (!Array.isArray(colors) || !Array.isArray(variants)) throw new Error('Warna dan varian harus berupa JSON array.');
      if (!Array.isArray(features) || !features.every((feature: ProductFeature) =>
        feature && typeof feature.label === 'string' && typeof feature.value === 'string'
      )) throw new Error('Fitur produk harus berupa daftar Label dan Value.');
      if (Number(finalProduct.stock_sold) > Number(finalProduct.stock_total)) throw new Error('Stok terjual tidak boleh melebihi total stok.');
      const payload = {
        ...finalProduct,
        features: features.map((feature: ProductFeature) => ({ label: feature.label, value: feature.value })),
        colors: JSON.stringify(colors),
        variants: JSON.stringify(variants),
        media: (finalProduct.media || []).filter(Boolean)
      } as Product;
      if (isAdding) await onAdd(payload);
      else await onEdit(payload);
      if (enableManagementTabs) navigate('/admin');
      else { setEditingId(null); setIsAdding(false); }
    } catch (error) {
      console.error("Gagal menyimpan produk:", error);
      alert("Gagal menyimpan produk: " + (error instanceof Error ? error.message : String(error)));
    }
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

  let content;

  if (editingId || isAdding) {
    content = (
      <div className={enableManagementTabs ? "w-full min-h-0 flex-1 flex flex-col bg-[#F8FAFC] relative" : "w-full h-full min-h-0 flex flex-col bg-[#F8FAFC] relative overflow-hidden"}>
        {!enableManagementTabs && (
          <>
          {/* Sticky Header */}
          <header className="flex-shrink-0 px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
            <button 
              onClick={handleCancel} 
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
          </>
        )}

        {/* Scrollable Form Content */}
        <div className={enableManagementTabs ? "content-admin min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-5 pb-24" : "content-admin min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-5 pb-24 no-scrollbar"}>
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

          {/* Spesifikasi dan Fitur */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-gray-800 uppercase tracking-wider">Spesifikasi dan Fitur</h2>
              <button
                type="button"
                onClick={() => updateField('features', [...(formData.features || []), { label: '', value: '' }])}
                className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-[11px] font-bold text-[#00AA5B]"
              >
                <Plus size={14} /> Tambah Fitur
              </button>
            </div>
            <div className="space-y-3">
              {(formData.features || []).map((feature, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <input
                    type="text"
                    aria-label={`Label fitur ${index + 1}`}
                    value={feature.label}
                    onChange={e => updateField('features', (formData.features || []).map((item, itemIndex) => itemIndex === index ? { ...item, label: e.target.value } : item))}
                    placeholder="Label"
                    className="min-w-0 w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-3 py-3 text-sm"
                  />
                  <input
                    type="text"
                    aria-label={`Value fitur ${index + 1}`}
                    value={feature.value}
                    onChange={e => updateField('features', (formData.features || []).map((item, itemIndex) => itemIndex === index ? { ...item, value: e.target.value } : item))}
                    placeholder="Value"
                    className="min-w-0 w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-3 py-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => updateField('features', (formData.features || []).filter((_, itemIndex) => itemIndex !== index))}
                    aria-label={`Hapus fitur ${index + 1}`}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {(formData.features || []).length === 0 && (
                <p className="text-xs text-gray-400">Belum ada fitur produk. Tambahkan fitur sesuai kebutuhan.</p>
              )}
            </div>
          </div>


          {/* Data Produk & Stok */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <h2 className="text-xs font-black text-gray-800 uppercase tracking-wider">Data Produk & Stok</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['category', 'Kategori', 'text'],
                ['brand', 'Merek', 'text'],
                ['price', 'Harga Normal (Rp)', 'number'],
                ['stock_total', 'Total Stok', 'number'],
                ['stock_sold', 'Stok Terjual', 'number']
              ].map(([field, label, type]) => (
                <label key={field} className="block text-[11px] font-bold text-gray-500">{label}
                  <input type={type as React.HTMLInputTypeAttribute} min={type === 'number' ? 0 : undefined} value={(formData as any)[field] ?? ''} onChange={e => updateField(field, type === 'number' ? Number(e.target.value) : e.target.value)} className="mt-1 w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-3 py-3 text-sm" />
                </label>
              ))}
            </div>
          </div>

          {/* Reputasi & Profil Toko */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <h2 className="text-xs font-black text-gray-800 uppercase tracking-wider">Reputasi & Profil Toko</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['shop_rating', 'Rating Toko'],
                ['shop_followers', 'Pengikut Toko'],
                ['reviews_average', 'Rata-rata Ulasan'],
                ['reviews_total', 'Jumlah Ulasan']
              ].map(([field, label]) => (
                <label key={field} className="block text-[11px] font-bold text-gray-500">{label}
                  <input type="number" min="0" step={field.includes('rating') || field.includes('average') ? '0.1' : '1'} value={(formData as any)[field] ?? 0} onChange={e => updateField(field, Number(e.target.value))} className="mt-1 w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-3 py-3 text-sm" />
                </label>
              ))}
              <label className="block text-[11px] font-bold text-gray-500 col-span-2">Waktu Respons
                <input type="text" value={formData.shop_response_time ?? ''} onChange={e => updateField('shop_response_time', e.target.value)} className="mt-1 w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-3 py-3 text-sm" />
              </label>
              <label className="block text-[11px] font-bold text-gray-500 col-span-2">URL Foto Toko
                <input type="url" value={formData.shop_image ?? ''} onChange={e => updateField('shop_image', e.target.value)} className="mt-1 w-full bg-[#FAFAFA] border border-gray-100 rounded-xl px-3 py-3 text-sm" />
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-600 col-span-2">
                <input type="checkbox" checked={Boolean(formData.shop_verified)} onChange={e => updateField('shop_verified', e.target.checked)} className="accent-green-600" /> Toko terverifikasi
              </label>
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

              {role === 'admin' && (
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
              )}
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
  } else {
    const formatRupiah = (num: number) => {
      return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    content = (
      <div className="w-full h-full min-h-0 flex flex-col bg-[#FAFBFD] relative overflow-hidden">
        {!enableManagementTabs && (
          <>
          <header className="p-4 bg-white border-b border-gray-100 sticky top-0 z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
               <button onClick={() => window.location.href = '/'} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition">
                <ChevronLeft size={18} />
              </button>
              <div>
                <h1 className="text-sm font-black text-gray-900 tracking-tight leading-none mb-0.5">Katalog Admin</h1>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Manage Store Items</p>
              </div>
            </div>
            {!enableManagementTabs && <button onClick={handleAddNew} className="py-1.5 px-3 bg-[#00AA5B] hover:bg-[#00914d] text-white text-[11px] font-black uppercase tracking-wider rounded-lg shadow-sm active:scale-95 transition flex items-center gap-1"><Plus size={14} className="stroke-[3]"/><span>Tambah</span></button>}
          </header>
          </>
        )}

        <main className={enableManagementTabs ? "content-admin min-h-0 flex-1 overflow-y-auto p-3 space-y-3.5 pb-6" : "content-admin min-h-0 flex-1 p-3 space-y-3.5 overflow-y-auto no-scrollbar pb-24"}>
          {enableManagementTabs && <button onClick={handleAddNew} className="w-full rounded-xl bg-[#00AA5B] px-4 py-3 text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-2"><Plus size={15}/> Tambah Produk</button>}
          {/* Dashboard KPI Banner */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.01)] overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-gray-50">
              <div className="p-4 flex flex-col">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Total Katalog</span>
                <span className="text-xl font-extrabold text-gray-900 tabular-nums">
                  {produks.length} <span className="text-xs font-semibold text-gray-400">produk</span>
                </span>
              </div>
              <div className="p-4 flex flex-col">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Rata-Rata Harga</span>
                <span className="text-sm font-extrabold text-[#00AA5B] tabular-nums truncate block">
                  {formatRupiah(Math.round(produks.reduce((acc, p) => acc + (p.sale_price || 0), 0) / (produks.length || 1)))}
                </span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-0.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Cari produk atau brand..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-xl pl-9 pr-8 py-2.5 text-xs font-semibold text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#00AA5B] focus:ring-4 focus:ring-green-500/10 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Brand Filter Horizontal Chips */}
          <div className="flex gap-1.5 overflow-x-auto px-0.5 py-0.5 scrollbar-none select-none">
            {uniqueBrands.map(b => (
              <button
                key={b}
                onClick={() => setSelectedBrand(b)}
                className={`px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg whitespace-nowrap transition-all duration-75 border ${
                  selectedBrand === b 
                    ? 'bg-[#00AA5B] text-white border-[#00AA5B] shadow-sm shadow-green-100' 
                    : 'bg-white text-gray-400 border-gray-100 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          {enableManagementTabs ? (
            <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-gray-800">Daftar Produk</h2>
                  <p className="mt-0.5 text-[10px] text-gray-400">{filteredProduks.length} produk ditampilkan</p>
                </div>
                <span className="shrink-0 rounded-lg bg-green-50 px-2.5 py-1 text-[10px] font-bold text-[#00AA5B]">Tabel Produk</span>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[1080px] border-collapse text-left">
                  <thead className="bg-gray-50">
                    <tr className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                      <th scope="col" className="px-4 py-3">Produk</th>
                      <th scope="col" className="px-3 py-3">Kategori</th>
                      <th scope="col" className="px-3 py-3">Brand</th>
                      <th scope="col" className="px-3 py-3 text-right">Harga Normal</th>
                      <th scope="col" className="px-3 py-3 text-right">Harga Jual</th>
                      <th scope="col" className="px-3 py-3 text-right">Terjual</th>
                      <th scope="col" className="px-3 py-3">Stok</th>
                      <th scope="col" className="px-4 py-3 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProduks.map((p, idx) => {
                      const sold = Number(p.stock_sold) || 0;
                      const total = Number(p.stock_total) || 0;
                      const stockPercent = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
                      const hasDiscount = Number(p.price) > Number(p.sale_price);
                      return (
                        <tr key={p.produks_id || `admin-prod-${idx}`} className="align-middle hover:bg-gray-50/70">
                          <td className="px-4 py-3">
                            <div className="flex min-w-[240px] items-center gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                                {p.media?.[0] ? (
                                  <img src={p.media[0]} alt={p.title} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                ) : (
                                  <ImageIcon size={18} className="text-gray-300" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="max-w-[280px] truncate text-xs font-bold text-gray-900" title={p.title}>{p.title || 'Tanpa judul'}</p>
                                <p className="mt-1 font-mono text-[10px] text-gray-400">{p.produks_id || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600">{p.category || '-'}</td>
                          <td className="px-3 py-3 text-xs font-semibold text-gray-700">{p.brand || 'No Brand'}</td>
                          <td className="px-3 py-3 text-right text-xs tabular-nums text-gray-500">{formatRupiah(p.price)}</td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-xs font-black tabular-nums text-[#00AA5B]">{formatRupiah(p.sale_price)}</span>
                            {hasDiscount && <span className="mt-0.5 block text-[10px] tabular-nums text-gray-400 line-through">{formatRupiah(p.price)}</span>}
                          </td>
                          <td className="px-3 py-3 text-right text-xs font-bold tabular-nums text-gray-700">{sold.toLocaleString('id-ID')}</td>
                          <td className="px-3 py-3">
                            <div className="w-28">
                              <div className="mb-1 flex items-center justify-between gap-2 text-[10px] tabular-nums">
                                <span className="font-bold text-gray-700">{Math.max(0, total - sold)} tersisa</span>
                                <span className="text-gray-400">{total}</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                                <div className="h-full rounded-full bg-[#00AA5B]" style={{ width: `${stockPercent}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button type="button" onClick={() => window.open(`/${p.produks_id}`, '_blank')} aria-label={`Lihat ${p.title}`} title="Lihat produk" className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100">
                                <ExternalLink size={14} />
                              </button>
                              <button type="button" onClick={() => handleEdit(p)} aria-label={`Ubah ${p.title}`} title="Ubah produk" className="rounded-lg border border-green-100 bg-green-50 p-2 text-[#00AA5B] transition hover:bg-green-100">
                                <Edit3 size={14} />
                              </button>
                              <button type="button" onClick={() => { if (window.confirm('Hapus produk ini?')) onDelete(p.produks_id); }} aria-label={`Hapus ${p.title}`} title="Hapus produk" className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-600 transition hover:bg-red-100">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {produksLoading && filteredProduks.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-xs font-semibold text-gray-400">Memuat data produk...</td></tr>
                    )}
                    {!produksLoading && filteredProduks.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-16 text-center">
                          <Package size={28} className="mx-auto text-gray-300" />
                          <p className="mt-3 text-xs font-black text-gray-900">Tidak ada produk ditemukan</p>
                          <p className="mt-1 text-[10px] text-gray-400">Coba kata kunci pencarian atau filter brand lain.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-gray-100 px-4 py-2 text-[10px] text-gray-400">Geser tabel ke samping untuk melihat seluruh kolom pada layar kecil.</p>
            </section>
          ) : (
            <>
              {/* Product Cards - retained for the legacy /makkasau interface */}
              {filteredProduks.map((p, idx) => {
                const hasDiscount = p.price > p.sale_price;
                return (
                  <div key={p.produks_id || `admin-prod-${idx}`} className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col gap-3.5 hover:border-gray-200 transition-colors duration-150 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                    <div className="flex gap-3.5 items-start">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100 flex items-center justify-center shadow-sm">
                        {p.media?.[0] ? (
                          <img src={p.media[0]} alt="" className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300">
                            <ImageIcon size={18} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 select-none">
                          <span>{p.brand || 'No Brand'}</span>
                          <span>·</span>
                          <span className="font-mono">{p.produks_id}</span>
                        </div>
                        <h3 className="text-xs font-bold text-gray-900 leading-snug line-clamp-1">{p.title}</h3>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-[13px] font-black text-[#00AA5B] tabular-nums">{formatRupiah(p.sale_price)}</span>
                          {hasDiscount && <span className="text-[10px] text-gray-400 line-through font-bold tabular-nums">{formatRupiah(p.price)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50/50 rounded-xl p-2.5">
                      <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">
                        <span>Stok Terjual</span>
                        <span className="text-gray-600 font-black tabular-nums">{p.stock_sold} / {p.stock_total} <span className="text-[8px] text-gray-400">item</span></span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#00AA5B] rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.round(((p.stock_sold || 0) / (p.stock_total || 1)) * 100))}%` }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-gray-100/50 pt-3">
                      <button onClick={() => window.open(`/${p.produks_id}`, '_blank')} className="flex items-center justify-center gap-1.5 h-10 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition active:scale-[0.97] border border-slate-100/50" title="Buka Produk">
                        <ExternalLink size={12} className="stroke-[2.5]" /><span>Lihat</span>
                      </button>
                      <button onClick={() => handleEdit(p)} className="flex items-center justify-center gap-1.5 h-10 bg-emerald-50 hover:bg-emerald-100/80 text-[#00AA5B] text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition active:scale-[0.97] border border-green-100/30" title="Edit">
                        <Edit3 size={12} className="stroke-[2.5]" /><span>Ubah</span>
                      </button>
                      <button onClick={() => { if (confirm('Hapus produk ini?')) onDelete(p.produks_id); }} className="flex items-center justify-center gap-1.5 h-10 bg-rose-50 hover:bg-rose-100/80 text-rose-600 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition active:scale-[0.97] border border-red-100/20" title="Hapus">
                        <Trash2 size={12} className="stroke-[2.5]" /><span>Hapus</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {produksLoading && filteredProduks.length === 0 && <div className="py-16 text-center text-xs font-semibold text-gray-400">Memuat data produk...</div>}
              {!produksLoading && filteredProduks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
                  <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 border border-gray-100"><Package size={28} /></div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-gray-900">Tidak ada produk ditemukan</p>
                    <p className="text-[10px] text-gray-400 font-bold max-w-[200px] mx-auto uppercase tracking-wide">Coba kata kunci pencarian atau filter lain</p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    );
  }

  if (routeNotFound) return <div className="w-full min-h-full p-8 text-center"><h2 className="text-base font-black text-gray-900">Produk tidak ditemukan</h2><p className="mt-2 text-sm text-gray-500">Produk dengan ID tersebut tidak tersedia.</p><button onClick={() => navigate('/admin')} className="mt-4 rounded-xl bg-[#00AA5B] px-4 py-2 text-sm font-bold text-white">Kembali ke Produk</button></div>;
  if (!enableManagementTabs) {
  return (
    <div className="w-full h-full min-h-full flex flex-col items-center justify-center bg-slate-950 md:bg-[#0B0F19] font-sans relative antialiased selection:bg-[#00AA5B]/20">
      {/* Premium background light glow on desktop */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-green-500/10 blur-[120px]" />
        <div className="absolute top-1/2 right-10 w-80 h-80 rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      {/* Main smartphone device frame mockup on desktop, full-screen on mobile */}
      <div className="w-full h-full min-h-0 md:max-w-[412px] bg-white md:rounded-[48px] md:border-[12px] md:border-slate-900 md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative flex flex-col overflow-hidden transition-all duration-300 md:ring-1 md:ring-white/10">
        
        {/* Dynamic Notch / Island on desktop */}
        <div className="hidden md:flex absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-50 items-center justify-center pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-slate-950 mr-2 border border-white/5" />
          <div className="w-12 h-1 bg-slate-950 rounded-full" />
        </div>

        {/* Dynamic status bar for authentic mobile experience */}
        <div className="flex-shrink-0 px-6 pt-3 pb-1 flex justify-between items-center text-[11px] font-black text-gray-500 bg-white select-none z-40 border-b border-gray-50">
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
        <div className="min-h-0 flex-1 flex flex-col relative overflow-hidden bg-slate-50">
          {content}
        </div>

        {/* Bottom virtual home indicator on desktop */}
        <div className="hidden md:flex flex-shrink-0 h-4 bg-white items-center justify-center select-none z-40">
          <div className="w-28 h-1 bg-gray-300 rounded-full" />
        </div>
      </div>
    </div>
  );
  }
  return <div className="w-full h-full min-h-0 flex flex-col bg-[#F8FAFC]">{content}</div>;
};

export default AdminDashboard;