"use client";

import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Activity, CheckCircle2, Clock3, CalendarDays, LoaderCircle, RefreshCw, Users, AlertCircle } from "lucide-react";
import { auth, firebaseConfigured } from "@/lib/firebase";

type Metrics = { total: number; completed: number; active: number; overdue: number; completionRate: number };
type ModuleSummary = Metrics & { moduleId: string };
type Payload = { scope: string; userCount: number; metrics: Metrics; modules: ModuleSummary[]; note?: string };

const names: Record<string, string> = {
  "general-ledger": "General Ledger", "financial-reports": "Financial Reports", "tax-and-compliance": "Tax & Compliance", "ai-data-analytics": "AI Data Analytics",
  "hr-metrics": "HR Metrics", "recruitment-ats": "Recruitment (ATS)", "employee-experience": "Employee Experience", "policy-generator": "Policy Generator",
  "sales-pipeline": "Sales Pipeline", "team-performance": "Team Performance", "smart-follow-ups": "Smart Follow-ups", "forecasting-insights": "Forecasting & Insights",
  "daily-operations": "Daily Operations", "facility-inventory": "Facility & Inventory", "visitor-management": "Visitor Management", "schedules-announcements": "Schedules & Announcements",
  "creative-workspace": "Creative Workspace", "ai-idea-generator": "AI Idea Generator", "asset-library": "Asset Library", "client-approvals": "Client Approvals",
  "market-data-and-portfolio": "Market Data & Portfolio", "scenario-modeling": "Scenario Modeling", "risk-assessment": "Risk Assessment", "data-driven-decisions": "Data-Driven Decisions",
  "classes-and-students": "Classes & Students", "lesson-plan-creator": "Lesson Plan Creator", "assignments-and-grading": "Assignments & Grading", "interactive-resources": "Interactive Resources",
  "client-and-engagement": "Client & Engagement", "industry-knowledge-base": "Industry Knowledge Base", "time-and-invoicing": "Time & Invoicing", "strategic-reports": "Strategic Reports",
  "property-listings": "Property Listings", "client-crm-and-leads": "Client CRM & Leads", "showings-calendar": "Showings Calendar", "contracts-and-documents": "Contracts & Documents",
};

const zero: Metrics = { total: 0, completed: 0, active: 0, overdue: 0, completionRate: 0 };

