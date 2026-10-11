"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { Activity, ArrowLeft, CalendarDays, CheckCircle2, CircleAlert, Clock3, LoaderCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
import { auth, firebaseConfigured } from "@/lib/firebase";

type Item = { id: string; moduleId: string; title: string; detail: string; status: string; priority: string; date: string; createdAt: number; ownerName?: string };
type Metrics = { total: number; completed: number; active: number; overdue: number; completionRate: number };
type Summary = { scope: "personal" | "company"; metrics: Metrics; items: Item[]; note?: string };

const moduleTitles: Record<string, string> = {
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

const emptyMetrics: Metrics = { total: 0, completed: 0, active: 0, overdue: 0, completionRate: 0 };

export default function WorkspaceModulePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const moduleId = String(params.slug ?? "");
  const title = moduleTitles[moduleId] ?? "Modul Workspace";
  const [ready, setReady] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [itemTitle, setItemTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState("normal");

  const request = useCallback(async (method = "GET", body?: Record<string, unknown>) => {
    const user = auth?.currentUser;
    if (!user) throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
    const token = await user.getIdToken();
    const response = await fetch(`/api/workspace-data?moduleId=${encodeURIComponent(moduleId)}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Permintaan gagal.");
    return data;
  }, [moduleId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setSummary(await request()); }
    catch (err) { setError(err instanceof Error ? err.message : "Ringkasan gagal dimuat."); }
    finally { setLoading(false); }
  }, [request]);

  useEffect(() => {
    if (!firebaseConfigured || !auth) { setError("Firebase belum dikonfigurasi."); setReady(true); setLoading(false); return; }
    return onAuthStateChanged(auth, (user) => {
      if (!user) { router.replace("/login"); return; }
      setReady(true);
    });
  }, [router]);

  useEffect(() => { if (ready) void load(); }, [ready, load]);

  const metrics = summary?.metrics ?? emptyMetrics;
  const readOnly = summary?.scope === "company";
  const emptyHint = useMemo(() => readOnly ? "Belum ada catatan pada modul ini di seluruh perusahaan." : "Belum ada catatan di modul ini. Tambahkan pekerjaan pertama agar pencapaian mulai tercatat.", [readOnly]);

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      await request("POST", { moduleId, title: itemTitle, detail, date, priority });
      setItemTitle(""); setDetail(""); setDate(""); setPriority("normal"); setFormOpen(false);
      setNotice("Catatan tersimpan dan ringkasan diperbarui.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Catatan gagal disimpan."); }
    finally { setSaving(false); }
  }

  async function updateStatus(item: Item, status: string) {
    setError(""); setNotice("");
    try { await request("PATCH", { id: item.id, status }); setNotice("Status diperbarui."); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Status gagal diperbarui."); }
  }

  async function deleteItem(item: Item) {
    if (!window.confirm(`Hapus catatan “${item.title}”? Tindakan ini tidak dapat dibatalkan.`)) return;
    setError(""); setNotice("");
    try { await request("DELETE", { id: item.id }); setNotice("Catatan dihapus."); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Catatan gagal dihapus."); }
  }

  if (!ready) return <main style={styles.center}><LoaderCircle size={20} /> Memeriksa sesi...</main>;

  return <main style={styles.page}>
    <header style={styles.header}>
      <button style={styles.back} onClick={() => router.push("/dashboard")}><ArrowLeft size={17} /> Dashboard</button>
      <div style={styles.brand}>Delta <span>Workspace</span></div>
      <button style={styles.refresh} onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Segarkan</button>
    </header>
    <section style={styles.content}>
      <div style={styles.eyebrow}>{readOnly ? "RINGKASAN PERUSAHAAN" : "PENCAPAIAN PRIBADI"} · MODUL</div>
      <h1 style={styles.title}>{title}</h1>
      <p style={styles.subtitle}>{readOnly ? "Gambaran catatan dan pencapaian seluruh perusahaan pada modul ini." : "Catat pekerjaan di sini. Statistik diperbarui dari catatan yang tersimpan, bukan angka contoh."}</p>
      {error && <div role="alert" style={styles.error}><CircleAlert size={17} /> {error}</div>}
      {notice && <div role="status" style={styles.notice}><CheckCircle2 size={17} /> {notice}</div>}
      {summary?.note && <p style={styles.note}>{summary.note}</p>}
      <div style={styles.metricGrid}>
        <Metric icon={<Activity size={18} />} label="Total catatan" value={metrics.total} />
        <Metric icon={<CheckCircle2 size={18} />} label="Selesai" value={metrics.completed} />
        <Metric icon={<Clock3 size={18} />} label="Belum selesai" value={metrics.active} />
        <Metric icon={<CalendarDays size={18} />} label="Terlambat" value={metrics.overdue} />
      </div>
      <section style={styles.progressCard}>
        <div style={styles.progressHead}><div><b>Progres penyelesaian</b><p>{metrics.completed} dari {metrics.total} catatan selesai</p></div><strong>{metrics.completionRate}%</strong></div>
        <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${metrics.completionRate}%` }} /></div>
      </section>
      {!readOnly && <div style={styles.toolbar}><h2 style={styles.sectionTitle}>Catatan modul</h2><button style={styles.primary} onClick={() => setFormOpen(!formOpen)}><Plus size={17} /> Tambah catatan</button></div>}
      {readOnly && <h2 style={styles.sectionTitle}>Catatan perusahaan</h2>}
      {formOpen && !readOnly && <form onSubmit={addItem} style={styles.form}>
        <label style={styles.label}>Judul pekerjaan<input style={styles.input} value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} required maxLength={140} placeholder="Contoh: Selesaikan laporan mingguan" /></label>
        <label style={styles.label}>Detail<textarea style={styles.input} value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={2000} rows={3} placeholder="Catatan tambahan (opsional)" /></label>
        <div style={styles.formRow}><label style={styles.label}>Tenggat<input style={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label style={styles.label}>Prioritas<select style={styles.input} value={priority} onChange={(e) => setPriority(e.target.value)}><option value="low">Rendah</option><option value="normal">Normal</option><option value="high">Tinggi</option></select></label></div>
        <div style={styles.formActions}><button type="button" style={styles.secondary} onClick={() => setFormOpen(false)}>Batal</button><button type="submit" style={styles.primary} disabled={saving}>{saving ? <LoaderCircle size={16} /> : <Plus size={16} />} Simpan</button></div>
      </form>}
      {loading ? <div style={styles.empty}><LoaderCircle size={19} /> Memuat data...</div> : !summary?.items?.length ? <div style={styles.empty}><Activity size={24} /><b>Belum ada catatan</b><span>{emptyHint}</span></div> : <div style={styles.list}>
        {summary.items.map((item) => <article key={item.id} style={styles.item}>
          <div style={styles.itemMain}><div style={styles.itemTop}><span style={styles.priority(item.priority)}>{item.priority === "high" ? "Prioritas tinggi" : item.priority === "low" ? "Prioritas rendah" : "Prioritas normal"}</span>{readOnly && <span style={styles.owner}>{item.ownerName || "Pengguna"}</span>}</div><h3>{item.title}</h3>{item.detail && <p>{item.detail}</p>}<small>{item.date ? `Tenggat: ${item.date}` : "Tanpa tenggat"} · {item.status === "completed" ? "Selesai" : item.status === "in_progress" ? "Sedang dikerjakan" : "Menunggu"}</small></div>
          {!readOnly && <div style={styles.itemActions}><select aria-label={`Status ${item.title}`} style={styles.statusSelect} value={item.status} onChange={(e) => void updateStatus(item, e.target.value)}><option value="pending">Menunggu</option><option value="in_progress">Sedang dikerjakan</option><option value="completed">Selesai</option></select><button aria-label={`Hapus ${item.title}`} style={styles.delete} onClick={() => void deleteItem(item)}><Trash2 size={16} /></button></div>}
        </article>)}
      </div>}
      <p style={styles.footnote}>Pencapaian dihitung dari catatan yang tersimpan di Delta. Modul yang belum memiliki catatan akan menampilkan nol, bukan angka perkiraan.</p>
    </section>
  </main>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <article style={styles.metric}><span style={styles.metricIcon}>{icon}</span><span style={styles.metricLabel}>{label}</span><strong>{value}</strong></article>;
}

const styles: Record<string, any> = {
  page: { minHeight: "100vh", background: "#f7f8fc", color: "#202438", fontFamily: "Arial, sans-serif" },
  center: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#5d6277" },
  header: { minHeight: 68, padding: "0 5vw", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#fff", borderBottom: "1px solid #e9ebf2" },
  back: { display: "inline-flex", alignItems: "center", gap: 7, border: 0, background: "transparent", color: "#62677b", cursor: "pointer" },
  brand: { fontWeight: 800, color: "#5144c9", display: "flex", gap: 7, alignItems: "center" },
  content: { maxWidth: 1080, margin: "0 auto", padding: "36px 20px 60px" },
  eyebrow: { color: "#7162df", fontSize: 11, fontWeight: 800, letterSpacing: 1.2 },
  title: { margin: "9px 0 7px", fontSize: 30, letterSpacing: -0.8 },
  subtitle: { margin: "0 0 22px", color: "#777d90", lineHeight: 1.6, fontSize: 14 },
  refresh: { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 11px", background: "#fff", border: "1px solid #e1e4ee", borderRadius: 9, color: "#555b70" },
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 14 },
  metric: { display: "grid", gridTemplateColumns: "34px 1fr", gap: "4px 10px", alignItems: "center", background: "#fff", border: "1px solid #e9ebf2", borderRadius: 13, padding: 16 },
  metricIcon: { gridRow: "span 2", width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "#f0edff", color: "#6657d9" },
  metricLabel: { fontSize: 12, color: "#777d90" },
  metric: { display: "grid", gridTemplateColumns: "34px 1fr", gap: "4px 10px", alignItems: "center", background: "#fff", border: "1px solid #e9ebf2", borderRadius: 13, padding: 16 },
  progressCard: { padding: 18, background: "#fff", border: "1px solid #e9ebf2", borderRadius: 13, marginBottom: 28 },
  progressHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  progressHead p: { margin: "5px 0 0", color: "#777d90", fontSize: 12 },
  progressHead strong: { color: "#5144c9", fontSize: 24 },
  progressTrack: { height: 8, background: "#efedf8", borderRadius: 20, overflow: "hidden", marginTop: 15 },
  progressFill: { height: "100%", background: "#7162df", borderRadius: 20, transition: "width .2s ease" },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 13 },
  sectionTitle: { margin: "0 0 13px", fontSize: 18 },
  primary: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, border: 0, borderRadius: 9, background: "#6657d9", color: "#fff", padding: "10px 13px", fontWeight: 700 },
  secondary: { border: "1px solid #e1e4ee", borderRadius: 9, background: "#fff", color: "#555b70", padding: "10px 13px" },
  form: { background: "#fff", border: "1px solid #e9ebf2", borderRadius: 14, padding: 18, marginBottom: 18, display: "grid", gap: 14 },
  label: { display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "#555b70" },
  input: { width: "100%", minWidth: 0, border: "1px solid #dfe2ec", borderRadius: 9, padding: "11px 12px", background: "#fff", color: "#202438", resize: "vertical" },
  formRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 },
  formActions: { display: "flex", justifyContent: "flex-end", gap: 8 },
  list: { display: "grid", gap: 10 },
  item: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, background: "#fff", border: "1px solid #e9ebf2", borderRadius: 13, padding: 16 },
  itemMain: { minWidth: 0, flex: 1 },
  itemTop: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  priority: (priority: string) => ({ display: "inline-flex", padding: "4px 7px", borderRadius: 6, background: priority === "high" ? "#fff0f0" : priority === "low" ? "#f2f3f7" : "#f0edff", color: priority === "high" ? "#a42d36" : priority === "low" ? "#666b7e" : "#6657d9", fontSize: 10, fontWeight: 700 }),
  owner: { fontSize: 11, color: "#777d90" },
  itemMainTitle: { margin: 0 },
  itemActions: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  statusSelect: { border: "1px solid #dfe2ec", borderRadius: 8, background: "#fff", padding: "8px 7px", fontSize: 12, color: "#555b70", maxWidth: 170 },
  delete: { display: "grid", placeItems: "center", border: "1px solid #f0caca", borderRadius: 8, color: "#a42d36", background: "#fff", width: 34, height: 34 },
  empty: { minHeight: 150, background: "#fff", border: "1px dashed #d9dce8", borderRadius: 13, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#777d90", padding: 24, textAlign: "center" as const },
  error: { display: "flex", alignItems: "center", gap: 8, padding: 12, background: "#fff0f0", color: "#a42d36", borderRadius: 9, marginBottom: 14, fontSize: 13 },
  notice: { display: "flex", alignItems: "center", gap: 8, padding: 12, background: "#eaf8f0", color: "#247346", borderRadius: 9, marginBottom: 14, fontSize: 13 },
  note: { color: "#9a5b00", fontSize: 12 },
  footnote: { color: "#858a9b", fontSize: 12, lineHeight: 1.6, marginTop: 22 },
};
