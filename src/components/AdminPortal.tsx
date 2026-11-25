import React, { useEffect, useState } from 'react';
import { LockKeyhole, ShieldCheck, UserRound, LogOut, KeyRound } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import { adminApi, normalizePhone } from '../lib/adminApi';
import { Product } from '../types';

type Profile = { id: string; phone: string; role: 'admin' | 'users' };
type Props = {
  produks: Product[];
  onAdd: (product: Product) => Promise<void>;
  onEdit: (product: Product) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
};

const PHONE_KEY = 'tokopedia_admin_phone';
const TOKEN_KEY = 'tokopedia_admin_token';

export default function AdminPortal(props: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [pinSetup, setPinSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  const applySession = (result: any) => {
    localStorage.setItem(PHONE_KEY, result.profile.phone);
    sessionStorage.setItem(TOKEN_KEY, result.token);
    setProfile(result.profile);
    setError('');
  };

  useEffect(() => {
    let active = true;
    const restore = async () => {
      // Never persist or replay a PIN from browser storage.
      // A fresh password login is required when the page is reopened.
      const savedPhone = localStorage.getItem(PHONE_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('tokopedia_admin_profile');
      localStorage.removeItem('tokopedia_admin_pin');
      if (active && savedPhone) setPhone(savedPhone);
      if (active) setReady(true);
    };
    restore();
    return () => { active = false; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const normalizedPhone = normalizePhone(phone);
      if (!/^62\d{8,13}$/.test(normalizedPhone)) throw new Error('Nomor telepon tidak valid');
      if (mode === 'register') {
        if (!/^\d{6}$/.test(pin)) throw new Error('PIN harus tepat 6 digit');
        const result = await adminApi('register', { phone: normalizedPhone, password, pin }, '');
        localStorage.setItem(PHONE_KEY, normalizedPhone);
        applySession(result);
      } else {
        const result = await adminApi('login', { phone: normalizedPhone, password }, '');
        if (result.pinSetupRequired) {
          setPendingToken(result.token);
          setPhone(normalizedPhone);
          setPinSetup(true);
        } else {
          applySession(result);
          setPhone(normalizedPhone);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Autentikasi gagal');
    } finally { setBusy(false); }
  };

  const saveFirstPin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(newPin)) { setError('PIN harus tepat 6 digit'); return; }
    setBusy(true); setError('');
    try {
      await adminApi('set-pin', { newPin }, pendingToken);
      const result = await adminApi('pin-login', { phone: normalizePhone(phone), pin: newPin }, '');
      localStorage.setItem(PHONE_KEY, normalizePhone(phone));
      applySession(result);
      setPinSetup(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan PIN');
    } finally { setBusy(false); }
  };

  const changePin = async () => {
    const currentPin = window.prompt('Masukkan PIN lama (6 digit):') || '';
    if (!currentPin) return;
    const nextPin = window.prompt('Masukkan PIN baru (6 digit):') || '';
    if (!/^\d{6}$/.test(nextPin)) { window.alert('PIN baru harus tepat 6 digit'); return; }
    try {
      await adminApi('change-pin', { currentPin, newPin: nextPin });
      window.alert('PIN berhasil diperbarui.');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Gagal mengubah PIN');
    }
  };

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('tokopedia_admin_profile');
    localStorage.removeItem('tokopedia_admin_pin');
    localStorage.removeItem(PHONE_KEY);
    localStorage.removeItem(PIN_KEY);
    setProfile(null); setPassword(''); setPin('');
  };

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Memulihkan sesi admin...</div>;

  if (profile) return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-30 flex gap-2">
        <button onClick={changePin} className="bg-white border border-gray-200 shadow-sm rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1.5"><KeyRound size={14}/> Ubah PIN</button>
        <button onClick={logout} className="bg-white border border-gray-200 shadow-sm rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1.5"><LogOut size={14}/> Keluar</button>
      </div>
      <AdminDashboard {...props} role={profile.role} />
    </div>
  );

  const phoneDigits = phone.replace(/\D/g, '').replace(/^62/, '').replace(/^0/, '');
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl p-7 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-3"><LockKeyhole size={28}/></div>
          <h1 className="text-xl font-black text-gray-900">Tokopedia Admin</h1>
          <p className="text-xs text-gray-500 mt-1">{pinSetup ? 'Buat PIN pertama untuk akun ini' : mode === 'login' ? 'Masuk menggunakan nomor telepon' : 'Daftarkan akun pengguna baru'}</p>
        </div>
        {pinSetup ? (
          <form onSubmit={saveFirstPin} className="space-y-4">
            <label className="block text-xs font-bold text-gray-600">PIN baru (6 digit)<input autoFocus type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,'').slice(0,6))} className="mt-1 w-full border rounded-xl p-3 text-center text-2xl tracking-[0.5em]" placeholder="••••••"/></label>
            <button disabled={busy} className="w-full bg-[#00AA5B] text-white rounded-xl p-3 font-bold">{busy ? 'Menyimpan...' : 'Simpan PIN dan lanjutkan'}</button>
          </form>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-xs font-bold text-gray-600">Nomor telepon
              <div className="flex mt-1 border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-green-100">
                <span className="px-3 py-3 bg-gray-50 border-r text-gray-600">+62</span>
                <input required inputMode="tel" value={phoneDigits} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').replace(/^62/,'').replace(/^0/,''))} className="flex-1 min-w-0 p-3 outline-none" placeholder="81234567890"/>
              </div>
            </label>
            <label className="block text-xs font-bold text-gray-600">Password<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full border rounded-xl p-3" placeholder="Minimal 8 karakter"/></label>
            {mode === 'register' && <label className="block text-xs font-bold text-gray-600">PIN 6 digit<input required type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,6))} className="mt-1 w-full border rounded-xl p-3 text-center tracking-[0.5em]" placeholder="••••••"/></label>}
            {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
            <button disabled={busy} className="w-full bg-[#00AA5B] text-white rounded-xl p-3 font-bold">{busy ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar akun'}</button>
            <button type="button" onClick={()=>{setMode(mode==='login'?'register':'login');setError('');}} className="w-full text-sm text-green-700 font-bold py-2">{mode==='login'?'Belum punya akun? Daftar':'Sudah punya akun? Masuk'}</button>
          </form>
        )}
        {error && pinSetup && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3 mt-3">{error}</p>}
        <div className="mt-6 pt-4 border-t text-[10px] text-gray-400 flex items-center justify-center gap-1"><ShieldCheck size={13}/> PIN diverifikasi di server dan tidak disimpan di browser</div>
      </div>
    </div>
  );
}
