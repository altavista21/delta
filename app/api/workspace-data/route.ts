import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { roles } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const moduleIds: Record<string, string[]> = {
  accountant: ["general-ledger", "financial-reports", "tax-and-compliance", "ai-data-analytics"],
  hr: ["hr-metrics", "recruitment-ats", "employee-experience", "policy-generator"],
  sales: ["sales-pipeline", "team-performance", "smart-follow-ups", "forecasting-insights"],
  office: ["daily-operations", "facility-inventory", "visitor-management", "schedules-announcements"],
  designer: ["creative-workspace", "ai-idea-generator", "asset-library", "client-approvals"],
  financier: ["market-data-and-portfolio", "scenario-modeling", "risk-assessment", "data-driven-decisions"],
  teacher: ["classes-and-students", "lesson-plan-creator", "assignments-and-grading", "interactive-resources"],
  consultant: ["client-and-engagement", "industry-knowledge-base", "time-and-invoicing", "strategic-reports"],
  property: ["property-listings", "client-crm-and-leads", "showings-calendar", "contracts-and-documents"],
};

type WorkspaceItem = {
  id: string;
  moduleId?: string;
  title?: string;
  detail?: string;
  status?: string;
  priority?: string;
  date?: string;
  createdAt?: number;
  updatedAt?: number;
  ownerUid?: string;
  ownerName?: string;
};

function isCompleted(item: WorkspaceItem) {
  return ["completed", "complete", "done", "finished", "selesai"].includes(String(item.status ?? "").toLowerCase());
}

function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function metrics(items: WorkspaceItem[]) {
  const completed = items.filter(isCompleted).length;
  const today = todayJakarta();
  const overdue = items.filter((item) => !!item.date && item.date < today && !isCompleted(item)).length;
  return { total: items.length, completed, active: items.length - completed, overdue, completionRate: items.length ? Math.round((completed / items.length) * 100) : 0 };
}

async function getContext(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { error: "Sesi login tidak ditemukan. Silakan login kembali.", status: 401 as const };
  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token, true);
  } catch {
    return { error: "Sesi tidak valid atau akun dinonaktifkan. Silakan login kembali.", status: 401 as const };
  }
  const profileSnapshot = await adminDb().collection("users").doc(decoded.uid).get();
  if (!profileSnapshot.exists) return { error: "Profil pengguna tidak ditemukan.", status: 403 as const };
  const profile = profileSnapshot.data() ?? {};
  const role = String(profile.role ?? "");
  const isSuperAdmin = decoded.uid === process.env.DELTA_SUPERADMIN_UID || role === "superadmin";
  if (!isSuperAdmin && !moduleIds[role]) return { error: "Profesi akun tidak valid.", status: 403 as const };
  return { uid: decoded.uid, role, displayName: String(profile.displayName ?? decoded.name ?? "Pengguna"), isSuperAdmin };
}

function moduleAllowed(role: string, moduleId: string, isSuperAdmin: boolean) {
  return isSuperAdmin || (moduleIds[role] ?? []).includes(moduleId);
}

async function companyItems(moduleId?: string) {
  const snapshot = await adminDb().collectionGroup("items").limit(5000).get();
  const profilesSnapshot = await adminDb().collection("users").get();
  const profiles = new Map(profilesSnapshot.docs.map((doc) => [doc.id, String(doc.get("displayName") ?? "Pengguna")]));
  return snapshot.docs
    .map((doc) => {
      const ownerUid = doc.ref.parent.parent?.id ?? "";
      const data = doc.data();
      return { id: doc.id, moduleId: String(data.moduleId ?? ""), title: String(data.title ?? ""), detail: String(data.detail ?? ""), status: String(data.status ?? "pending"), priority: String(data.priority ?? "normal"), date: String(data.date ?? ""), createdAt: Number(data.createdAt ?? 0), updatedAt: Number(data.updatedAt ?? 0), ownerUid, ownerName: profiles.get(ownerUid) ?? "Pengguna" } satisfies WorkspaceItem;
    })
    .filter((item) => !!item.ownerUid && (!moduleId || item.moduleId === moduleId))
    .sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0));
}

function summarizeModules(items: WorkspaceItem[]) {
  const grouped = new Map<string, WorkspaceItem[]>();
  for (const item of items) grouped.set(item.moduleId ?? "unknown", [...(grouped.get(item.moduleId ?? "unknown") ?? []), item]);
  return [...grouped.entries()].map(([moduleId, rows]) => ({ moduleId, ...metrics(rows) })).sort((a, b) => b.total - a.total);
}

