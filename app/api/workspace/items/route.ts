import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedModules = new Set([
  "daily-operations",
  "facility-inventory",
  "visitor-management",
  "schedules-announcements",
]);

async function authorize(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { error: "Sesi login tidak ditemukan.", status: 401 as const };
  try {
    const decoded = await adminAuth().verifyIdToken(token, true);
    const profile = await adminDb().collection("users").doc(decoded.uid).get();
    if (!profile.exists || !["office", "superadmin"].includes(profile.get("role"))) {
      return { error: "Akses modul Manajer Kantor ditolak.", status: 403 as const };
    }
    return { uid: decoded.uid };
  } catch {
    return { error: "Sesi tidak valid atau akun dinonaktifkan. Silakan login kembali.", status: 401 as const };
  }
}

export async function GET(request: Request) {
  try {
    const auth = await authorize(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const snapshot = await adminDb().collection("workspaceData").doc(auth.uid).collection("items").get();
    const items = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((item) => allowedModules.has(String(item.moduleId)));
    items.sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0));
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Data modul gagal dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorize(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const body = await request.json();
    const moduleId = String(body.moduleId ?? "");
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const detail = typeof body.detail === "string" ? body.detail.trim() : "";
    const status = typeof body.status === "string" ? body.status : "";
    const priority = typeof body.priority === "string" ? body.priority : "";
    const date = typeof body.date === "string" ? body.date : "";
    const quantity = typeof body.quantity === "string" ? body.quantity : "";
    if (!allowedModules.has(moduleId)) return NextResponse.json({ error: "Modul tidak valid." }, { status: 400 });
    if (!title || title.length > 120 || detail.length > 2000 || status.length > 40 || priority.length > 20 || date.length > 20 || quantity.length > 10) {
      return NextResponse.json({ error: "Data tidak valid atau melebihi batas karakter." }, { status: 400 });
    }
    const item = { moduleId, title, detail, status, priority, date, quantity, createdAt: Date.now() };
    const ref = await adminDb().collection("workspaceData").doc(auth.uid).collection("items").add(item);
    return NextResponse.json({ item: { id: ref.id, ...item } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Data gagal disimpan." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authorize(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!/^[A-Za-z0-9_-]{10,128}$/.test(id)) return NextResponse.json({ error: "ID data tidak valid." }, { status: 400 });
    const ref = adminDb().collection("workspaceData").doc(auth.uid).collection("items").doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists || !allowedModules.has(String(snapshot.get("moduleId")))) {
      return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
    }
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Data gagal dihapus." }, { status: 500 });
  }
}
