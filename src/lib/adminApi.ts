import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './supabase';

export function normalizePhone(value: string): string {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.startsWith('62')) return digits;
  return `62${digits}`;
}

export async function adminApi<T = any>(
  action: string,
  payload: Record<string, unknown> = {},
  token?: string,
): Promise<T> {
  const savedToken = token !== undefined
    ? token
    : sessionStorage.getItem('tokopedia_admin_token') || '';
  const response = await fetch(`${SUPABASE_URL}/functions/v1/tokopedia-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      ...(savedToken ? { Authorization: `Bearer ${savedToken}` } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Permintaan admin gagal');
  return result as T;
}

export async function adminUploadImage(file: File): Promise<{ path: string; publicUrl: string }> {
  const token = sessionStorage.getItem('tokopedia_admin_token') || '';
  if (!token) throw new Error('Sesi admin tidak ditemukan. Silakan login kembali.');

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Gagal membaca file gambar.'));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });

  const encoded = dataUrl.split(',')[1];
  if (!encoded) throw new Error('Data gambar tidak valid.');

  return adminApi('upload-image', {
    fileName: file.name,
    fileType: file.type,
    fileBase64: encoded,
  }, token);
}
