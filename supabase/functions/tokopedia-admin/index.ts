import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const enc = new TextEncoder();

function b64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromB64url(value: string) {
  const s = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(s + "=".repeat((4 - s.length % 4) % 4));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
function normalizePhone(input: string) {
  let digits = String(input ?? "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return "62" + digits;
}
function validPhone(phone: string) {
  return /^62[0-9]{8,13}$/.test(phone);
}
async function hashSecret(value: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(value), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" }, key, 256);
  return `pbkdf2$210000$${b64url(salt)}$${b64url(new Uint8Array(bits))}`;
}
async function verifySecret(value: string, encoded: string | null) {
  if (!encoded) return false;
  const [kind, rounds, saltText, hashText] = encoded.split("$");
  if (kind !== "pbkdf2" || !rounds || !saltText || !hashText) return false;
  const salt = fromB64url(saltText);
  const key = await crypto.subtle.importKey("raw", enc.encode(value), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: Number(rounds), hash: "SHA-256" }, key, 256));
  const expected = fromB64url(hashText);
  return bits.length === expected.length && bits.every((b, i) => b === expected[i]);
}
async function sign(payload: Record<string, unknown>) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", enc.encode(serviceKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
  return body + "." + b64url(sig);
}
async function sessionFrom(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const [body, signature] = token.split(".");
  if (!body || !signature) throw new Error("Sesi tidak valid");
  const key = await crypto.subtle.importKey("raw", enc.encode(serviceKey), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("HMAC", key, fromB64url(signature), enc.encode(body));
  if (!ok) throw new Error("Sesi tidak valid");
  const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
  if (!payload.exp || payload.exp < Date.now() || !payload.sub) throw new Error("Sesi kedaluwarsa");
  const { data, error } = await db.from("admin_tokopedia").select("id,phone,name,role,pin").eq("id", payload.sub).maybeSingle();
  if (error || !data) throw new Error("Akun tidak ditemukan");
  return data;
}
async function issueSession(account: { id: string; phone: string; role: string; name?: string | null }) {
  const token = await sign({ sub: account.id, phone: account.phone, role: account.role, exp: Date.now() + 12 * 60 * 60 * 1000 });
  return { token, profile: { id: account.id, phone: account.phone, role: account.role, name: account.name ?? null } };
}
function isValidProductFeatures(value: unknown): value is Array<{ label: string; value: string }> {
  return Array.isArray(value) && value.every((feature) =>
    feature !== null &&
    typeof feature === "object" &&
    !Array.isArray(feature) &&
    typeof (feature as Record<string, unknown>).label === "string" &&
    typeof (feature as Record<string, unknown>).value === "string"
  );
}
function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
async function chatConversationTopicId(phone: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(serviceKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode("admin-chat:" + phone)));
  return b64url(signature);
}
async function broadcastChatChange(phone: string) {
  const topics = ["admin-chat-room-" + await chatConversationTopicId(phone), "admin-chat-admin"];
  for (const topic of topics) {
    const channel = db.channel(topic);
    try {
      await channel.send({ type: "broadcast", event: "new-message", payload: {} });
    } catch (error) {
      console.error("Livechat broadcast failed:", error);
    }
    try {
      await db.removeChannel(channel);
    } catch (error) {
      console.error("Livechat channel cleanup failed:", error);
    }
  }
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const action = String(body.action || "");
    if (["identify-phone", "register", "pin-login", "reset-pin"].includes(action)) {
      const phone = normalizePhone(body.phone);
      if (!validPhone(phone)) return response({ error: "Nomor telepon tidak valid" }, 400);

      const { data: account, error: lookupError } = await db
        .from("admin_tokopedia")
        .select("id,phone,name,password,pin,role")
        .eq("phone", phone)
        .maybeSingle();
      if (lookupError) return response({ error: "Gagal memeriksa akun" }, 500);

      if (action === "identify-phone") {
        return response({ registered: Boolean(account) });
      }

      if (action === "register") {
        if (account) return response({ error: "Nomor telepon sudah terdaftar" }, 409);
        const name = String(body.name || "").trim();
        const password = String(body.password || "");
        if (!name) return response({ error: "Nama wajib diisi" }, 400);
        if (password.length < 8) return response({ error: "Password minimal 8 karakter" }, 400);

        const { data, error: insertError } = await db.from("admin_tokopedia").insert({
          phone,
          name,
          password: await hashSecret(password),
          pin: null,
          role: "users",
        }).select("id,phone,name,role").single();

        if (insertError) {
          return response({ error: insertError.code === "23505" ? "Nomor telepon sudah terdaftar" : "Registrasi gagal" }, insertError.code === "23505" ? 409 : 400);
        }
        return response(await issueSession(data));
      }

      if (!account) return response({ error: "Akun tidak ditemukan atau kredensial salah" }, 401);

      if (action === "pin-login") {
        const submittedPin = String(body.pin || "");
        if (!/^\d{6}$/.test(submittedPin)) return response({ error: "PIN harus tepat 6 digit" }, 400);
        if (!await verifySecret(submittedPin, account.pin)) {
          return response({ error: "PIN salah atau belum dibuat" }, 401);
        }
        return response(await issueSession(account));
      }

      if (action === "reset-pin") {
        const password = String(body.password || "");
        const newPin = String(body.newPin || "");
        if (!/^\d{6}$/.test(newPin)) return response({ error: "PIN baru harus tepat 6 digit" }, 400);
        if (!await verifySecret(password, account.password)) {
          return response({ error: "Password salah" }, 401);
        }
        const { error: updateError } = await db.from("admin_tokopedia")
          .update({ pin: await hashSecret(newPin) })
          .eq("id", account.id);
        if (updateError) return response({ error: "Gagal memperbarui PIN" }, 400);
        return response({ success: true });
      }
    }

    const account = await sessionFrom(req);

    if (action === "get-session") {
      return response({ profile: { id: account.id, phone: account.phone, role: account.role, name: account.name ?? null } });
    }

    if (action === "set-pin" || action === "change-pin") {
      const nextPin = String(body.newPin || "");
      if (!/^\d{6}$/.test(nextPin)) return response({ error: "PIN baru harus 6 digit" }, 400);
      if (action === "set-pin" && account.pin) return response({ error: "PIN sudah tersedia; gunakan ubah PIN" }, 409);
      if (action === "change-pin" && (!await verifySecret(String(body.currentPin || ""), account.pin))) return response({ error: "PIN lama salah" }, 401);
      const { error } = await db.from("admin_tokopedia").update({ pin: await hashSecret(nextPin) }).eq("id", account.id);
      if (error) return response({ error: error.message }, 400);
      return response({ success: true });
    }

    if (action === "upload-image") {
      const fileType = String(body.fileType || "");
      const fileBase64 = String(body.fileBase64 || "");
      const allowedTypes: Record<string, string> = {
        "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
        "image/gif": "gif", "image/avif": "avif"
      };
      if (!allowedTypes[fileType]) return response({ error: "Format gambar tidak didukung" }, 400);
      if (!fileBase64 || fileBase64.length > 11_200_000) return response({ error: "Ukuran gambar maksimal 8 MB" }, 400);
      const binary = atob(fileBase64);
      if (binary.length > 8 * 1024 * 1024) return response({ error: "Ukuran gambar maksimal 8 MB" }, 400);
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      const path = "products/" + account.id + "/" + crypto.randomUUID() + "." + allowedTypes[fileType];
      const { data, error } = await db.storage.from("images").upload(path, bytes, {
        contentType: fileType, cacheControl: "3600", upsert: false
      });
      if (error) return response({ error: error.message }, 400);
      const { data: publicData } = db.storage.from("images").getPublicUrl(data.path);
      return response({ path: data.path, publicUrl: publicData.publicUrl });
    }

    if (action === "bank-list") {
      let query = db.from("admin_bank").select("*").order("is_default", { ascending: false }).order("bank_name");
      if (account.role !== "admin") query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) return response({ error: "Gagal memuat rekening bank" }, 400);
      return response({ banks: data || [] });
    }

    if (action === "bank-save") {
      if (!body.bank || typeof body.bank !== "object" || Array.isArray(body.bank)) {
        return response({ error: "Data rekening tidak valid" }, 400);
      }
      const bank = body.bank as Record<string, unknown>;
      const id = String(bank.id || "").trim();
      const bankName = String(bank.bank_name || "").trim();
      const accountName = String(bank.account_name || "").trim();
      const accountNumber = String(bank.account_number || "").trim();
      const isActive = bank.is_active !== false;
      const isDefault = bank.is_default === true;
      if (!id || !bankName || !accountName || !accountNumber) {
        return response({ error: "Nama bank, pemilik, dan nomor rekening wajib diisi" }, 400);
      }
      if (isDefault && !isActive) return response({ error: "Rekening utama harus aktif" }, 400);
      if (isDefault) {
        const { error: resetError } = await db.from("admin_bank").update({ is_default: false }).neq("id", id);
        if (resetError) return response({ error: "Gagal memperbarui rekening utama" }, 400);
      }
      const { data, error } = await db.from("admin_bank").upsert({
        id,
        bank_name: bankName,
        account_name: accountName,
        account_number: accountNumber,
        is_active: isActive,
        is_default: isDefault,
        updated_at: new Date().toISOString(),
      }).select().single();
      if (error) return response({ error: error.message }, 400);
      return response({ bank: data });
    }

    if (action === "bank-delete") {
      const id = String(body.id || "").trim();
      if (!id) return response({ error: "ID rekening wajib diisi" }, 400);
      const { error } = await db.from("admin_bank").delete().eq("id", id);
      if (error) return response({ error: error.message }, 400);
      return response({ success: true });
    }

    if (action === "chat-list-conversations") {
      if (account.role !== "admin") return response({ error: "Akses ditolak" }, 403);
      const { data, error } = await db.from("admin_chat")
        .select("phone,role,message,created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) return response({ error: "Gagal memuat daftar percakapan" }, 400);
      const seen = new Set<string>();
      const conversations = [];
      for (const row of data || []) {
        if (seen.has(row.phone)) continue;
        seen.add(row.phone);
        conversations.push({
          phone: row.phone,
          lastMessage: row.message,
          lastRole: row.role,
          createdAt: row.created_at,
        });
      }
      return response({ conversations });
    }

    if (action === "chat-get-messages") {
      const targetPhone = account.role === "admin"
        ? normalizePhone(String(body.phone || ""))
        : account.phone;
      if (!validPhone(targetPhone)) return response({ error: "Nomor percakapan tidak valid" }, 400);
      const { data, error } = await db.from("admin_chat")
        .select("id,phone,role,message,created_at")
        .eq("phone", targetPhone)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) return response({ error: "Gagal memuat pesan" }, 400);
      return response({
        conversationId: await chatConversationTopicId(targetPhone),
        messages: data || [],
      });
    }

    if (action === "chat-send-message") {
      const targetPhone = account.role === "admin"
        ? normalizePhone(String(body.phone || ""))
        : account.phone;
      const message = String(body.message || "").trim();
      if (!validPhone(targetPhone)) return response({ error: "Nomor percakapan tidak valid" }, 400);
      if (!message || message.length > 2000) return response({ error: "Pesan wajib diisi dan maksimal 2000 karakter" }, 400);
      const { data, error } = await db.from("admin_chat").insert({
        conversation_id: targetPhone,
        phone: targetPhone,
        role: account.role,
        message,
      }).select("id,phone,role,message,created_at").single();
      if (error) return response({ error: "Gagal mengirim pesan" }, 400);
      await broadcastChatChange(targetPhone);
      return response({ message: data });
    }

    if (action === "product-create") {
      if (!body.product || typeof body.product !== "object" || Array.isArray(body.product)) {
        return response({ error: "Data produk tidak valid" }, 400);
      }
      const product = { ...body.product };
      if (Object.prototype.hasOwnProperty.call(product, "features") && !isValidProductFeatures(product.features)) {
        return response({ error: "Fitur produk harus berupa array Label dan Value." }, 400);
      }
      if (account.role !== "admin") product.url = "https://www.tokopedia.com";
      const { data, error } = await db.from("produks").insert(product).select().single();
      if (error) return response({ error: error.message }, 400);
      return response({ data });
    }
    if (action === "product-update") {
      if (!body.product || typeof body.product !== "object" || Array.isArray(body.product)) {
        return response({ error: "Data produk tidak valid" }, 400);
      }
      const product = { ...body.product };
      if (Object.prototype.hasOwnProperty.call(product, "features") && !isValidProductFeatures(product.features)) {
        return response({ error: "Fitur produk harus berupa array Label dan Value." }, 400);
      }
      const id = String(product.produks_id || "");
      delete product.produks_id;
      if (!id) return response({ error: "ID produk wajib diisi" }, 400);
      if (account.role !== "admin" && Object.prototype.hasOwnProperty.call(product, "url")) {
        const { data: current, error: readError } = await db.from("produks").select("url").eq("produks_id", id).single();
        if (readError) return response({ error: readError.message }, 404);
        if (product.url !== current.url) return response({ error: "Role users tidak dapat mengubah URL produk" }, 403);
        delete product.url;
      }
      product.updated_at = new Date().toISOString();
      const { data, error } = await db.from("produks").update(product).eq("produks_id", id).select().single();
      if (error) return response({ error: error.message }, 400);
      return response({ data });
    }
    if (action === "product-delete") {
      const id = String(body.produks_id || "");
      if (!id) return response({ error: "ID produk wajib diisi" }, 400);
      const { error } = await db.from("produks").delete().eq("produks_id", id);
      if (error) return response({ error: error.message }, 400);
      return response({ success: true });
    }
    return response({ error: "Action tidak dikenal" }, 400);
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Internal server error" }, 401);
  }
});