import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';

interface AdminPinEntryProps {
  onSuccess: (user: { id: string; username: string; name: string; role: 'admin' | 'super_admin' }) => void;
}

export default function AdminPinEntry({ onSuccess }: AdminPinEntryProps) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Authenticate PIN on server-side
  const submitPin = async (completedPin: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: completedPin }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          sessionStorage.setItem('tokped_admin_session', JSON.stringify(data.user));
          onSuccess(data.user);
        } else {
          setErrorMsg('PIN tidak valid');
          setPin('');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.error || 'PIN tidak valid');
        setPin('');
      }
    } catch (err) {
      setErrorMsg('Kesalahan koneksi ke server');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (char: string) => {
    if (loading || pin.length >= 6) return;
    setErrorMsg(null);
    const nextPin = pin + char;
    setPin(nextPin);

    if (nextPin.length === 6) {
      submitPin(nextPin);
    }
  };

  const handleDelete = () => {
    if (loading) return;
    setErrorMsg(null);
    setPin(p => p.slice(0, -1));
  };

  // Setup Keyboard support (0-9, Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleInput(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pin, loading]);

  const numpadKeys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '', '0', 'del'
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center font-sans antialiased p-4">
      {/* Smartphone mock boundary - max-width 420px */}
      <div className="w-full max-w-[420px] bg-white rounded-[36px] shadow-2xl p-8 border border-gray-100 flex flex-col justify-between select-none relative overflow-hidden">
        
        {/* Header Block */}
        <div className="flex flex-col items-center text-center pt-4">
          <div className="w-14 h-14 bg-green-50 text-[#00AA5B] rounded-2xl flex items-center justify-center mb-5">
            <Lock size={28} className="stroke-[2.5]" />
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight mb-1">Akses Katalog</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Masukkan PIN Pengelola</p>
        </div>

        {/* PIN Indicators */}
        <div className="my-8 flex justify-center items-center gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <span 
              key={i} 
              className={`text-xl font-bold transition-all ${
                i < pin.length ? 'text-[#00AA5B]' : 'text-gray-200'
              }`}
            >
              {i < pin.length ? '●' : '○'}
            </span>
          ))}
        </div>

        {/* Status / Error Block */}
        <div className="h-6 flex items-center justify-center mb-6">
          {errorMsg && (
            <div className="flex items-center gap-1.5 text-rose-600 text-xs font-black uppercase tracking-wider">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest animate-pulse">
              <span>Memproses PIN...</span>
            </div>
          )}
        </div>

        {/* Flat Numpad (Instant Tap Response, No Animation) */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {numpadKeys.map((key, index) => {
            if (key === '') {
              return <div key={`empty-${index}`} />;
            }
            if (key === 'del') {
              return (
                <button
                  key="del"
                  onClick={handleDelete}
                  disabled={loading}
                  className="h-16 flex items-center justify-center rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 font-bold text-sm transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                    <line x1="18" y1="9" x2="12" y2="15" />
                    <line x1="12" y1="9" x2="18" y2="15" />
                  </svg>
                </button>
              );
            }
            return (
              <button
                key={key}
                onClick={() => handleInput(key)}
                disabled={loading}
                className="h-16 flex items-center justify-center rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-800 font-black text-xl transition-colors cursor-pointer"
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-8 flex items-center justify-center gap-2 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
          <ShieldCheck size={14} className="text-[#00AA5B]" />
          <span>Sistem Keamanan Terenkripsi</span>
        </div>

      </div>
    </div>
  );
}
