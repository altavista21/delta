"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { Activity, ArrowRight, CalendarDays, CheckCircle2, Clock3, LoaderCircle, RefreshCw } from "lucide-react";

type Metrics = { total: number; completed: number; active: number; overdue: number; completionRate: number };
type ModuleSummary = Metrics & { moduleId: string };
type PropertySalesSummary = { listings: number; listingsClosed: number; leads: number; leadsClosed: number; showings: number; showingsCompleted: number; contracts: number; contractsSigned: number; note?: string };
type Summary = { scope: "personal" | "company"; metrics: Metrics; modules: ModuleSummary[]; propertySalesSummary?: PropertySalesSummary; note?: string };

const moduleNames: Record<string, string> = {
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

export default function AchievementSummary() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const user = auth?.currentUser;
    if (!user) return;
    setLoading(true); setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/workspace-data", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Ringkasan gagal dimuat.");
      setData(result);
    } catch (err) { setError(err instanceof Error ? err.message : "Ringkasan gagal dimuat."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const metrics = data?.metrics;
  return <section id="achievement-summary" style={s.card}>
    <div style={s.header}><div><div style={s.eyebrow}>{data?.scope === "company" ? "PENCAPAIAN PERUSAHAAN" : "PENCAPAIAN PRIBADI"}</div><h2 style={s.title}>Ringkasan pencapaian</h2><p style={s.subtitle}>{data?.scope === "company" ? "Gabungan catatan yang tersimpan di seluruh akun." : "Perkembangan pekerjaanmu berdasarkan catatan yang benar-benar tersimpan."}</p></div><button style={s.refresh} onClick={() => void load()} disabled={loading} aria-label="Segarkan ringkasan"><RefreshCw size={15} /></button></div>
    {error && <p role="alert" style={s.error}>{error}</p>}
    {loading ? <div style={s.loading}><LoaderCircle size={18} /> Menghitung pencapaian dari data tersimpan...</div> : <>
      <div style={s.metrics}>
        <Metric icon={<Activity size={17} />} label="Total catatan" value={metrics?.total ?? 0} />
        <Metric icon={<CheckCircle2 size={17} />} label="Selesai" value={metrics?.completed ?? 0} />
        <Metric icon={<Clock3 size={17} />} label="Belum selesai" value={metrics?.active ?? 0} />
        <Metric icon={<CalendarDays size={17} />} label="Terlambat" value={metrics?.overdue ?? 0} />
      </div>
      <div style={s.progressHead}><span>Progres penyelesaian</span><b>{metrics?.completionRate ?? 0}%</b></div><div style={s.track}><div style={{ ...s.fill, width: `${metrics?.completionRate ?? 0}%` }} /></div>
      {data?.scope === "personal" && data.modules.length > 0 && <div style={s.moduleList}><b style={s.moduleHeading}>Pencapaian per modul</b>{data.modules.map((item) => <div style={s.moduleRow} key={item.moduleId}><span>{moduleNames[item.moduleId] ?? item.moduleId}</span><span>{item.completed}/{item.total} selesai · {item.completionRate}%</span></div>)}</div>}
      {data?.propertySalesSummary && <div style={s.propertyPanel}>
        <b style={s.moduleHeading}>Ringkasan penjualan dari Agen Properti</b>
        <p style={s.propertyIntro}>Angka gabungan dari modul properti seluruh agen. Detail dan identitas klien tidak ditampilkan.</p>
        <div style={s.propertyGrid}>
          <PropertyMetric label="Listing properti" value={data.propertySalesSummary.listings} detail={`${data.propertySalesSummary.listingsClosed} terjual/disewakan`} />
          <PropertyMetric label="Calon klien" value={data.propertySalesSummary.leads} detail={`${data.propertySalesSummary.leadsClosed} selesai ditangani`} />
          <PropertyMetric label="Kunjungan" value={data.propertySalesSummary.showings} detail={`${data.propertySalesSummary.showingsCompleted} selesai`} />
          <PropertyMetric label="Kontrak" value={data.propertySalesSummary.contracts} detail={`${data.propertySalesSummary.contractsSigned} ditandatangani`} />
        </div>
        {data.propertySalesSummary.note && <p style={s.empty}>{data.propertySalesSummary.note}</p>}
      </div>}
      {data?.scope === "company" && <a href="/super-admin/achievements" style={s.link}>Lihat pencapaian seluruh perusahaan <ArrowRight size={15} /></a>}
      {(!metrics || metrics.total === 0) && <p style={s.empty}>Belum ada catatan kerja. Angka akan bertambah setelah pekerjaan dicatat di modul terkait.</p>}
    </>}
  </section>;
}

function PropertyMetric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div style={s.propertyMetric}><span>{label}</span><b>{value}</b><small>{detail}</small></div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div style={s.metric}><span style={s.icon}>{icon}</span><span style={s.label}>{label}</span><b style={s.value}>{value}</b></div>;
}

const s: Record<string, React.CSSProperties> = {
  card: { background: "#fff", border: "1px solid #e9ebf2", borderRadius: 16, padding: 20, margin: "22px 0 28px" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  eyebrow: { color: "#7162df", fontSize: 10, fontWeight: 800, letterSpacing: 1.3 },
  title: { fontSize: 19, margin: "7px 0 5px", color: "#202438" },
  subtitle: { fontSize: 12, lineHeight: 1.5, color: "#777d90", margin: 0 },
  refresh: { display: "grid", placeItems: "center", width: 34, height: 34, border: "1px solid #e1e4ee", borderRadius: 9, background: "#fff", color: "#555b70" },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 9 },
  metric: { display: "grid", gridTemplateColumns: "29px 1fr", gap: "4px 8px", alignItems: "center", background: "#fbfbfe", border: "1px solid #f0f1f6", borderRadius: 10, padding: 11 },
  icon: { gridRow: "span 2", width: 29, height: 29, display: "grid", placeItems: "center", borderRadius: 8, background: "#f0edff", color: "#6657d9" },
  label: { fontSize: 11, color: "#777d90" },
  value: { fontSize: 18, color: "#202438" },
  progressHead: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#5c6175", marginTop: 17 },
  track: { height: 7, borderRadius: 20, background: "#efedf8", overflow: "hidden", marginTop: 8 },
  fill: { height: "100%", borderRadius: 20, background: "#7162df" },
  propertyPanel: { marginTop: 20, paddingTop: 16, borderTop: "1px solid #eceef4" },
  propertyIntro: { margin: "5px 0 12px", fontSize: 11, lineHeight: 1.5, color: "#777d90" },
  propertyGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 9 },
  propertyMetric: { display: "grid", gap: 5, background: "#f8fbff", border: "1px solid #e7edf6", borderRadius: 10, padding: 11 },
  moduleList: { marginTop: 17, display: "grid", gap: 8 },
  moduleHeading: { fontSize: 12, color: "#51566b", marginBottom: 2 },
  moduleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, borderTop: "1px solid #f0f1f6", paddingTop: 8, fontSize: 11, color: "#666b7e" },
  link: { display: "inline-flex", alignItems: "center", gap: 6, marginTop: 16, color: "#6657d9", fontSize: 12, fontWeight: 700, textDecoration: "none" },
  empty: { fontSize: 12, lineHeight: 1.5, color: "#858a9b", margin: "14px 0 0" },
  loading: { display: "flex", alignItems: "center", gap: 8, color: "#777d90", fontSize: 12, padding: 15 },
  error: { fontSize: 12, color: "#a42d36" },
};
