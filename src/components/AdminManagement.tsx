import React, { useEffect, useState } from 'react';
import { ArrowLeft, Banknote, MessageCircle, Plus, Send, Pencil, Trash2, X } from 'lucide-react';
import { adminApi } from '../lib/adminApi';
import { supabase } from '../lib/supabase';

type Props = {
  tab: 'bank' | 'livechat';
  role: 'admin' | 'users';
  phone: string;
};

type BankAccount = {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  is_active: boolean;
  is_default: boolean;
};

type ChatMessage = {
  id: string;
  phone: string;
  role: 'admin' | 'users';
  message: string;
  created_at: string;
};

type Conversation = {
  phone: string;
  lastMessage: string;
  lastRole: 'admin' | 'users';
  createdAt: string;
};

const emptyBank = (): BankAccount => ({
  id: '',
  bank_name: '',
  account_name: '',
  account_number: '',
  is_active: true,
  is_default: false,
});

export default function AdminManagement({ tab, role, phone }: Props) {
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [bankDraft, setBankDraft] = useState<BankAccount | null>(null);
  const [bankBusy, setBankBusy] = useState(false);
  const [bankError, setBankError] = useState('');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');

  const targetPhone = role === 'users' ? phone : selectedPhone;

  const loadBanks = async () => {
    try {
      setBankError('');
      const result = await adminApi<{ banks: BankAccount[] }>('bank-list');
      setBanks(result.banks || []);
    } catch (error) {
      setBankError(error instanceof Error ? error.message : 'Gagal memuat rekening bank');
    }
  };

  const loadConversations = async () => {
    try {
      const result = await adminApi<{ conversations: Conversation[] }>('chat-list-conversations');
      setConversations(result.conversations || []);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Gagal memuat percakapan');
    }
  };

  const loadMessages = async (target: string) => {
    if (!target) return;
    try {
      const result = await adminApi<{ conversationId: string; messages: ChatMessage[] }>(
        'chat-get-messages',
        { phone: target }
      );
      setConversationId(result.conversationId);
      setMessages(result.messages || []);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Gagal memuat pesan');
    }
  };

  useEffect(() => {
    if (tab === 'bank') void loadBanks();
  }, [tab, role]);

  useEffect(() => {
    if (tab !== 'livechat') return;
    setChatError('');
    if (role === 'admin') {
      setSelectedPhone('');
      setMessages([]);
      setConversationId('');
      void loadConversations();
    } else {
      setSelectedPhone('');
      void loadMessages(phone);
    }
  }, [tab, role, phone]);

  useEffect(() => {
    if (tab !== 'livechat' || !targetPhone) return;
    void loadMessages(targetPhone);
  }, [tab, targetPhone]);

  useEffect(() => {
    if (tab !== 'livechat') return;
    const channels: ReturnType<typeof supabase.channel>[] = [];

    if (role === 'admin') {
      const adminChannel = supabase
        .channel('admin-chat-admin')
        .on('broadcast', { event: 'new-message' }, () => {
          void loadConversations();
          if (selectedPhone) void loadMessages(selectedPhone);
        })
        .subscribe();
      channels.push(adminChannel);
    }

    if (targetPhone && conversationId) {
      const roomChannel = supabase
        .channel('admin-chat-room-' + conversationId)
        .on('broadcast', { event: 'new-message' }, () => {
          void loadMessages(targetPhone);
          if (role === 'admin') void loadConversations();
        })
        .subscribe();
      channels.push(roomChannel);
    }

    return () => {
      channels.forEach(channel => { void supabase.removeChannel(channel); });
    };
  }, [tab, role, targetPhone, conversationId, selectedPhone]);

  const saveBank = async () => {
    if (!bankDraft) return;
    setBankBusy(true);
    setBankError('');
    try {
      const bank = {
        ...bankDraft,
        id: bankDraft.id || ('BANK' + Date.now()),
      };
      await adminApi('bank-save', { bank });
      setBankDraft(null);
      await loadBanks();
    } catch (error) {
      setBankError(error instanceof Error ? error.message : 'Gagal menyimpan rekening');
    } finally {
      setBankBusy(false);
    }
  };

  const deleteBank = async (id: string) => {
    if (!window.confirm('Hapus rekening bank ini?')) return;
    try {
      await adminApi('bank-delete', { id });
      await loadBanks();
    } catch (error) {
      setBankError(error instanceof Error ? error.message : 'Gagal menghapus rekening');
    }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = messageDraft.trim();
    if (!message || chatBusy) return;
    setChatBusy(true);
    setChatError('');
    try {
      const result = await adminApi<{ message: ChatMessage }>('chat-send-message', {
        phone: role === 'admin' ? selectedPhone : undefined,
        message,
      });
      setMessages(current => [...current, result.message]);
      setMessageDraft('');
      if (role === 'admin') void loadConversations();
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Gagal mengirim pesan');
    } finally {
      setChatBusy(false);
    }
  };

  const formatTime = (value: string) => new Date(value).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  if (tab === 'bank') {
    return (
      <div className="w-full h-full min-h-0 flex flex-col bg-[#F8FAFC]">
        <header className="shrink-0 bg-white border-b border-gray-100 px-4 py-5">
          <div className="flex items-center gap-2 text-[#00AA5B]">
            <Banknote size={20} />
            <h1 className="text-lg font-black text-gray-900">Rekening Bank</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {role === 'admin' ? 'Kelola rekening pembayaran.' : 'Pilih rekening tujuan pembayaran.'}
          </p>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {bankError && <p className="rounded-xl bg-red-50 text-red-600 p-3 text-xs">{bankError}</p>}
          {role === 'admin' && !bankDraft && (
            <button onClick={() => setBankDraft(emptyBank())} className="w-full rounded-xl bg-[#00AA5B] text-white p-3 text-sm font-bold flex items-center justify-center gap-2">
              <Plus size={16} /> Tambah Rekening
            </button>
          )}

          {bankDraft && role === 'admin' && (
            <section className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm">{bankDraft.id ? 'Ubah Rekening' : 'Rekening Baru'}</h2>
                <button onClick={() => setBankDraft(null)} aria-label="Tutup"><X size={18}/></button>
              </div>
              {([
                ['bank_name', 'Nama Bank'],
                ['account_name', 'Nama Pemilik Rekening'],
                ['account_number', 'Nomor Rekening'],
              ] as const).map(([field, label]) => (
                <label key={field} className="block text-xs font-semibold text-gray-600">
                  {label}
                  <input
                    value={bankDraft[field]}
                    onChange={event => setBankDraft(current => current ? { ...current, [field]: event.target.value } : current)}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500"
                  />
                </label>
              ))}
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={bankDraft.is_active} onChange={event => setBankDraft(current => current ? { ...current, is_active: event.target.checked, is_default: event.target.checked ? current.is_default : false } : current)} />
                Aktif
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={bankDraft.is_default} disabled={!bankDraft.is_active} onChange={event => setBankDraft(current => current ? { ...current, is_default: event.target.checked } : current)} />
                Jadikan rekening utama
              </label>
              <button disabled={bankBusy} onClick={() => void saveBank()} className="w-full rounded-xl bg-[#00AA5B] p-3 text-sm font-bold text-white disabled:opacity-60">
                {bankBusy ? 'Menyimpan...' : 'Simpan Rekening'}
              </button>
            </section>
          )}

          {banks.map(bank => (
            <article key={bank.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-black text-gray-900">{bank.bank_name}</h2>
                    {bank.is_default && <span className="rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold text-green-700">Utama</span>}
                    {!bank.is_active && <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500">Nonaktif</span>}
                  </div>
                  <p className="mt-2 text-sm font-bold tracking-wide text-gray-800">{bank.account_number}</p>
                  <p className="text-xs text-gray-500">{bank.account_name}</p>
                </div>
                {role === 'admin' && (
                  <div className="flex gap-1">
                    <button onClick={() => setBankDraft(bank)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Ubah rekening"><Pencil size={15}/></button>
                    <button onClick={() => void deleteBank(bank.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Hapus rekening"><Trash2 size={15}/></button>
                  </div>
                )}
              </div>
            </article>
          ))}
          {banks.length === 0 && !bankError && <p className="py-12 text-center text-sm text-gray-400">Belum ada rekening bank aktif.</p>}
        </main>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-[#F8FAFC]">
      <header className="shrink-0 bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-2 text-[#00AA5B]">
          <MessageCircle size={20} />
          <h1 className="text-lg font-black text-gray-900">Livechat</h1>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {role === 'admin' ? 'Daftar percakapan pengguna.' : 'Percakapan Anda dengan Admin.'}
        </p>
      </header>

      {role === 'admin' && !selectedPhone ? (
        <main className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {chatError && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-600">{chatError}</p>}
          {conversations.map(conversation => (
            <button key={conversation.phone} onClick={() => setSelectedPhone(conversation.phone)} className="w-full rounded-xl border border-gray-100 bg-white p-3 text-left hover:border-green-200">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-gray-900">{conversation.phone}</span>
                <span className="text-[10px] text-gray-400">{formatTime(conversation.createdAt)}</span>
              </div>
              <p className="mt-1 truncate text-xs text-gray-500">{conversation.lastRole === 'admin' ? 'Admin: ' : 'Users: '}{conversation.lastMessage}</p>
            </button>
          ))}
          {conversations.length === 0 && <p className="py-12 text-center text-sm text-gray-400">Belum ada percakapan.</p>}
        </main>
      ) : (
        <>
          {role === 'admin' && (
            <div className="shrink-0 border-b border-gray-100 bg-white px-4 py-2">
              <button onClick={() => { setSelectedPhone(''); setMessages([]); setConversationId(''); }} className="flex items-center gap-2 text-xs font-bold text-gray-600">
                <ArrowLeft size={15}/> Kembali ke daftar percakapan
              </button>
              <p className="mt-1 text-sm font-bold text-gray-900">{selectedPhone}</p>
            </div>
          )}

          <main className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            {messages.map(message => (
              <div key={message.id} className={'flex ' + (message.role === role ? 'justify-end' : 'justify-start')}>
                <div className={'max-w-[85%] rounded-2xl px-3 py-2 ' + (message.role === role ? 'bg-[#00AA5B] text-white rounded-br-md' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md')}>
                  <p className="whitespace-pre-wrap break-words text-sm">{message.message}</p>
                  <p className={'mt-1 text-[9px] ' + (message.role === role ? 'text-white/70' : 'text-gray-400')}>{formatTime(message.created_at)} · {message.role === 'admin' ? 'Admin' : 'Users'}</p>
                </div>
              </div>
            ))}
            {messages.length === 0 && <p className="py-8 text-center text-xs text-gray-400">Mulai percakapan dengan mengirim pesan.</p>}
            {chatError && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-600">{chatError}</p>}
          </main>

          <form onSubmit={sendMessage} className="shrink-0 flex items-end gap-2 border-t border-gray-100 bg-white p-3">
            <textarea
              value={messageDraft}
              onChange={event => setMessageDraft(event.target.value)}
              rows={1}
              maxLength={2000}
              placeholder="Tulis pesan..."
              className="min-h-11 max-h-28 flex-1 resize-y rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500"
            />
            <button disabled={chatBusy || !messageDraft.trim() || (role === 'admin' && !selectedPhone)} className="rounded-xl bg-[#00AA5B] p-3 text-white disabled:opacity-50" aria-label="Kirim pesan">
              <Send size={17}/>
            </button>
          </form>
        </>
      )}
    </div>
  );
}
