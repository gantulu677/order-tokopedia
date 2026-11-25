const SUPABASE_URL = 'https://bkyqbbigfvfaobblxziu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJreXFiYmlnZnZmYW9iYmx4eml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4OTkzNDAsImV4cCI6MjExMDQ3NTM0MH0.eQAVNbXm9xBtEZ4VpJsA46lEvnJYZnm3enktYs12Vik';

export function normalizePhone(value: string): string {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.startsWith('62')) return digits;
  return `62${digits}`;
}

export async function adminApi<T = any>(action: string, payload: Record<string, unknown> = {}, token?: string): Promise<T> {
  const savedToken = token !== undefined ? token : (localStorage.getItem('tokopedia_admin_token') || '');
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
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Gagal membaca file gambar.'));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
  const encoded = dataUrl.split(',')[1];
  if (!encoded) throw new Error('Data gambar tidak valid.');
  return adminApi('upload-image', { fileName: file.name, fileType: file.type, fileBase64: encoded }, token);
}
