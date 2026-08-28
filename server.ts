import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://jvqrturbkgyxsycdcfwp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2cXJ0dXJia2d5eHN5Y2RjZndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDUzNjEsImV4cCI6MjA5Mjk4MTM2MX0.zMwmCC5s6M1hvPD5cRcde-cGxRc5E9NsIGoEnE2htis';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const app = express();
app.use(express.json());
app.use(cookieParser("super-secret-tokped-key"));

const PORT = 3000;

interface AdminSession {
  id: string;
  username: string;
  name: string;
  role: "admin" | "super_admin";
}

function getSession(req: express.Request): AdminSession | null {
  let sessionCookie = req.cookies.admin_session;
  if (!sessionCookie) {
    sessionCookie = req.headers["x-admin-session"] as string;
  }
  if (!sessionCookie) return null;
  try {
    // Decode if URI encoded
    const decoded = sessionCookie.startsWith("j:") ? sessionCookie.slice(2) : sessionCookie;
    return JSON.parse(decodeURIComponent(decoded));
  } catch {
    try {
      return JSON.parse(sessionCookie);
    } catch {
      return null;
    }
  }
}

// ---------------- API ENDPOINTS ----------------

// API Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Check if user has active session
app.get("/api/auth/me", (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ authenticated: false, error: "Session expired" });
  }
  return res.json({ authenticated: true, user: session });
});

// Authenticate via PIN (server-side only)
app.post("/api/auth/login", async (req, res) => {
  const { pin } = req.body;
  if (!pin || typeof pin !== "string" || pin.length !== 6) {
    return res.status(400).json({ error: "PIN harus 6 digit angka" });
  }

  try {
    let userRecord: any = null;

    // 1. Try querying Supabase tokped_admin
    const { data, error } = await supabase
      .from("tokped_admin")
      .select("id, username, name, pin, role")
      .eq("pin", pin)
      .maybeSingle();

    if (!error && data) {
      userRecord = data;
    }

    // 2. Secondary fallback for instant testing / robust seed
    if (!userRecord) {
      const mockAdmins = [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          username: "admin",
          name: "Admin",
          pin: "123456",
          role: "admin"
        },
        {
          id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
          username: "superadmin",
          name: "Super Admin",
          pin: "654321",
          role: "super_admin"
        }
      ];
      const matched = mockAdmins.find(a => a.pin === pin);
      if (matched) {
        userRecord = matched;
      }
    }

    if (!userRecord) {
      return res.status(401).json({ error: "PIN tidak valid" });
    }

    const session: AdminSession = {
      id: userRecord.id,
      username: userRecord.username,
      name: userRecord.name,
      role: userRecord.role
    };

    // Set secure session cookie
    res.cookie("admin_session", JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    return res.json({ success: true, user: session });
  } catch (err) {
    console.error("Login endpoint error:", err);
    return res.status(500).json({ error: "Terjadi kesalahan internal server" });
  }
});

// Clear/invalidate session
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("admin_session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
  return res.json({ success: true });
});

// Retrieve products (filtered by user role)
app.get("/api/produks", async (req, res) => {
  try {
    const session = getSession(req);
    const isSuperAdmin = session?.role === "super_admin";

    const { data, error } = await supabase
      .from("produks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Filter output: strip 'url' from results unless authenticated as super_admin
    const filtered = (data || []).map(p => {
      const copy = { ...p };
      if (!isSuperAdmin) {
        delete copy.url;
      }
      return copy;
    });

    return res.json(filtered);
  } catch (error: any) {
    console.error("API error fetching products:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Create product (admin or super_admin authorized)
app.post("/api/produks", async (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const newProduct = req.body;
    newProduct.internal_status = "pending"; // always starts as pending

    // Strip url if user is not super_admin
    if (session.role !== "super_admin") {
      delete newProduct.url;
    }

    const { data, error } = await supabase
      .from("produks")
      .insert([newProduct])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (error: any) {
    console.error("API error creating product:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Edit product (admin or super_admin authorized)
app.put("/api/produks/:id", async (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;
  const updateData = req.body;

  try {
    // Avoid direct mutation of internal_status via PUT (must use /transition)
    delete updateData.internal_status;

    // Avoid updating url if not super_admin
    if (session.role !== "super_admin") {
      delete updateData.url;
    }

    const { data, error } = await supabase
      .from("produks")
      .update(updateData)
      .eq("produks_id", id)
      .select()
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (error: any) {
    console.error("API error updating product:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Delete product
app.delete("/api/produks/:id", async (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;
  try {
    const { error } = await supabase
      .from("produks")
      .delete()
      .eq("produks_id", id);

    if (error) throw error;
    return res.json({ success: true });
  } catch (error: any) {
    console.error("API error deleting product:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Role & Status Workflow (Server-side enforced status transition validation)
app.post("/api/produks/transition", async (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: "Silakan login terlebih dahulu" });
  }

  const { produks_id, next_status } = req.body;
  if (!produks_id || !next_status) {
    return res.status(400).json({ error: "produks_id dan next_status harus ditentukan" });
  }

  try {
    // Fetch the current product status
    const { data: product, error: fetchError } = await supabase
      .from("produks")
      .select("produks_id, internal_status")
      .eq("produks_id", produks_id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!product) {
      return res.status(404).json({ error: "Produk tidak ditemukan" });
    }

    const currentStatus = product.internal_status || "pending";

    // Strict role validation rules:
    // admin: pending <-> ready
    // super_admin: ready <-> done
    if (session.role === "admin") {
      const isValidAdminTransition = 
        (currentStatus === "pending" && next_status === "ready") ||
        (currentStatus === "ready" && next_status === "pending");

      if (!isValidAdminTransition) {
        return res.status(403).json({ 
          error: `Akses ditolak: Peran Admin hanya dapat mengubah status antara 'pending' dan 'ready'. Transisi dari '${currentStatus}' ke '${next_status}' ditolak.` 
        });
      }
    } else if (session.role === "super_admin") {
      const isValidSuperAdminTransition = 
        (currentStatus === "ready" && next_status === "done") ||
        (currentStatus === "done" && next_status === "ready");

      if (!isValidSuperAdminTransition) {
        return res.status(403).json({ 
          error: `Akses ditolak: Peran Super Admin hanya dapat mengubah status antara 'ready' dan 'done'. Transisi dari '${currentStatus}' ke '${next_status}' ditolak.` 
        });
      }
    } else {
      return res.status(403).json({ error: "Peran pengguna tidak valid" });
    }

    // Perform update
    const { data: updatedProduct, error: updateError } = await supabase
      .from("produks")
      .update({ internal_status: next_status })
      .eq("produks_id", produks_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Filter URL field if needed
    if (session.role !== "super_admin") {
      delete updatedProduct.url;
    }

    return res.json({ success: true, product: updatedProduct });
  } catch (error: any) {
    console.error("API error in status transition:", error);
    return res.status(500).json({ error: error.message || "Gagal mengubah status" });
  }
});

// ---------------- VITE MIDDLEWARE SETUP ----------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
