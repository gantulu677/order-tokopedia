import React, { useState, useEffect } from 'react';
import ProductDetail from './components/ProductDetail';
import AdminDashboard from './components/AdminDashboard';
import AdminPinEntry from './components/AdminPinEntry';
import Checkout from './components/Checkout';
import { initialProduksList } from './data';
import { Product } from './types';
import { supabase } from './lib/supabase';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [search, setSearch] = useState(window.location.search);
  const [produks, setProduks] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(() => {
    return sessionStorage.getItem('adminAuthorized') === 'true';
  });

  useEffect(() => {
// ... existing useEffect handleLocationChange ...
    const handleLocationChange = () => {
      setPath(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    if (path === '/' && !new URLSearchParams(search).get('produks_id')) {
      window.location.replace('https://tokopedia.com/');
    }
  }, [path, search]);

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
// ... existing loading UI ...
    return (
      <div className="flex items-center justify-center h-full bg-white max-w-md mx-auto shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
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

  if (path === '/admin') {
    if (!isAdminAuthorized) {
      return <AdminPinEntry onSuccess={handleAuthSuccess} />;
    }
    return (
      <AdminDashboard 
        produks={produks} 
        onAdd={handleAddProduct}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct}
        onRefresh={fetchProducts}
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
