import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import ProductDetail from './components/ProductDetail';
import AdminPortal from './components/AdminPortal';
import { adminApi } from './lib/adminApi';
import Checkout from './components/Checkout';
import { Product } from './types';
import { supabase } from './lib/supabase';

function TokopediaSplashScreen({ message }: { message: string }) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 180);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between p-8 font-sans max-w-md mx-auto shadow-2xl border-x border-gray-100">
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div className="w-56 h-56 flex items-center justify-center relative">
          {/* Authentic green spinning loader as placeholder/fallback */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#00AA5B]/20 border-t-[#00AA5B] rounded-full animate-spin"></div>
          </div>
          
          {shouldRender && (
            <div className="w-full h-full z-10 bg-white">
              <DotLottieReact
                src="https://lottie.host/774f8994-8ee1-4e19-bd71-9ad3c2438ddf/h7CR2SH9YJ.lottie"
                loop
                autoplay
              />
            </div>
          )}
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-black text-[#00AA5B] tracking-wide uppercase">Tokopedia Shop</p>
          <p className="text-xs font-bold text-gray-400">{message}</p>
        </div>
      </div>
      
      {/* Brand Footer */}
      <div className="flex flex-col items-center gap-1.5 pb-6">
        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.2em]">Authorized Shop Mirror</span>
        <div className="flex items-center gap-1.5 text-gray-400 select-none">
          <span className="text-xs font-black text-[#00AA5B]">tokopedia</span>
          <span className="text-xs font-bold text-gray-200">|</span>
          <span className="text-[10px] font-bold text-gray-400 tracking-wider">iBox Authorized</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [produks, setProduks] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Backward compatibility: Redirect from query param (?produks_id=...) to path parameter (/:produks_id)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const queryId = searchParams.get('produks_id');
    if (queryId && location.pathname === '/') {
      navigate(`/${queryId}`, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('produks')
        .select('*');
      if (error) throw error;
      setProduks(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'produks'
        },
        () => {
          fetchProducts();
        }
      )
      .subscribe((status) => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error('Supabase Realtime subscription status: ' + status); });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Disable iOS Safari gestures
    const handleGesture = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", handleGesture);
    document.addEventListener("gesturechange", handleGesture);
    document.addEventListener("gestureend", handleGesture);

    // Disable Ctrl + Scroll zoom
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });

    // Disable keyboard zoom
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && (e.key === "+" || e.key === "-" || e.key === "=")) ||
        (e.ctrlKey && e.key === "0")
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("gesturestart", handleGesture);
      document.removeEventListener("gesturechange", handleGesture);
      document.removeEventListener("gestureend", handleGesture);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleAddProduct = async (newProduct: Product) => {
    try { await adminApi('product-create', { product: newProduct }); await fetchProducts(); }
    catch (error: any) { console.error('Error adding product:', error); alert('Gagal menambah produk: ' + (error?.message || error)); throw error; }
  };

  const handleEditProduct = async (updatedProduct: Product) => {
    try { await adminApi('product-update', { product: updatedProduct }); await fetchProducts(); }
    catch (error: any) { console.error('Error editing product:', error); alert('Gagal mengubah produk: ' + (error?.message || error)); throw error; }
  };

  const handleDeleteProduct = async (id: string) => {
    try { await adminApi('product-delete', { produks_id: id }); await fetchProducts(); }
    catch (error: any) { console.error('Error deleting product:', error); alert('Gagal menghapus produk: ' + (error?.message || error)); throw error; }
  };

  if (loading) {
    return <TokopediaSplashScreen message="Menghubungkan ke Database..." />;
  }


  return (
    <Routes>
      <Route path="/admin" element={<AdminPortal produks={produks} onAdd={handleAddProduct} onEdit={handleEditProduct} onDelete={handleDeleteProduct} onRefresh={fetchProducts} />} />
      <Route path="/makkasau" element={<AdminPortal produks={produks} onAdd={handleAddProduct} onEdit={handleEditProduct} onDelete={handleDeleteProduct} onRefresh={fetchProducts} />} />
      <Route path="/checkout" element={
        <Checkout 
          produks={produks} 
          onBack={() => {
            const searchParams = new URLSearchParams(location.search);
            const currentId = searchParams.get('produks_id');
            if (currentId) {
              navigate(`/${currentId}`);
            } else {
              navigate(-1);
            }
          }} 
        />
      } />
      <Route path="/:produks_id" element={<ProductDetail key={location.pathname} produks={produks} />} />
      <Route path="/" element={<RootRedirect />} />
    </Routes>
  );
}

function RootRedirect() {
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const queryId = searchParams.get('produks_id');
    if (!queryId) {
      window.location.replace('https://tokopedia.com/');
    }
  }, [location]);

  return <TokopediaSplashScreen message="Mengalihkan ke Tokopedia..." />;
}

