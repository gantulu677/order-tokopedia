import React, { useState, useEffect } from 'react';
import ProductDetail from './components/ProductDetail';
import AdminDashboard from './components/AdminDashboard';
import AdminPinEntry from './components/AdminPinEntry';
import Checkout from './components/Checkout';
import { initialProduksList } from './data';
import { Product } from './types';
import { supabase } from './services/supabase';

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

  useEffect(() => {
    // Real-time listener for products with Supabase
    const fetchAndSubscribe = async () => {
      try {
        const { data, error } = await supabase
          .from('produks')
          .select('*')
          .order('produks_id', { ascending: true });
        
        if (error) {
          handleFirestoreError(error, OperationType.GET, 'produks');
          setLoading(false);
          return;
        }

        if (data) {
          setProduks(data as Product[]);
        }
        setLoading(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'produks');
        setLoading(false);
      }
    };

    fetchAndSubscribe();

    const channel = supabase
      .channel('produks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'produks' },
        () => {
          fetchAndSubscribe();
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
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `produks/${newProduct.produks_id}`);
    }
  };

  const handleEditProduct = async (updatedProduct: Product) => {
    try {
      const { error } = await supabase
        .from('produks')
        .update(updatedProduct)
        .eq('produks_id', updatedProduct.produks_id);
      if (error) throw error;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `produks/${updatedProduct.produks_id}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('produks')
        .delete()
        .eq('produks_id', id);
      if (error) throw error;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `produks/${id}`);
    }
  };

  const handleAuthSuccess = () => {
    setIsAdminAuthorized(true);
    sessionStorage.setItem('adminAuthorized', 'true');
  };

  enum OperationType {
// ... existing OperationType ...
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
// ... existing handleFirestoreError ...
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: null, // No auth as requested
        email: null,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    // Don't throw for list operations to keep the UI alive during initial permission setup
    if (operationType !== OperationType.GET) throw new Error(JSON.stringify(errInfo));
  }

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
