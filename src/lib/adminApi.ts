const SUPABASE_URL = 'https://bkyqbbigfvfaobblxziu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HIzGXC7XaboKJQzF8sztiQ_Qoh4B4Gr';

export function normalizePhone(value: string): string {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.startsWith('62')) return digits;
  return `62${digits}`;
}

export async function adminApi<T = any>(action: string, payload: Record<string, unknown> = {}, token?: string): Promise<T> {
  const savedToken = token || localStorage.getItem('tokopedia_admin_token') || '';
  const response = await fetch(`${SUPABASE_URL}/functions/v1/tokopedia-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      ...(savedToken ? { Authorization: `Bearer ${savedToken}` } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Permintaan admin gagal');
  return result as T;
}

export async function adminUploadImage(file: File): Promise<{ path: string; publicUrl: string }> {
  const token = localStorage.getItem('tokopedia_admin_token') || '';
  if (!token) throw new Error('Sesi admin tidak ditemukan. Silakan login kembali.');
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${SUPABASE_URL}/functions/v1/tokopedia-admin`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
    body: form,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Upload gambar gagal');
  return result as { path: string; publicUrl: string };
}