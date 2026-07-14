import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  MapPin, 
  ChevronRight, 
  Star, 
  ShieldCheck, 
  Ticket, 
  CreditCard, 
  X, 
  Check, 
  Info, 
  CheckCircle2, 
  Loader2, 
  Smartphone,
  Truck,
  ArrowRight,
  Sparkles,
  Search,
  Home,
  Briefcase,
  Compass,
  Locate
} from 'lucide-react';
import { Product } from '../types';

interface CheckoutProps {
  produks: Product[];
  onBack: () => void;
}

interface ShippingOption {
  id: string;
  name: string;
  provider: string;
  price: number;
  eta: string;
  description: string;
}

interface PromoCode {
  id: string;
  title: string;
  desc: string;
  discountType: 'ongkir' | 'cashback' | 'potongan';
  amount: number;
  code: string;
}

interface Address {
  name: string;
  phone: string;
  label: string;
  detail: string;
  city: string;
  pinpoint?: string;
}

export default function Checkout({ produks, onBack }: CheckoutProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  // States for Checkout Options
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedStorage, setSelectedStorage] = useState<string>('');
  
  // Bottom Sheet Controls
  const [activeSheet, setActiveSheet] = useState<'shipping' | 'promo' | 'payment' | 'address' | null>(null);
  const [isAddressFullscreen, setIsAddressFullscreen] = useState(false);
  
  // Data State
  const [address, setAddress] = useState<Address>({
    name: '',
    phone: '',
    label: '',
    detail: '',
    city: ''
  });
  
  const [tempAddress, setTempAddress] = useState<Address>({ ...address });

  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedMapLocation, setSelectedMapLocation] = useState({
    title: 'Gedung Telkom Palmerah',
    detail: 'Jl. Letjen S. Parman Kav. 8, Palmerah, Jakarta Barat 11480',
    city: 'Palmerah, Jakarta Barat'
  });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const mockLocations = [
    {
      title: 'Gedung Telkom Palmerah',
      detail: 'Jl. Letjen S. Parman Kav. 8, Palmerah, Jakarta Barat 11480',
      city: 'Palmerah, Jakarta Barat'
    },
    {
      title: 'Grand Indonesia Mall',
      detail: 'Grand Indonesia Mall, Jl. MH Thamrin No.1, Menteng, Kota Jakarta Pusat, DKI Jakarta 10310',
      city: 'Menteng, Jakarta Pusat'
    },
    {
      title: 'Pacific Place Jakarta',
      detail: 'Pacific Place Mall, Jl. Jend. Sudirman Kav 52-53, Senayan, Kebayoran Baru, Jakarta Selatan 12190',
      city: 'Kebayoran Baru, Jakarta Selatan'
    },
    {
      title: 'BINUS University Anggrek',
      detail: 'Universitas Bina Nusantara, Jl. Kebon Jeruk Raya No. 15, Palmerah, Jakarta Barat 11480',
      city: 'Palmerah, Jakarta Barat'
    },
    {
      title: 'Stasiun Palmerah',
      detail: 'Stasiun Palmerah, Jl. Gelora, Tanah Abang, Jakarta Pusat 10270',
      city: 'Tanah Abang, Jakarta Pusat'
    },
    {
      title: 'Taman Palmerah Indah',
      detail: 'Komp. Taman Palmerah Indah Blok B No. 12, Palmerah, Jakarta Barat 11480',
      city: 'Palmerah, Jakarta Barat'
    }
  ];

  const handleMapDragEnd = (offsetX: number, offsetY: number) => {
    const index = Math.abs(Math.round(offsetX + offsetY)) % mockLocations.length;
    setSelectedMapLocation(mockLocations[index]);
  };

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation tidak didukung oleh browser ini.');
      setTimeout(() => setLocationError(null), 3000);
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Fetch reverse geocoding from free OpenStreetMap Nominatim API
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
              }
            }
          );
          
          if (!response.ok) {
            throw new Error('Gagal mendapatkan nama alamat.');
          }

          const data = await response.json();
          const addr = data.address || {};
          
          const road = addr.road || addr.suburb || addr.neighbourhood || 'Lokasi Terdeteksi';
          const title = data.name || road;
          const detail = data.display_name || `Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}`;
          
          const cityOrState = addr.city || addr.town || addr.municipality || addr.city_district || addr.county || addr.state || 'Jakarta';
          const subdistrict = addr.suburb || addr.village || addr.neighbourhood || '';
          const cityVal = subdistrict ? `${subdistrict}, ${cityOrState}` : cityOrState;

          setSelectedMapLocation({
            title: title,
            detail: detail,
            city: cityVal
          });
        } catch (error) {
          console.error(error);
          setSelectedMapLocation({
            title: `Lokasi GPS Anda`,
            detail: `Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            city: 'Lokasi Terdeteksi'
          });
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error(error);
        setIsLocating(false);
        let errorMsg = 'Gagal mengakses lokasi.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Akses lokasi ditolak. Aktifkan izin lokasi.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Informasi lokasi tidak tersedia.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Waktu permintaan lokasi habis.';
        }
        setLocationError(errorMsg);
        
        setTimeout(() => setLocationError(null), 3500);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const shippingOptions: ShippingOption[] = [
    { id: 'jnt_free', name: 'Bebas Ongkir', provider: 'J&T Express', price: 0, eta: 'Tiba 15 - 17 Jul', description: 'Promo Bebas Ongkir' },
    { id: 'reg', name: 'Reguler', provider: 'JNE Reguler', price: 12000, eta: 'Tiba 15 - 16 Jul', description: 'Paling sering dipilih' },
    { id: 'inst', name: 'Instan (3 Jam)', provider: 'GoSend Instant', price: 28000, eta: 'Tiba dalam 3 jam', description: 'Pengiriman super cepat' },
    { id: 'sd', name: 'Sameday', provider: 'Grab Sameday', price: 19000, eta: 'Tiba hari ini sebelum 18:00', description: 'Tiba di hari yang sama' },
    { id: 'cargo', name: 'Kargo', provider: 'SiCepat Gokil', price: 35000, eta: 'Tiba 17 - 20 Jul', description: 'Cocok untuk barang besar' },
  ];
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption>(shippingOptions[0]);

  const promos: PromoCode[] = [
    { id: 'ongkir10', title: 'Bebas Ongkir Terbatas', desc: 'Potongan ongkos kirim hingga Rp 15.000', discountType: 'ongkir', amount: 15000, code: 'BEBASONGKIR' },
    { id: 'gopay5', title: 'Gopay Cashback 5%', desc: 'Cashback koin GoPay up to Rp 50.000', discountType: 'cashback', amount: 50000, code: 'GOPAYUNTUNG' },
    { id: 'tokopedia15', title: 'Diskon Spesial Belanja', desc: 'Potongan harga langsung Rp 20.000', discountType: 'potongan', amount: 20000, code: 'TOKOPEDIA20' },
  ];
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);

  const [isProtectionChecked, setIsProtectionChecked] = useState(true);
  const protectionPrice = 2500;

  // Payment states
  const [selectedPayment, setSelectedPayment] = useState({
    id: 'gopay',
    name: 'GoPay',
    balance: 'Rp 145.000',
    icon: 'https://assets.tokopedia.net/assets-unify/img/ic-gopay.svg'
  });

  const paymentMethods = [
    { id: 'gopay', name: 'GoPay', balance: 'Rp 145.000', icon: 'https://images.tokopedia.net/img/toppay/gopay-logo-only.png', desc: 'Bayar instan pakai saldo GoPay' },
    { id: 'gopay_later', name: 'GoPayLater', balance: 'Limit Rp 3.500.000', icon: 'https://images.tokopedia.net/img/toppay/gopay-logo-only.png', desc: 'Beli sekarang, bayar bulan depan' },
    { id: 'bca_va', name: 'BCA Virtual Account', balance: '', icon: 'https://images.tokopedia.net/img/toppay/payment-logo/bca_va.png', desc: 'Verifikasi otomatis, tanpa upload bukti' },
    { id: 'mandiri_va', name: 'Mandiri Virtual Account', balance: '', icon: 'https://images.tokopedia.net/img/toppay/payment-logo/mandiri_va.png', desc: 'Verifikasi otomatis' },
    { id: 'cc', name: 'Kartu Kredit / Debit', balance: '', icon: 'https://images.tokopedia.net/img/toppay/payment-logo/credit_card.png', desc: 'Visa, Mastercard, JCB' },
  ];

  // Flow states
  const [checkoutStep, setCheckoutStep] = useState<'checkout' | 'payment_select' | 'processing' | 'success'>('checkout');

  useEffect(() => {
    // Load product from params or use first item
    const params = new URLSearchParams(window.location.search);
    const id = params.get('produks_id');
    const selectedProd = produks.find(p => p.produks_id === id) || produks[0];
    
    if (selectedProd) {
      setProduct(selectedProd);
      
      // Select default variants if available
      try {
        if (selectedProd.colors) {
          const colorsList = typeof selectedProd.colors === 'string' ? JSON.parse(selectedProd.colors) : selectedProd.colors;
          if (colorsList && colorsList.length > 0) {
            setSelectedColor(colorsList[0].name || colorsList[0]);
          }
        }
        if (selectedProd.variants) {
          const variantsList = typeof selectedProd.variants === 'string' ? JSON.parse(selectedProd.variants) : selectedProd.variants;
          if (variantsList && variantsList.length > 0) {
            setSelectedStorage(variantsList[0].storage || variantsList[0]);
          }
        }
      } catch (e) {
        console.error('Error parsing variants', e);
      }
    }
    setLoading(false);
  }, [produks]);

  if (loading || !product) {
    return (
      <div className="flex items-center justify-center h-full bg-white max-w-md mx-auto shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
          <p className="text-sm font-bold text-gray-500">Menyiapkan pembayaran...</p>
        </div>
      </div>
    );
  }

  // Cost calculations
  const basePrice = product.sale_price || product.price;
  const totalProductPrice = basePrice * quantity;
  const shippingFee = selectedShipping.price;
  
  // Calculate discount
  let promoDiscount = 0;
  if (appliedPromo) {
    if (appliedPromo.discountType === 'ongkir') {
      promoDiscount = Math.min(shippingFee, appliedPromo.amount);
    } else if (appliedPromo.discountType === 'potongan') {
      promoDiscount = appliedPromo.amount;
    } else if (appliedPromo.discountType === 'cashback') {
      // Cashback goes to Gopay Coins, doesn't reduce total invoice directly but shows as award
    }
  }

  const appFee = 1000;
  const protectionFee = isProtectionChecked ? protectionPrice * quantity : 0;
  const grandTotal = totalProductPrice + shippingFee - promoDiscount + appFee + protectionFee;

  const handleApplyAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setAddress({ ...tempAddress });
    setActiveSheet(null);
  };

  const startPaymentProcess = () => {
    setCheckoutStep('processing');
    setTimeout(() => {
      setCheckoutStep('success');
    }, 2500);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (checkoutStep === 'processing') {
    return (
      <div className="max-w-md mx-auto h-full flex flex-col bg-white font-sans text-gray-900 relative shadow-2xl items-center justify-center p-8">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-green-100 border-t-green-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="https://www.ethic.ninja/wp-content/uploads/2017/11/logo-tokopedia.png" className="w-8 h-8 object-contain opacity-40" alt="Tokopedia" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Memproses Transaksi</h2>
            <p className="text-xs text-gray-500 leading-relaxed max-w-[280px]">
              Harap jangan menutup halaman ini. Kami sedang memproses pesananmu ke merchant resmi Tokopedia.
            </p>
          </div>
          <div className="w-full bg-gray-50 p-4 rounded-xl border border-gray-100 mt-4 text-left space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Metode</span>
              <span className="font-bold text-gray-700">{selectedPayment.name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Total Tagihan</span>
              <span className="font-bold text-green-600">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (checkoutStep === 'success') {
    return (
      <div className="max-w-md mx-auto h-full flex flex-col bg-white font-sans text-gray-900 relative shadow-2xl overflow-y-auto no-scrollbar">
        {/* Confetti effect background or illustration */}
        <div className="flex flex-col items-center text-center px-6 pt-16 pb-8 bg-gradient-to-b from-green-50 to-white">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-100 animate-bounce">
            <Check className="w-9 h-9 text-white stroke-[3.5]" />
          </div>
          
          <h2 className="text-xl font-black text-gray-900">Pembayaran Berhasil!</h2>
          <p className="text-xs text-gray-500 mt-2 max-w-[280px]">
            Hore! Pembayaranmu telah berhasil diverifikasi otomatis oleh Tokopedia.
          </p>

          <div className="w-full mt-8 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-left space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <img src={product.media[0]} className="w-12 h-12 rounded-lg object-cover border border-gray-100" alt="Prod" />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-gray-900 truncate">{product.title}</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Jumlah: {quantity}x {selectedColor && `• Color: ${selectedColor}`} {selectedStorage && `• Storage: ${selectedStorage}`}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">No. Invoice</span>
                <span className="font-bold text-gray-700 font-mono text-[11px]">IVC/20260714/TKP/889218</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Metode Pembayaran</span>
                <span className="font-semibold text-gray-700">{selectedPayment.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-[10px]">Selesai</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-gray-200 pt-3 mt-1">
                <span className="text-gray-900 font-bold">Total Pembayaran</span>
                <span className="font-black text-green-600 text-sm">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-3 mt-auto mb-6">
          <button 
            onClick={onBack}
            className="w-full py-3.5 bg-green-500 text-white font-black rounded-xl text-xs shadow-lg shadow-green-100 active:scale-[0.98] transition-all"
          >
            Kembali ke Produk
          </button>
          <button 
            onClick={() => window.open('https://www.tokopedia.com/', '_blank')}
            className="w-full py-3.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl text-xs active:scale-[0.98] transition-all"
          >
            Buka Tokopedia Asli
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto h-full flex flex-col bg-white font-sans text-gray-900 relative shadow-2xl overflow-hidden select-none" style={{ touchAction: 'pan-x pan-y' }}>
      
      {/* Header */}
      <header className="w-full bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full transition">
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>
          <h1 className="text-base font-black text-gray-900">Pengiriman</h1>
        </div>
        <div className="text-xs font-bold text-green-500 cursor-pointer" onClick={() => window.open('https://www.tokopedia.com/help', '_blank')}>
          Bantuan
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        
        {/* Shipping Address */}
        <section className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-800">
              <MapPin className="w-4 h-4 text-green-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-400">Alamat Pengiriman</h2>
            </div>
            {!address.name || !address.detail ? null : (
              <button 
                onClick={() => {
                  setTempAddress({ ...address });
                  setIsAddressFullscreen(true);
                }}
                className="text-xs font-bold text-green-500 hover:text-green-600 active:scale-95 transition-all"
              >
                Ubah Alamat
              </button>
            )}
          </div>

          {!address.name || !address.detail ? (
            <button 
              type="button"
              onClick={() => {
                setTempAddress({ ...address });
                setIsAddressFullscreen(true);
              }}
              className="w-full bg-white hover:bg-gray-50 border border-dashed border-gray-300 rounded-2xl py-5 flex items-center justify-center gap-2 text-xs font-black text-green-500 transition-all active:scale-[0.99] shadow-sm"
            >
              + Tambah Alamat Baru
            </button>
          ) : (
            <div 
              onClick={() => {
                setTempAddress({ ...address });
                setIsAddressFullscreen(true);
              }}
              className="bg-white rounded-2xl p-4 border border-gray-150 hover:border-green-300 transition-all cursor-pointer relative group flex justify-between items-center shadow-sm"
            >
              <div className="space-y-2 flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-gray-800 truncate">{address.name}</span>
                  <span className="text-[11px] text-gray-500 font-medium">({address.phone})</span>
                  <span className="bg-green-50 text-green-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase border border-green-100">{address.label || 'Utama'}</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed font-bold line-clamp-2">{address.detail}</p>
                <p className="text-[11px] text-gray-400 font-medium truncate">{address.city}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 group-hover:text-green-500 transition-colors" />
            </div>
          )}
        </section>

        <div className="h-[8px] bg-gray-50 border-y border-gray-100" />

        {/* Selected Product & Shop */}
        <section className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <img 
              src="https://p16-images-comn-sg.tokopedia-static.net/tos-alisg-i-zr7vqa5nfb-sg/img/official_store/badge_os.png~tplv-zr7vqa5nfb-image.image" 
              alt="Official Store" 
              className="h-4 w-auto" 
              referrerPolicy="no-referrer" 
            />
            <span className="font-bold text-sm text-gray-800">{product.shop_name}</span>
            <span className="text-[10px] text-gray-400 font-medium">• {product.shop_location}</span>
          </div>

          {/* Product card inside checkout */}
          <div className="flex gap-3">
            <img 
              src={product.media[0]} 
              className="w-20 h-20 rounded-xl object-cover border border-gray-100 flex-shrink-0" 
              alt={product.title} 
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-gray-800 leading-snug line-clamp-2">{product.title}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedColor && (
                    <span className="text-[10px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded font-medium">Color: {selectedColor}</span>
                  )}
                  {selectedStorage && (
                    <span className="text-[10px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded font-medium">Variant: {selectedStorage}</span>
                  )}
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-sm font-black text-gray-900">{formatCurrency(basePrice)}</span>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-2.5 py-0.5 text-gray-500 font-bold hover:bg-gray-50 active:bg-gray-100 text-xs"
                  >
                    -
                  </button>
                  <span className="px-2 text-xs font-bold text-gray-800 border-x border-gray-100">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-2.5 py-0.5 text-gray-500 font-bold hover:bg-gray-50 active:bg-gray-100 text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="h-[8px] bg-gray-50 border-y border-gray-100" />

        {/* Shipping Selector Row */}
        <section className="p-4 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Pilihan Pengiriman</h3>
          
          <button 
            onClick={() => setActiveSheet('shipping')}
            className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 hover:border-gray-200 rounded-2xl transition text-left"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-50 rounded-xl mt-0.5">
                <Truck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-gray-800">{selectedShipping.provider} ({selectedShipping.name})</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{selectedShipping.eta}</p>
                <p className="text-[10px] text-green-600 font-bold mt-1">Estimasi Ongkir: {selectedShipping.price === 0 ? 'Bebas Ongkir (Gratis)' : formatCurrency(selectedShipping.price)}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </section>

        <div className="h-[8px] bg-gray-50 border-y border-gray-100" />

        {/* Protection Checkbox */}
        <section className="p-4">
          <label className="flex items-start gap-3 cursor-pointer p-3 bg-green-50/20 border border-green-100/50 rounded-2xl">
            <input 
              type="checkbox" 
              checked={isProtectionChecked}
              onChange={() => setIsProtectionChecked(!isProtectionChecked)}
              className="mt-1 w-4 h-4 rounded text-green-600 focus:ring-green-500 border-gray-300 accent-green-600"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span className="text-xs font-bold text-gray-800">Proteksi Gadget & Produk</span>
                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.2 rounded font-black uppercase text-right ml-auto">Rp {protectionPrice.toLocaleString('id-ID')}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                Melindungi penuh dari kerusakan tidak disengaja, retak layar, dan tumpahan cairan selama 12 bulan.
              </p>
            </div>
          </label>
        </section>

        <div className="h-[8px] bg-gray-50 border-y border-gray-100" />

        {/* Promo Voucher Banner */}
        <section className="p-4">
          <button 
            onClick={() => setActiveSheet('promo')}
            className={`w-full flex items-center justify-between p-4 border rounded-2xl transition text-left ${appliedPromo ? 'bg-green-50/40 border-green-200' : 'bg-white border-gray-100 hover:border-gray-200'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${appliedPromo ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-gray-50 text-gray-500'}`}>
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-xs font-extrabold ${appliedPromo ? 'text-green-700' : 'text-gray-800'}`}>
                  {appliedPromo ? `Promo Dipakai: ${appliedPromo.code}` : 'Makin hemat pakai promo'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {appliedPromo ? appliedPromo.desc : 'Pilih promo cashback & bebas ongkir'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {appliedPromo && (
                <span className="text-[10px] bg-green-500 text-white font-black px-2 py-0.5 rounded-full mr-1">Aktif</span>
              )}
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>
        </section>

        <div className="h-[8px] bg-gray-50 border-y border-gray-100" />

        {/* Rincian Pembayaran */}
        <section className="p-4 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Rincian Pembayaran</h3>
          
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Total Harga ({quantity} barang)</span>
              <span className="font-semibold text-gray-800">{formatCurrency(totalProductPrice)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Total Ongkos Kirim</span>
              <span className="font-semibold text-gray-800">{formatCurrency(shippingFee)}</span>
            </div>
            
            {promoDiscount > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Diskon Ongkos Kirim / Promo</span>
                <span>-{formatCurrency(promoDiscount)}</span>
              </div>
            )}

            {isProtectionChecked && (
              <div className="flex justify-between text-gray-600">
                <span>Biaya Proteksi Produk</span>
                <span className="font-semibold text-gray-800">{formatCurrency(protectionFee)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Biaya Jasa Aplikasi</span>
              <span className="font-semibold text-gray-800">{formatCurrency(appFee)}</span>
            </div>

            <div className="h-[1px] bg-gray-100 my-2" />

            <div className="flex justify-between text-sm font-black text-gray-900 pt-1">
              <span>Total Belanja</span>
              <span className="text-green-600">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </section>

      </main>

      {/* Floating Bottom Action Bar */}
      <footer className="w-full bg-white border-t border-gray-100 px-4 py-3.5 z-40 flex items-center justify-between shrink-0 absolute bottom-0">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 font-medium">Total Tagihan</span>
          <span className="text-base font-black text-green-600 leading-tight">{formatCurrency(grandTotal)}</span>
        </div>
        {!address.name || !address.detail ? (
          <button 
            onClick={() => {
              setTempAddress({ ...address });
              setIsAddressFullscreen(true);
            }}
            className="bg-green-500 hover:bg-green-600 text-white font-black px-6 py-3 rounded-xl text-xs shadow-lg shadow-green-100 active:scale-[0.98] transition-all flex items-center gap-1.5"
          >
            Lengkapi Alamat
            <ArrowRight className="w-4 h-4 animate-pulse" />
          </button>
        ) : (
          <button 
            onClick={() => setActiveSheet('payment')}
            className="bg-green-500 hover:bg-green-600 text-white font-black px-6 py-3 rounded-xl text-xs shadow-lg shadow-green-100 active:scale-[0.98] transition-all flex items-center gap-1.5"
          >
            Pilih Pembayaran
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </footer>

      {/* BOTTOM SHEET INTERACTIVE MODAL COMPONENT */}
      <AnimatePresence>
        {activeSheet && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveSheet(null)}
              className="absolute inset-0 bg-black/50 z-50 transition-opacity"
            />
            
            {/* Bottom Sheet Box */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[85%] flex flex-col shadow-2xl border-t border-gray-100"
            >
              {/* Sheet Drag Indicator */}
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-2 flex-shrink-0" />
              
              {/* Sheet Header */}
              <div className="flex justify-between items-center px-5 py-3 border-b border-gray-50 flex-shrink-0">
                <h3 className="font-extrabold text-[15px] text-gray-900">
                  {activeSheet === 'shipping' && 'Pilih Pengiriman'}
                  {activeSheet === 'promo' && 'Pakai Promo Tokopedia'}
                  {activeSheet === 'payment' && 'Pilih Metode Pembayaran'}
                  {activeSheet === 'address' && 'Ubah Alamat Pengiriman'}
                </h3>
                <button onClick={() => setActiveSheet(null)} className="p-1 hover:bg-gray-100 rounded-full transition">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Sheet Scrollable Body */}
              <div className="overflow-y-auto p-5 space-y-4 flex-1 no-scrollbar pb-8">
                
                {/* 1. SHIPPING METHOD OPTIONS */}
                {activeSheet === 'shipping' && (
                  <div className="space-y-3">
                    {shippingOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setSelectedShipping(opt);
                          setActiveSheet(null);
                        }}
                        className={`w-full flex items-start justify-between p-4 rounded-2xl border text-left transition ${selectedShipping.id === opt.id ? 'bg-green-50/30 border-green-500' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-gray-800">{opt.provider}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.2 rounded font-semibold">{opt.name}</span>
                          </div>
                          <p className="text-[11px] text-gray-500">{opt.description}</p>
                          <p className="text-[10px] text-gray-400">Estimasi: {opt.eta}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-xs font-black text-green-600">{opt.price === 0 ? 'Gratis' : formatCurrency(opt.price)}</span>
                          {selectedShipping.id === opt.id && (
                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 2. PROMO / COUPONS */}
                {activeSheet === 'promo' && (
                  <div className="space-y-3.5">
                    {promos.map((pr) => (
                      <div
                        key={pr.id}
                        className={`p-4 rounded-2xl border transition relative flex flex-col justify-between overflow-hidden ${appliedPromo?.id === pr.id ? 'bg-green-50/30 border-green-500' : 'bg-white border-gray-100'}`}
                      >
                        {/* Decorative background circle */}
                        <div className="absolute right-0 top-0 w-16 h-16 bg-green-50 rounded-full translate-x-6 -translate-y-6 -z-10" />
                        
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-green-50 rounded-xl mt-0.5 text-green-600 flex-shrink-0">
                            <Ticket className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-extrabold text-xs text-gray-800">{pr.title}</h4>
                            <p className="text-[10px] text-gray-500 leading-relaxed">{pr.desc}</p>
                            <span className="inline-block text-[9px] bg-green-100 text-green-700 font-extrabold px-1.5 py-0.2 rounded font-mono mt-1">CODE: {pr.code}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-3">
                          <span className="text-[10px] font-bold text-gray-400">Nilai potongan: {pr.discountType === 'cashback' ? `${pr.amount / 1000}rb koin` : formatCurrency(pr.amount)}</span>
                          
                          {appliedPromo?.id === pr.id ? (
                            <button 
                              onClick={() => setAppliedPromo(null)}
                              className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase"
                            >
                              Batal
                            </button>
                          ) : (
                            <button 
                              onClick={() => {
                                setAppliedPromo(pr);
                                setActiveSheet(null);
                              }}
                              className="text-[10px] font-black text-green-600 hover:text-green-700 uppercase"
                            >
                              Gunakan
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. PAYMENT SELECTION & QUICK ACTIONS */}
                {activeSheet === 'payment' && (
                  <div className="space-y-5">
                    {/* Invoice overview */}
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-gray-400 font-medium block">Total Pembayaran</span>
                        <span className="text-sm font-black text-green-600">{formatCurrency(grandTotal)}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">Pengecekan Otomatis</span>
                    </div>

                    <div className="space-y-2.5">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Metode Pembayaran</p>
                      
                      {paymentMethods.map((pm) => (
                        <button
                          key={pm.id}
                          onClick={() => {
                            setSelectedPayment({
                              id: pm.id,
                              name: pm.name,
                              balance: pm.balance,
                              icon: pm.icon
                            });
                          }}
                          className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition ${selectedPayment.id === pm.id ? 'bg-green-50/20 border-green-500' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                        >
                          <div className="flex items-center gap-3">
                            <img src={pm.icon} alt={pm.name} className="w-10 h-6 object-contain rounded border border-gray-50 p-0.5 flex-shrink-0 bg-white" />
                            <div>
                              <p className="text-xs font-bold text-gray-800">{pm.name}</p>
                              {pm.balance && (
                                <p className="text-[10px] text-gray-500 mt-0.5">{pm.balance}</p>
                              )}
                              <p className="text-[9px] text-gray-400">{pm.desc}</p>
                            </div>
                          </div>
                          {selectedPayment.id === pm.id && (
                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. ADDRESS EDITING REMOVED FROM BOTTOM SHEET */}
              </div>

              {/* Sticky bottom action for Payment Sheet */}
              {activeSheet === 'payment' && (
                <div className="bg-white border-t border-gray-100 p-4 shrink-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                  <button 
                    onClick={() => {
                      setActiveSheet(null);
                      startPaymentProcess();
                    }}
                    className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl text-xs shadow-lg shadow-green-100 active:scale-[0.98] transition-all"
                  >
                    Bayar Sekarang ({formatCurrency(grandTotal)})
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fullscreen Address Form Overlay */}
      <AnimatePresence>
        {isAddressFullscreen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="absolute inset-0 bg-white z-50 flex flex-col font-sans text-gray-900"
          >
            {/* Header */}
            <header className="w-full bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between shrink-0 sticky top-0 z-40">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsAddressFullscreen(false)} 
                  className="p-1 hover:bg-gray-100 rounded-full transition"
                  type="button"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-800" />
                </button>
                <h1 className="text-base font-black text-gray-900">Alamat</h1>
              </div>
            </header>

            {/* Scrollable Form Body Container with Sticky Footer */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                setAddress({ ...tempAddress });
                setIsAddressFullscreen(false);
              }}
              className="flex-1 flex flex-col overflow-hidden bg-gray-50"
            >
              {/* Form Fields - Scrollable */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-6">
                
                {/* SECTION 1: TANDAI ALAMAT */}
                <div className="bg-white p-5 border-b border-gray-100 space-y-4">
                  <h3 className="text-xs font-black text-gray-900 tracking-wide uppercase">Tandai Alamat Sebagai</h3>
                  
                  {/* Label Alamat */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Nama / Label Alamat</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Contoh: Rumah, Kantor, Kos, Apartemen"
                      value={tempAddress.label} 
                      onChange={(e) => setTempAddress({ ...tempAddress, label: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-bold text-gray-800 placeholder-gray-400"
                    />
                    
                    {/* Quick Select Chips */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {[
                        { name: 'Rumah', icon: Home },
                        { name: 'Kantor', icon: Briefcase },
                        { name: 'Kos', icon: MapPin },
                        { name: 'Apartemen', icon: MapPin }
                      ].map((item) => {
                        const IconComponent = item.icon;
                        const isSelected = tempAddress.label.toLowerCase() === item.name.toLowerCase();
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => setTempAddress({ ...tempAddress, label: item.name })}
                            className={`text-[11px] px-4 py-2 rounded-full font-bold transition-all border flex items-center gap-1.5 ${
                              isSelected 
                                ? 'bg-green-50 border-green-500 text-green-600 shadow-sm' 
                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            <IconComponent className="w-3.5 h-3.5" />
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* SECTION 2: PENERIMA */}
                <div className="bg-white p-5 border-y border-gray-100 space-y-4">
                  <h3 className="text-xs font-black text-gray-900 tracking-wide uppercase">Kontak Penerima</h3>
                  
                  {/* Nama Penerima */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Nama Penerima</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Masukkan nama penerima"
                      value={tempAddress.name} 
                      onChange={(e) => setTempAddress({ ...tempAddress, name: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-bold text-gray-800 placeholder-gray-400"
                    />
                  </div>

                  {/* No HP */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Nomor Handphone</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-xs font-extrabold text-gray-400 border-r border-gray-200 pr-2.5">+62</span>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: 812345678"
                        value={tempAddress.phone.startsWith('+62') ? tempAddress.phone.replace('+62', '') : tempAddress.phone.startsWith('0') ? tempAddress.phone.substring(1) : tempAddress.phone} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setTempAddress({ ...tempAddress, phone: val ? '0' + val : '' });
                        }}
                        className="w-full bg-white border border-gray-200 rounded-xl pl-[58px] pr-4 py-3 text-xs outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-bold text-gray-800 placeholder-gray-400"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">Gunakan nomor handphone yang aktif untuk memudahkan kurir.</p>
                  </div>
                </div>

                {/* SECTION 3: LOKASI PENGIRIMAN */}
                <div className="bg-white p-5 border-y border-gray-100 space-y-4">
                  <h3 className="text-xs font-black text-gray-900 tracking-wide uppercase">Lokasi Pengiriman</h3>
                  
                  {/* Kota atau Kecamatan */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Kota & Kecamatan</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        placeholder="Cari Kota atau Kecamatan kamu"
                        value={tempAddress.city} 
                        onChange={(e) => setTempAddress({ ...tempAddress, city: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-xs outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-bold text-gray-800 placeholder-gray-400"
                      />
                      <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">Contoh: Palmerah, Jakarta Barat</p>
                  </div>

                  {/* Pinpoint Peta */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Pinpoint Lokasi</label>
                    {tempAddress.pinpoint ? (
                      <div className="flex items-center justify-between border border-green-200 bg-green-50/20 rounded-xl p-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                            <MapPin className="w-4.5 h-4.5 text-green-600 animate-pulse" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-gray-800 truncate">{tempAddress.pinpoint}</p>
                            <p className="text-[10px] text-green-600 font-extrabold truncate">Sudah Terpinpoint</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsMapOpen(true)}
                          className="text-[11px] font-black text-green-600 hover:text-green-700 px-3 py-1.5 bg-white border border-green-200 rounded-lg active:scale-95 transition-all shrink-0 ml-2"
                        >
                          Ubah Pin
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsMapOpen(true)}
                        className="w-full border border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50/10 rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold text-gray-600 transition-all active:scale-[0.99] bg-white shadow-sm"
                      >
                        <Compass className="w-4 h-4 text-green-500" />
                        Pilih Lokasi Lewat Peta (Pinpoint)
                      </button>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">Peta membantu kurir menemukan lokasi persis rumah kamu.</p>
                  </div>

                  {/* Alamat Lengkap */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Alamat Lengkap</label>
                    <textarea 
                      required
                      rows={3}
                      placeholder="Tulis nama jalan, nomor rumah, RT/RW, nomor unit apartemen atau ruko"
                      value={tempAddress.detail} 
                      onChange={(e) => setTempAddress({ ...tempAddress, detail: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all resize-none font-bold text-gray-800 placeholder-gray-400 leading-relaxed"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">Sebutkan warna pagar, posisi rumah, atau patokan yang mudah dicari kurir.</p>
                  </div>
                </div>

                {/* SECTION 4: SET AS DEFAULT */}
                <div className="bg-white p-5 border-y border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-gray-900">Atur Sebagai Alamat Utama</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Alamat ini akan otomatis terpilih untuk setiap checkout belanja kamu.</p>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </div>
                </div>

              </div>
 
              {/* Sticky bottom save bar */}
              <div className="bg-white border-t border-gray-100 p-4 flex gap-3 z-50 shrink-0 shadow-lg">
                <button 
                  type="button" 
                  onClick={() => setIsAddressFullscreen(false)}
                  className="flex-1 py-3.5 border border-gray-200 text-gray-500 font-extrabold rounded-xl text-xs hover:bg-gray-50 active:scale-95 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3.5 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl text-xs shadow-lg shadow-green-100 active:scale-95 transition-all"
                >
                  Simpan & Gunakan
                </button>
              </div>

            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Selector Modal */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden max-w-[480px] mx-auto shadow-2xl"
          >
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsMapOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-800" />
              </button>
              <h2 className="text-sm font-black text-gray-900 flex-1">Pilih Lokasi di Peta</h2>
            </header>

            {/* Map Area */}
            <div className="flex-1 relative bg-gray-100 overflow-hidden select-none">
              {/* Grid / Roads Mock Map */}
              <motion.div
                drag
                dragConstraints={{ left: -400, right: 400, top: -400, bottom: 400 }}
                dragElastic={0.2}
                onDragStart={() => setIsDraggingMap(true)}
                onDragEnd={(event, info) => {
                  setIsDraggingMap(false);
                  handleMapDragEnd(info.offset.x, info.offset.y);
                }}
                className="absolute inset-[-400px] cursor-grab active:cursor-grabbing bg-[#EBF0F6] flex items-center justify-center"
              >
                {/* SVG MAP DESIGN */}
                <svg className="w-[1200px] h-[1200px] opacity-90" xmlns="http://www.w3.org/2000/svg">
                  {/* Water body */}
                  <path d="M0,300 C300,400 600,200 900,400 C1000,450 1100,600 1200,650" fill="none" stroke="#A9C9FF" strokeWidth="60" strokeLinecap="round" />
                  
                  {/* Parks */}
                  <rect x="150" y="200" width="200" height="180" rx="20" fill="#D2F1D2" />
                  <rect x="800" y="700" width="250" height="300" rx="30" fill="#D2F1D2" />
                  <circle cx="500" cy="850" r="100" fill="#D2F1D2" />
                  <rect x="900" y="100" width="180" height="150" rx="15" fill="#D2F1D2" />
                  
                  {/* Highways */}
                  <line x1="0" y1="600" x2="1200" y2="600" stroke="#FFFFFF" strokeWidth="24" />
                  <line x1="0" y1="600" x2="1200" y2="600" stroke="#FFD27F" strokeWidth="16" />
                  
                  <line x1="600" y1="0" x2="600" y2="1200" stroke="#FFFFFF" strokeWidth="24" />
                  <line x1="600" y1="0" x2="600" y2="1200" stroke="#FFD27F" strokeWidth="16" />

                  {/* Regular Roads */}
                  <line x1="100" y1="0" x2="100" y2="1200" stroke="#FFFFFF" strokeWidth="10" />
                  <line x1="300" y1="0" x2="300" y2="1200" stroke="#FFFFFF" strokeWidth="10" />
                  <line x1="900" y1="0" x2="900" y2="1200" stroke="#FFFFFF" strokeWidth="10" />

                  <line x1="0" y1="250" x2="1200" y2="250" stroke="#FFFFFF" strokeWidth="10" />
                  <line x1="0" y1="800" x2="1200" y2="800" stroke="#FFFFFF" strokeWidth="10" />

                  {/* Buildings */}
                  <g fill="#DEE4EC" stroke="#CFD6E2" strokeWidth="2">
                    <rect x="230" y="80" width="50" height="50" rx="4" />
                    <rect x="420" y="120" width="70" height="50" rx="4" />
                    <rect x="680" y="150" width="80" height="60" rx="4" />
                    <rect x="700" y="320" width="60" height="80" rx="4" />
                    <rect x="180" y="450" width="90" height="70" rx="4" />
                    <rect x="350" y="680" width="80" height="80" rx="4" />
                    <rect x="680" y="820" width="50" height="50" rx="4" />
                  </g>

                  {/* Labels */}
                  <g fontWeight="bold" fontFamily="sans-serif" fontSize="11" fill="#8C9BB0" textAnchor="middle">
                    <text x="250" y="290" fill="#4B8C4B">Taman Palmerah Indah</text>
                    <text x="925" y="850" fill="#4B8C4B">Hutan Kota Senayan</text>
                    <text x="500" y="850" fill="#4B8C4B">Gelora Bung Karno</text>
                    <text x="600" y="580" fill="#D97706" fontSize="10">Jl. Jend. Sudirman</text>
                    <text x="580" y="235" fill="#5F6D7E">Stasiun Palmerah</text>
                    <text x="580" y="380" fill="#5F6D7E">Universitas Bina Nusantara</text>
                    <text x="580" y="730" fill="#5F6D7E">Gedung Telkom Palmerah</text>
                  </g>
                </svg>
              </motion.div>

              {/* Static centered pin */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative flex flex-col items-center">
                  <motion.div
                    animate={{
                      y: isDraggingMap ? -24 : 0,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 18
                    }}
                    className="relative z-10 drop-shadow-xl"
                  >
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center border-2 border-white relative shadow-lg">
                      <div className="w-3.5 h-3.5 bg-green-500 rounded-full z-20 border border-white"></div>
                    </div>
                    <div className="w-4 h-4 bg-red-500 rotate-45 -mt-2 border-r-2 border-b-2 border-white mx-auto"></div>
                  </motion.div>

                  <motion.div
                    animate={{
                      scale: isDraggingMap ? 0.4 : 1,
                      opacity: isDraggingMap ? 0.2 : 0.6,
                    }}
                    className="w-5 h-2 bg-gray-400/80 rounded-full -mt-1 filter blur-[1px]"
                  />
                </div>
              </div>

              {/* Search Over Map */}
              <div className="absolute top-4 left-4 right-4 z-20">
                <div className="bg-white rounded-xl shadow-lg border border-gray-150 p-2.5 flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
                  <input
                    type="text"
                    placeholder="Cari gedung, jalan, atau komplek..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-xs font-bold text-gray-800 outline-none placeholder-gray-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  )}
                </div>

                {searchQuery && (
                  <div className="bg-white rounded-xl shadow-xl border border-gray-150 mt-1.5 overflow-hidden max-h-[180px] overflow-y-auto no-scrollbar">
                    {mockLocations
                      .filter(loc => loc.title.toLowerCase().includes(searchQuery.toLowerCase()) || loc.detail.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((loc) => (
                        <button
                          key={loc.title}
                          type="button"
                          onClick={() => {
                            setSelectedMapLocation(loc);
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-start gap-2.5"
                        >
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-black text-gray-800">{loc.title}</p>
                            <p className="text-[10px] text-gray-400 font-bold truncate mt-0.5">{loc.detail}</p>
                          </div>
                        </button>
                      ))}
                    {mockLocations.filter(loc => loc.title.toLowerCase().includes(searchQuery.toLowerCase()) || loc.detail.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                      <div className="px-4 py-3 text-center text-xs text-gray-400 font-bold">
                        Lokasi tidak ditemukan
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Floating Locate Me */}
              <button
                type="button"
                disabled={isLocating}
                onClick={handleLocateMe}
                className="absolute bottom-4 right-4 bg-white p-2.5 rounded-full shadow-lg border border-gray-150 hover:bg-gray-50 text-gray-700 active:scale-95 transition-all z-20 flex items-center justify-center disabled:opacity-80"
              >
                {isLocating ? (
                  <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                ) : (
                  <Locate className="w-5 h-5 text-green-500" />
                )}
              </button>

              {/* Error or Loading Toast overlay */}
              {isLocating && (
                <div className="absolute top-16 left-4 right-4 bg-black/85 text-white text-[11px] px-3 py-2 rounded-lg shadow-md z-30 flex items-center gap-2 font-bold animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-green-400" />
                  Mendapatkan lokasi GPS Anda...
                </div>
              )}

              {locationError && (
                <div className="absolute top-16 left-4 right-4 bg-red-600 text-white text-[11px] px-3.5 py-2.5 rounded-lg shadow-md z-30 flex items-start gap-2 font-bold">
                  <Info className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  <span>{locationError}</span>
                </div>
              )}
            </div>

            {/* Confirm block */}
            <div className="bg-white border-t border-gray-100 p-5 space-y-4 shrink-0 z-20 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-red-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-black text-gray-900 truncate">{selectedMapLocation.title}</h4>
                  <p className="text-[10px] text-gray-400 font-bold leading-normal mt-0.5 line-clamp-2">{selectedMapLocation.detail}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTempAddress({
                    ...tempAddress,
                    city: selectedMapLocation.city,
                    detail: selectedMapLocation.detail,
                    pinpoint: selectedMapLocation.title
                  });
                  setIsMapOpen(false);
                }}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-3.5 px-4 rounded-xl text-xs shadow-lg shadow-green-100 active:scale-95 transition-all text-center block"
              >
                Pilih Lokasi Ini
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