export default function CompanyAchievementsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const user = auth?.currentUser;
    if (!user) return;
    setLoading(true); setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/workspace-data?scope=company", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Ringkasan perusahaan gagal dimuat.");
      if (result.scope !== "company") throw new Error("Data yang diterima bukan ringkasan perusahaan.");
      setData(result);
    } catch (err) { setError(err instanceof Error ? err.message : "Ringkasan perusahaan gagal dimuat."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || !auth) { setError("Firebase belum dikonfigurasi."); setReady(true); setLoading(false); return; }
    return onAuthStateChanged(auth, (user) => {
      if (!user) { router.replace("/login"); return; }
      setReady(true);
    });
  }, [router]);

  useEffect(() => { if (ready) void load(); }, [ready, load]);

  if (!ready) return <main style={s.center}><LoaderCircle size={20} /> Memeriksa sesi...</main>;

  const metrics = data?.metrics ?? zero;
  return <main style={s.page}>
    <header style={s.header}><Link href="/super-admin" style={s.back}><ArrowLeft size={17} /> Manajemen akun</Link><strong style={s.brand}>Delta <span>Super Admin</span></strong><button style={s.refresh} onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Segarkan</button></header>
    <section style={s.content}>
      <div style={s.eyebrow}>DASHBOARD SUPER ADMIN</div><h1 style={s.title}>Pencapaian seluruh perusahaan</h1><p style={s.subtitle}>Statistik dihitung dari catatan workspace yang tersimpan di seluruh akun. Angka nol berarti belum ada catatan yang tersedia, bukan target yang diasumsikan.</p>
      {error && <div role="alert" style={s.error}><AlertCircle size={17} /> {error}</div>}
      {data?.note && <p style={s.note}>{data.note}</p>}
      <div style={s.metrics}>
        <Metric icon={<Users size={18} />} label="Akun pengguna" value={data?.userCount ?? 0} />
        <Metric icon={<Activity size={18} />} label="Total catatan" value={metrics.total} />
        <Metric icon={<CheckCircle2 size={18} />} label="Catatan selesai" value={metrics.completed} />
        <Metric icon={<Clock3 size={18} />} label="Belum selesai" value={metrics.active} />
        <Metric icon={<CalendarDays size={18} />} label="Terlambat" value={metrics.overdue} />
      </div>
      <section style={s.progressCard}><div style={s.progressHead}><div><b>Progres penyelesaian perusahaan</b><p>{metrics.completed} dari {metrics.total} catatan selesai</p></div><strong>{metrics.completionRate}%</strong></div><div style={s.track}><div style={{ ...s.fill, width: `${metrics.completionRate}%` }} /></div></section>
      <h2 style={s.sectionTitle}>Pencapaian berdasarkan modul</h2>
      {loading ? <div style={s.empty}><LoaderCircle size={19} /> Memuat data perusahaan...</div> : !data?.modules?.length ? <div style={s.empty}><Activity size={24} /><b>Belum ada pencapaian tercatat</b><span>Ringkasan akan terisi ketika pengguna menyimpan catatan kerja pada modulnya.</span></div> : <div style={s.tableWrap}><table style={s.table}><thead><tr><th style={s.th}>Modul</th><th style={s.th}>Total</th><th style={s.th}>Selesai</th><th style={s.th}>Belum selesai</th><th style={s.th}>Terlambat</th><th style={s.th}>Progres</th></tr></thead><tbody>{data.modules.map((item) => <tr key={item.moduleId}><td style={s.td}><b>{names[item.moduleId] ?? item.moduleId}</b></td><td style={s.td}>{item.total}</td><td style={s.td}>{item.completed}</td><td style={s.td}>{item.active}</td><td style={s.td}>{item.overdue}</td><td style={s.td}><span style={s.percent}>{item.completionRate}%</span></td></tr>)}</tbody></table></div>}
      <p style={s.footnote}>Data berasal dari catatan modul dan diperbarui saat halaman disegarkan. Ringkasan ini tidak mengarang angka untuk modul yang belum memiliki data.</p>
    </section>
  </main>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <article style={s.metric}><span style={s.metricIcon}>{icon}</span><span style={s.metricLabel}>{label}</span><strong>{value}</strong></article>;
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f7f8fc", color: "#202438", fontFamily: "Arial, sans-serif" },
  center: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#5d6277" },
  header: { minHeight: 68, padding: "0 5vw", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#fff", borderBottom: "1px solid #e9ebf2" },
  back: { display: "inline-flex", alignItems: "center", gap: 7, color: "#62677b", textDecoration: "none", fontSize: 13 },
  brand: { color: "#5144c9", display: "flex", gap: 7, alignItems: "center" },
  content: { maxWidth: 1120, margin: "0 auto", padding: "36px 20px 60px" },
  eyebrow: { color: "#7162df", fontSize: 11, fontWeight: 800, letterSpacing: 1.3 },
  title: { margin: "9px 0 7px", fontSize: 30, letterSpacing: -0.8 },
  subtitle: { margin: "0 0 22px", color: "#777d90", lineHeight: 1.6, fontSize: 14, maxWidth: 820 },
  refresh: { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 11px", background: "#fff", border: "1px solid #e1e4ee", borderRadius: 9, color: "#555b70" },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 14 },
  metric: { display: "grid", gridTemplateColumns: "34px 1fr", gap: "4px 10px", alignItems: "center", background: "#fff", border: "1px solid #e9ebf2", borderRadius: 13, padding: 16 },
  metricIcon: { gridRow: "span 2", width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "#f0edff", color: "#6657d9" },
  metricLabel: { fontSize: 12, color: "#777d90" },
  progressCard: { padding: 18, background: "#fff", border: "1px solid #e9ebf2", borderRadius: 13, marginBottom: 28 },
  progressHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  track: { height: 8, background: "#efedf8", borderRadius: 20, overflow: "hidden", marginTop: 15 },
  fill: { height: "100%", background: "#7162df", borderRadius: 20 },
  sectionTitle: { fontSize: 18, margin: "0 0 13px" },
  tableWrap: { overflowX: "auto", background: "#fff", border: "1px solid #e9ebf2", borderRadius: 13 },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: 700 },
  th: { background: "#fbfbfe", color: "#777d90", fontSize: 11, padding: "13px 15px", borderBottom: "1px solid #e9ebf2", whiteSpace: "nowrap" },
  td: { padding: "14px 15px", borderBottom: "1px solid #f0f1f6", fontSize: 13, whiteSpace: "nowrap" },
  percent: { color: "#5144c9", fontWeight: 800 },
  empty: { minHeight: 150, background: "#fff", border: "1px dashed #d9dce8", borderRadius: 13, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#777d90", padding: 24, textAlign: "center" as const },
  error: { display: "flex", alignItems: "center", gap: 8, padding: 12, background: "#fff0f0", color: "#a42d36", borderRadius: 9, marginBottom: 14, fontSize: 13 },
  note: { color: "#9a5b00", fontSize: 12 },
  footnote: { color: "#858a9b", fontSize: 12, lineHeight: 1.6, marginTop: 22 },
};