export async function GET(request: Request) {
  try {
    const context = await getContext(request);
    if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
    const url = new URL(request.url);
    const moduleId = url.searchParams.get("moduleId") ?? "";
    const companyScope = url.searchParams.get("scope") === "company";

    if (companyScope && !context.isSuperAdmin) return NextResponse.json({ error: "Ringkasan seluruh perusahaan hanya tersedia untuk Super Admin." }, { status: 403 });
    if (moduleId && !Object.values(moduleIds).flat().includes(moduleId)) return NextResponse.json({ error: "Modul tidak ditemukan." }, { status: 404 });
    if (moduleId && !moduleAllowed(context.role, moduleId, context.isSuperAdmin)) return NextResponse.json({ error: "Modul ini tidak tersedia untuk profesi akun Anda." }, { status: 403 });

    if (context.isSuperAdmin) {
      const allItems = await companyItems(moduleId || undefined);
      const usersSnapshot = await adminDb().collection("users").get();
      const profiles = usersSnapshot.docs.map((doc) => ({ uid: doc.id, role: String(doc.get("role") ?? "") }));
      const responseItems = moduleId ? allItems.slice(0, 200) : [];
      return NextResponse.json({
        scope: "company",
        moduleId: moduleId || null,
        userCount: profiles.filter((profile) => profile.role !== "superadmin").length,
        activeUsers: profiles.filter((profile) => profile.role !== "superadmin").length,
        metrics: metrics(allItems),
        modules: summarizeModules(allItems),
        items: responseItems,
        note: allItems.length >= 5000 ? "Ringkasan dibatasi pada 5.000 catatan terbaru untuk menjaga performa." : undefined,
      });
    }

    const snapshot = await adminDb().collection("workspaceData").doc(context.uid).collection("items").get();
    const allowed = new Set(moduleIds[context.role] ?? []);
    const items = snapshot.docs.map((doc) => {
      const data = doc.data();
      return { id: doc.id, moduleId: String(data.moduleId ?? ""), title: String(data.title ?? ""), detail: String(data.detail ?? ""), status: String(data.status ?? "pending"), priority: String(data.priority ?? "normal"), date: String(data.date ?? ""), createdAt: Number(data.createdAt ?? 0), updatedAt: Number(data.updatedAt ?? 0) } satisfies WorkspaceItem;
    }).filter((item) => allowed.has(item.moduleId) && (!moduleId || item.moduleId === moduleId)).sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0));
    return NextResponse.json({
      scope: "personal",
      moduleId: moduleId || null,
      metrics: metrics(items),
      modules: summarizeModules(items),
      items: items.slice(0, 200),
    });
  } catch (error) {
    console.error("Workspace summary failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Ringkasan gagal dimuat. Coba segarkan halaman." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await getContext(request);
    if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
    if (context.isSuperAdmin) return NextResponse.json({ error: "Super Admin melihat ringkasan perusahaan dalam mode baca saja." }, { status: 403 });
    const body = await request.json();
    const moduleId = typeof body.moduleId === "string" ? body.moduleId : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const detail = typeof body.detail === "string" ? body.detail.trim() : "";
    const date = typeof body.date === "string" ? body.date : "";
    const priority = ["low", "normal", "high"].includes(body.priority) ? body.priority : "normal";
    if (!moduleAllowed(context.role, moduleId, false)) return NextResponse.json({ error: "Modul tidak tersedia untuk profesi akun Anda." }, { status: 403 });
    if (!title || title.length > 140) return NextResponse.json({ error: "Judul wajib diisi dan maksimal 140 karakter." }, { status: 400 });
    if (detail.length > 2000) return NextResponse.json({ error: "Detail maksimal 2.000 karakter." }, { status: 400 });
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
    const now = Date.now();
    const ref = adminDb().collection("workspaceData").doc(context.uid).collection("items").doc();
    await ref.set({ moduleId, title, detail, date, priority, status: "pending", createdAt: now, updatedAt: now });
    return NextResponse.json({ ok: true, id: ref.id }, { status: 201 });
  } catch (error) {
    console.error("Workspace item creation failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Catatan gagal disimpan." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getContext(request);
    if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
    if (context.isSuperAdmin) return NextResponse.json({ error: "Super Admin melihat ringkasan perusahaan dalam mode baca saja." }, { status: 403 });
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id || !/^[A-Za-z0-9_-]{1,150}$/.test(id)) return NextResponse.json({ error: "ID catatan tidak valid." }, { status: 400 });
    const ref = adminDb().collection("workspaceData").doc(context.uid).collection("items").doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return NextResponse.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
    const data = snapshot.data()!;
    if (!moduleAllowed(context.role, String(data.moduleId ?? ""), false)) return NextResponse.json({ error: "Akses ke catatan ini ditolak." }, { status: 403 });
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title || title.length > 140) return NextResponse.json({ error: "Judul wajib diisi dan maksimal 140 karakter." }, { status: 400 });
      patch.title = title;
    }
    if (typeof body.detail === "string") {
      if (body.detail.length > 2000) return NextResponse.json({ error: "Detail maksimal 2.000 karakter." }, { status: 400 });
      patch.detail = body.detail.trim();
    }
    if (typeof body.date === "string") {
      if (body.date && !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
      patch.date = body.date;
    }
    if (typeof body.priority === "string" && ["low", "normal", "high"].includes(body.priority)) patch.priority = body.priority;
    if (typeof body.status === "string" && ["pending", "in_progress", "completed"].includes(body.status)) patch.status = body.status;
    await ref.update(patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Workspace item update failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Catatan gagal diperbarui." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getContext(request);
    if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
    if (context.isSuperAdmin) return NextResponse.json({ error: "Super Admin melihat ringkasan perusahaan dalam mode baca saja." }, { status: 403 });
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id || !/^[A-Za-z0-9_-]{1,150}$/.test(id)) return NextResponse.json({ error: "ID catatan tidak valid." }, { status: 400 });
    const ref = adminDb().collection("workspaceData").doc(context.uid).collection("items").doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return NextResponse.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
    if (!moduleAllowed(context.role, String(snapshot.get("moduleId") ?? ""), false)) return NextResponse.json({ error: "Akses ke catatan ini ditolak." }, { status: 403 });
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Workspace item deletion failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Catatan gagal dihapus." }, { status: 500 });
  }
}
