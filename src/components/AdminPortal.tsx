import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, LockKeyhole, LogOut, ShieldCheck, Package, Landmark, MessageCircle } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import AdminManagement from './AdminManagement';
import { adminApi, normalizePhone } from '../lib/adminApi';
import { Product } from '../types';

type Profile = { id: string; phone: string; role: 'admin' | 'users'; name?: string | null };
type Props = {
  produks: Product[];
  onAdd: (product: Product) => Promise<void>;
  onEdit: (product: Product) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  enableManagementTabs?: boolean;
  produksLoading?: boolean;
};
type Step = 'phone' | 'register' | 'set-pin' | 'login' | 'recover';

const PHONE_KEY = 'tokopedia_admin_phone';
const TOKEN_KEY = 'tokopedia_admin_token';
const PROFILE_KEY = 'tokopedia_admin_profile';
const LEGACY_PIN_KEY = 'tokopedia_admin_pin';
const inputClass = 'mt-1 w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-100 focus:border-green-500';
const buttonClass = 'w-full bg-[#00AA5B] text-white rounded-xl p-3 font-bold disabled:opacity-60';

export default function AdminPortal(props: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.replace(/\/$/, '') || '/admin';
  const activeTab = currentPath === '/admin/bank' ? 'bank' : currentPath === '/admin/live-chat' ? 'livechat' : currentPath === '/admin' || currentPath.startsWith('/admin/produks/') ? 'produk' : null;
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState(localStorage.getItem(PHONE_KEY) || '');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [changePinValue, setChangePinValue] = useState('');
  const [changePinConfirm, setChangePinConfirm] = useState('');

  const clearStoredSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
  };

  const applySession = (result: { token: string; profile: Profile }) => {
    localStorage.setItem(PHONE_KEY, result.profile.phone);
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(result.profile));
    setPhone(result.profile.phone);
    setProfile(result.profile);
    setError('');
    setNotice('');
  };

  useEffect(() => {
    let active = true;
    const restore = async () => {
      localStorage.removeItem(LEGACY_PIN_KEY);
      const savedPhone = localStorage.getItem(PHONE_KEY) || '';
      const token = localStorage.getItem(TOKEN_KEY) || '';
      if (savedPhone) setPhone(savedPhone);
      if (token) {
        try {
          const result = await adminApi<{ profile: Profile }>('get-session', {}, token);
          if (active) setProfile(result.profile);
        } catch {
          clearStoredSession();
          if (active) setStep('phone');
        }
      }
      if (active) setReady(true);
    };
    void restore();
    return () => { active = false; };
  }, []);

  const runAction = async (event: React.FormEvent, action: () => Promise<void>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Permintaan gagal diproses');
    } finally {
      setBusy(false);
    }
  };

  const identifyPhone = (event: React.FormEvent) => runAction(event, async () => {
    const normalized = normalizePhone(phone);
    if (!/^62\d{8,13}$/.test(normalized)) throw new Error('Nomor telepon tidak valid');
    const result = await adminApi<{ registered: boolean }>('identify-phone', { phone: normalized }, '');
    setPhone(normalized);
    localStorage.setItem(PHONE_KEY, normalized);
    setStep(result.registered ? 'login' : 'register');
  });

  const register = (event: React.FormEvent) => runAction(event, async () => {
    if (!name.trim()) throw new Error('Nama wajib diisi');
    if (password.length < 8) throw new Error('Password minimal 8 karakter');
    const result = await adminApi<{ token: string }>('register', {
      phone: normalizePhone(phone), name: name.trim(), password,
    }, '');
    setPendingToken(result.token);
    setPassword('');
    setStep('set-pin');
  });

  const createPin = (event: React.FormEvent) => runAction(event, async () => {
    if (!/^\d{6}$/.test(newPin)) throw new Error('PIN harus tepat 6 digit');
    if (newPin !== confirmPin) throw new Error('Konfirmasi PIN tidak sama');
    if (!pendingToken) throw new Error('Sesi registrasi tidak ditemukan. Silakan ulangi registrasi.');
    await adminApi('set-pin', { newPin }, pendingToken);
    setPendingToken('');
    clearStoredSession();
    setNewPin('');
    setConfirmPin('');
    setPin('');
    setStep('login');
    setNotice('Registrasi berhasil. Silakan masuk menggunakan PIN baru.');
  });

  const login = (event: React.FormEvent) => runAction(event, async () => {
    if (!/^\d{6}$/.test(pin)) throw new Error('PIN harus tepat 6 digit');
    const result = await adminApi<{ token: string; profile: Profile }>('pin-login', {
      phone: normalizePhone(phone), pin,
    }, '');
    applySession(result);
    setPin('');
  });

  const recoverPin = (event: React.FormEvent) => runAction(event, async () => {
    if (!password) throw new Error('Password wajib diisi');
    if (!/^\d{6}$/.test(newPin)) throw new Error('PIN baru harus tepat 6 digit');
    if (newPin !== confirmPin) throw new Error('Konfirmasi PIN tidak sama');
    await adminApi('reset-pin', { phone: normalizePhone(phone), password, newPin }, '');
    setPassword('');
    setNewPin('');
    setConfirmPin('');
    setPin('');
    setStep('login');
    setNotice('PIN berhasil diperbarui. Silakan login menggunakan PIN baru.');
  });

  const changePin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (!/^\d{6}$/.test(currentPin)) throw new Error('PIN lama harus tepat 6 digit');
      if (!/^\d{6}$/.test(changePinValue)) throw new Error('PIN baru harus tepat 6 digit');
      if (changePinValue !== changePinConfirm) throw new Error('Konfirmasi PIN tidak sama');
      await adminApi('change-pin', { currentPin, newPin: changePinValue });
      setCurrentPin('');
      setChangePinValue('');
      setChangePinConfirm('');
      setChangePinOpen(false);
      setNotice('PIN berhasil diperbarui.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengubah PIN');
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    clearStoredSession();
    localStorage.removeItem(LEGACY_PIN_KEY);
    setProfile(null);
    setPassword('');
    setPin('');
    setName('');
    setStep('phone');
    setError('');
    setNotice('');
  };

  const goToPhone = () => {
    setStep('phone');
    setPassword('');
    setPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setNotice('');
  };

  if (!ready) return <div className="w-full h-full min-h-full flex flex-col items-center justify-center text-sm text-gray-500">Memulihkan sesi admin...</div>;

  if (profile) {
    if (!props.enableManagementTabs) {
      return <div className="w-full h-full min-h-full flex flex-col bg-white"><main className="min-h-0 flex-1"><AdminDashboard {...props} role={profile.role} /></main></div>;
    }
    const isProducts = currentPath === '/admin' || currentPath === '/admin/produks/new' || /^\/admin\/produks\/[^/]+$/.test(currentPath);
    const isProfile = currentPath === '/admin/profile';
    const isBank = currentPath === '/admin/bank';
    const isLiveChat = currentPath === '/admin/live-chat';
    const isKnownRoute = isProducts || isProfile || isBank || isLiveChat;
    return <div className="w-full h-full min-h-full flex flex-col bg-[#F8FAFC]">
      <header className="shrink-0 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
        <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-[#00AA5B]">Tokopedia</p><h1 className="text-sm font-black text-gray-900">Admin Dashboard</h1></div>
        <button type="button" onClick={() => navigate('/admin/profile')} className={'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ' + (isProfile ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600')} aria-current={isProfile ? 'page' : undefined}><ShieldCheck size={15}/> Profil</button>
      </header>
      <main className="content-admin min-h-0 flex-1 overflow-y-auto">
        {!isKnownRoute ? <div className="p-8 text-center"><h2 className="text-lg font-black text-gray-900">Halaman Admin Tidak Ditemukan</h2><p className="mt-2 text-sm text-gray-500">Alamat halaman yang dibuka tidak tersedia.</p><button onClick={() => navigate('/admin')} className="mt-4 rounded-xl bg-[#00AA5B] px-4 py-2 text-sm font-bold text-white">Kembali ke Produk</button></div>
        : isProducts ? <AdminDashboard {...props} role={profile.role}/>
        : isBank || isLiveChat ? <AdminManagement tab={activeTab as 'bank' | 'livechat'} role={profile.role} phone={profile.phone}/>
        : <section className="mx-auto w-full max-w-2xl space-y-4 p-4">
            {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-600">{error}</p>}
            {notice && <p role="status" className="rounded-xl border border-green-100 bg-green-50 p-3 text-xs font-medium text-green-700">{notice}</p>}
            <div className="rounded-2xl border border-gray-100 bg-white p-5"><h2 className="text-base font-black text-gray-900">Profil Akun</h2><dl className="mt-4 space-y-4 text-sm">
              <div><dt className="text-xs font-semibold text-gray-400">Nama</dt><dd className="mt-1 font-bold text-gray-800">{profile.name || 'Belum diatur'}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-400">Nomor Telepon</dt><dd className="mt-1 font-bold text-gray-800">+{profile.phone}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-400">Role</dt><dd className="mt-1 font-bold capitalize text-gray-800">{profile.role}</dd></div>
            </dl></div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5"><h2 className="text-sm font-black text-gray-900">Pengaturan Akun</h2>
              <button type="button" onClick={() => { setChangePinOpen(true); setError(''); setNotice(''); }} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left text-sm font-bold text-gray-700"><KeyRound size={17}/> Ganti PIN</button>
              <button onClick={logout} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-red-100 p-3 text-left text-sm font-bold text-red-600"><LogOut size={17}/> Logout</button>
            </div>
            {changePinOpen && <form onSubmit={changePin} className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
              <h3 className="text-sm font-black text-gray-900">Perbarui PIN</h3>
              <label className="block text-xs font-semibold text-gray-600">PIN Lama
                <input type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} value={currentPin} onChange={event => setCurrentPin(event.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm tracking-[0.3em] outline-none focus:border-green-500" placeholder="6 digit" />
              </label>
              <label className="block text-xs font-semibold text-gray-600">PIN Baru
                <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={changePinValue} onChange={event => setChangePinValue(event.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm tracking-[0.3em] outline-none focus:border-green-500" placeholder="6 digit" />
              </label>
              <label className="block text-xs font-semibold text-gray-600">Konfirmasi PIN Baru
                <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={changePinConfirm} onChange={event => setChangePinConfirm(event.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm tracking-[0.3em] outline-none focus:border-green-500" placeholder="Ulangi 6 digit PIN baru" />
              </label>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => { setChangePinOpen(false); setCurrentPin(''); setChangePinValue(''); setChangePinConfirm(''); setError(''); }} className="flex-1 rounded-xl border border-gray-200 p-3 text-xs font-bold text-gray-600 disabled:opacity-50">Batal</button>
                <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-[#00AA5B] p-3 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Menyimpan...' : 'Simpan PIN'}</button>
              </div>
            </form>}
          </section>}
      </main>
      <nav className="shrink-0 grid grid-cols-3 border-t border-gray-100 bg-white pb-[env(safe-area-inset-bottom)]">
        <button onClick={() => navigate('/admin')} aria-current={activeTab === 'produk' ? 'page' : undefined} className={'flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold ' + (activeTab === 'produk' ? 'text-[#00AA5B]' : 'text-gray-400')}><Package size={18}/> Produk</button>
        <button onClick={() => navigate('/admin/bank')} aria-current={isBank ? 'page' : undefined} className={'flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold ' + (isBank ? 'text-[#00AA5B]' : 'text-gray-400')}><Landmark size={18}/> Bank</button>
        <button onClick={() => navigate('/admin/live-chat')} aria-current={isLiveChat ? 'page' : undefined} className={'flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold ' + (isLiveChat ? 'text-[#00AA5B]' : 'text-gray-400')}><MessageCircle size={18}/> Livechat</button>
      </nav>
    </div>;
  }

  const phoneDigits = phone.replace(/\D/g, '').replace(/^62/, '').replace(/^0/, '');
  const headings: Record<Step, string> = {
    phone: 'Masuk atau daftar akun',
    register: 'Daftarkan akun baru',
    'set-pin': 'Buat PIN enam digit',
    login: 'Masukkan PIN',
    recover: 'Pulihkan PIN',
  };
  const subtitles: Record<Step, string> = {
    phone: 'Masukkan nomor telepon untuk melanjutkan',
    register: 'Lengkapi informasi akun pengguna baru',
    'set-pin': 'Tentukan PIN yang akan digunakan untuk login',
    login: 'Masuk menggunakan PIN akun Anda',
    recover: 'Verifikasi password untuk membuat PIN baru',
  };

  return (
    <div className="w-full h-full min-h-full bg-slate-950 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl p-7 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-3"><LockKeyhole size={28}/></div>
          <h1 className="text-xl font-black text-gray-900">Tokopedia Admin</h1>
          <p className="text-xs text-gray-500 mt-1">{subtitles[step]}</p>
        </div>
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900 text-center">{headings[step]}</h2>
          {step !== 'phone' && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-500">
              <span>+{normalizePhone(phone)}</span>
              {step !== 'set-pin' && <button type="button" onClick={goToPhone} className="text-green-700 font-bold">Ganti</button>}
            </div>
          )}
        </div>

        {step === 'phone' && (
          <form onSubmit={identifyPhone} className="space-y-4">
            <label className="block text-xs font-bold text-gray-600">Nomor telepon
              <div className="flex mt-1 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-green-100">
                <span className="px-3 py-3 bg-gray-50 border-r text-gray-600">+62</span>
                <input required autoFocus inputMode="tel" value={phoneDigits} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').replace(/^62/,'').replace(/^0/,''))} className="flex-1 min-w-0 p-3 outline-none" placeholder="81234567890"/>
              </div>
            </label>
            <button disabled={busy} className={buttonClass}>{busy ? 'Memeriksa...' : 'Lanjutkan'}</button>
          </form>
        )}

        {step === 'register' && (
          <form onSubmit={register} className="space-y-4">
            <label className="block text-xs font-bold text-gray-600">Nama
              <input required autoFocus value={name} onChange={e=>setName(e.target.value)} className={inputClass} placeholder="Nama lengkap"/>
            </label>
            <label className="block text-xs font-bold text-gray-600">Password
              <input required type="password" autoComplete="new-password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} className={inputClass} placeholder="Minimal 8 karakter"/>
            </label>
            <button disabled={busy} className={buttonClass}>{busy ? 'Mendaftarkan...' : 'Daftar akun'}</button>
          </form>
        )}

        {step === 'set-pin' && (
          <form onSubmit={createPin} className="space-y-4">
            <label className="block text-xs font-bold text-gray-600">PIN baru (6 digit)
              <input required autoFocus type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,'').slice(0,6))} className={inputClass + ' text-center text-2xl tracking-[0.5em]'} placeholder="••••••"/>
            </label>
            <label className="block text-xs font-bold text-gray-600">Konfirmasi PIN
              <input required type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={confirmPin} onChange={e=>setConfirmPin(e.target.value.replace(/\D/g,'').slice(0,6))} className={inputClass + ' text-center text-2xl tracking-[0.5em]'} placeholder="••••••"/>
            </label>
            <button disabled={busy} className={buttonClass}>{busy ? 'Menyimpan...' : 'Simpan PIN'}</button>
          </form>
        )}

        {step === 'login' && (
          <form onSubmit={login} className="space-y-4">
            <label className="block text-xs font-bold text-gray-600">PIN (6 digit)
              <input required autoFocus type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,6))} className={inputClass + ' text-center text-2xl tracking-[0.5em]'} placeholder="••••••"/>
            </label>
            <button disabled={busy} className={buttonClass}>{busy ? 'Memverifikasi...' : 'Masuk ke Dashboard'}</button>
            <button type="button" onClick={()=>{setStep('recover');setError('');setNotice('');}} className="w-full text-sm text-green-700 font-bold py-2">Lupa PIN?</button>
          </form>
        )}

        {step === 'recover' && (
          <form onSubmit={recoverPin} className="space-y-4">
            <label className="block text-xs font-bold text-gray-600">Password akun
              <input required autoFocus type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className={inputClass} placeholder="Masukkan password akun"/>
            </label>
            <label className="block text-xs font-bold text-gray-600">PIN baru (6 digit)
              <input required type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,'').slice(0,6))} className={inputClass + ' text-center text-2xl tracking-[0.5em]'} placeholder="••••••"/>
            </label>
            <label className="block text-xs font-bold text-gray-600">Konfirmasi PIN baru
              <input required type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={confirmPin} onChange={e=>setConfirmPin(e.target.value.replace(/\D/g,'').slice(0,6))} className={inputClass + ' text-center text-2xl tracking-[0.5em]'} placeholder="••••••"/>
            </label>
            <button disabled={busy} className={buttonClass}>{busy ? 'Memverifikasi...' : 'Verifikasi dan ubah PIN'}</button>
            <button type="button" onClick={()=>{setStep('login');setPassword('');setNewPin('');setConfirmPin('');setError('');}} className="w-full text-sm text-gray-500 font-bold py-2 flex items-center justify-center gap-1"><ArrowLeft size={14}/> Kembali ke login</button>
          </form>
        )}

        {error && <p role="alert" className="text-xs text-red-600 bg-red-50 rounded-lg p-3 mt-4">{error}</p>}
        {notice && <p role="status" className="text-xs text-green-700 bg-green-50 rounded-lg p-3 mt-4">{notice}</p>}
        <div className="mt-6 pt-4 border-t text-[10px] text-gray-400 flex items-center justify-center gap-1"><ShieldCheck size={13}/> Autentikasi diverifikasi oleh server</div>
      </div>
    </div>
  );
}
