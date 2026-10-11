import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

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

const completedStatuses: Record<string, string[]> = {
  "general-ledger": ["selesai"],
  "financial-reports": ["final"],
  "tax-and-compliance": ["selesai"],
  "ai-data-analytics": ["selesai"],
  "hr-metrics": ["selesai"],
  "recruitment-ats": ["ditutup"],
  "employee-experience": ["selesai"],
  "policy-generator": ["disetujui"],
  "sales-pipeline": ["menang"],
  "team-performance": ["sesuai target", "melampaui target"],
  "smart-follow-ups": ["selesai"],
  "forecasting-insights": ["final"],
  "daily-operations": ["selesai"],
  "facility-inventory": ["baik"],
  "visitor-management": ["selesai"],
  "schedules-announcements": ["selesai"],
  "creative-workspace": ["selesai"],
  "ai-idea-generator": ["dipilih"],
  "asset-library": ["siap digunakan"],
  "client-approvals": ["disetujui"],
  "market-data-and-portfolio": ["dipantau"],
  "scenario-modeling": ["final"],
  "risk-assessment": ["ditutup"],
  "data-driven-decisions": ["diputuskan"],
  "classes-and-students": ["aktif"],
  "lesson-plan-creator": ["selesai"],
  "assignments-and-grading": ["selesai"],
  "interactive-resources": ["siap digunakan"],
  "client-and-engagement": ["selesai"],
  "industry-knowledge-base": ["ditinjau"],
  "time-and-invoicing": ["lunas"],
  "strategic-reports": ["final"],
  "property-listings": ["terjual/disewakan"],
  "client-crm-and-leads": ["selesai"],
  "showings-calendar": ["selesai"],
  "contracts-and-documents": ["ditandatangani"],
};

function isCompleted(item: WorkspaceItem) {
  const status = String(item.status ?? "").trim().toLowerCase();
  const moduleSpecific = completedStatuses[String(item.moduleId ?? "")] ?? [];
  return moduleSpecific.includes(status) || ["completed", "complete", "done", "finished", "selesai"].includes(status);
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
    .filter((doc) => doc.ref.parent.parent?.parent?.id === "workspaceData")
    .map((doc) => {
      const ownerUid = doc.ref.parent.parent?.id ?? "";
      const data = doc.data();
      return { id: doc.id, moduleId: String(data.moduleId ?? ""), title: String(data.title ?? ""), detail: String(data.detail ?? ""), status: String(data.status ?? "pending"), priority: String(data.priority ?? "normal"), date: String(data.date ?? ""), createdAt: Number(data.createdAt ?? 0), updatedAt: Number(data.updatedAt ?? 0), ownerUid, ownerName: profiles.get(ownerUid) ?? "Pengguna" } satisfies WorkspaceItem;
    })
    .filter((item) => !!item.ownerUid && (!moduleId || item.moduleId === moduleId))
    .sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0));
}

function summarizeModules(items: WorkspaceItem[], moduleList: string[] = Object.values(moduleIds).flat()) {
  const grouped = new Map<string, WorkspaceItem[]>();
  for (const item of items) {
    const moduleId = item.moduleId ?? "unknown";
    grouped.set(moduleId, [...(grouped.get(moduleId) ?? []), item]);
  }
  return moduleList.map((moduleId) => ({ moduleId, ...metrics(grouped.get(moduleId) ?? []) })).sort((a, b) => b.total - a.total || a.moduleId.localeCompare(b.moduleId));
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
        modules: summarizeModules(allItems, moduleId ? [moduleId] : Object.values(moduleIds).flat()),
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
    const propertyIntegration = context.role === "sales" ? (() => {
      return null;
    })() : undefined;
    const linkedPropertyItems = context.role === "sales"
      ? (await companyItems()).filter((item) => ["property-listings", "client-crm-and-leads", "showings-calendar", "contracts-and-documents"].includes(String(item.moduleId)))
      : [];
    const byModule = (id: string) => linkedPropertyItems.filter((item) => item.moduleId === id);
    const propertySalesSummary = context.role === "sales" ? {
      listings: byModule("property-listings").length,
      listingsClosed: byModule("property-listings").filter((item) => ["terjual/disewakan", "terjual", "disewakan"].includes(String(item.status).trim().toLowerCase())).length,
      leads: byModule("client-crm-and-leads").length,
      leadsClosed: byModule("client-crm-and-leads").filter((item) => String(item.status).trim().toLowerCase() === "selesai").length,
      showings: byModule("showings-calendar").length,
      showingsCompleted: byModule("showings-calendar").filter((item) => String(item.status).trim().toLowerCase() === "selesai").length,
      contracts: byModule("contracts-and-documents").length,
      contractsSigned: byModule("contracts-and-documents").filter((item) => String(item.status).trim().toLowerCase() === "ditandatangani").length,
      note: linkedPropertyItems.length >= 5000 ? "Ringkasan properti dibatasi pada 5.000 catatan." : undefined,
    } : undefined;
    return NextResponse.json({
      scope: "personal",
      moduleId: moduleId || null,
      ...(propertySalesSummary ? { propertySalesSummary } : {}),
      metrics: metrics(items),
      modules: summarizeModules(items, moduleId ? [moduleId] : (moduleIds[context.role] ?? [])),
      items: items.slice(0, 200),
    });
  } catch (error) {
    console.error("Workspace summary failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Ringkasan gagal dimuat. Coba segarkan halaman." }, { status: 500 });
  }
}
