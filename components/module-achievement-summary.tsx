"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { Activity, CalendarClock, CheckCircle2, Clock3, LoaderCircle, RefreshCw } from "lucide-react";

type Metrics = { total: number; completed: number; active: number; overdue: number; completionRate: number };
type Summary = { scope: "personal" | "company"; moduleId: string; metrics: Metrics; note?: string };

const labels: Record<string, { total: string; completed: string; active: string; overdue: string; progress: string }> = {
  "general-ledger": { total: "Transaksi tercatat", completed: "Transaksi selesai", active: "Perlu ditinjau", overdue: "Tenggat lewat", progress: "Penyelesaian transaksi" },
  "financial-reports": { total: "Laporan tercatat", completed: "Laporan final", active: "Belum final", overdue: "Tenggat lewat", progress: "Finalisasi laporan" },
  "tax-and-compliance": { total: "Kewajiban tercatat", completed: "Kewajiban selesai", active: "Belum dipenuhi", overdue: "Terlambat", progress: "Kepatuhan" },
  "ai-data-analytics": { total: "Analisis tercatat", completed: "Analisis selesai", active: "Perlu ditinjau", overdue: "Tenggat lewat", progress: "Penyelesaian analisis" },
  "hr-metrics": { total: "Indikator tercatat", completed: "Tuntas ditinjau", active: "Perlu perhatian", overdue: "Terlambat ditinjau", progress: "Pemantauan indikator" },
  "recruitment-ats": { total: "Kandidat tercatat", completed: "Proses ditutup", active: "Masih diproses", overdue: "Jadwal terlewat", progress: "Penyelesaian rekrutmen" },
  "employee-experience": { total: "Masukan tercatat", completed: "Tindak lanjut selesai", active: "Belum ditangani", overdue: "Terlambat ditangani", progress: "Tindak lanjut karyawan" },
  "policy-generator": { total: "Kebijakan tercatat", completed: "Disetujui", active: "Belum disetujui", overdue: "Tenggat lewat", progress: "Persetujuan kebijakan" },
  "sales-pipeline": { total: "Prospek tercatat", completed: "Menang", active: "Belum menang", overdue: "Tindak lanjut lewat", progress: "Konversi prospek" },
  "team-performance": { total: "Catatan kinerja", completed: "Target tercapai", active: "Perlu dukungan", overdue: "Tenggat lewat", progress: "Pencapaian target" },
  "smart-follow-ups": { total: "Tindak lanjut", completed: "Selesai", active: "Belum selesai", overdue: "Terlambat", progress: "Penyelesaian tindak lanjut" },
  "forecasting-insights": { total: "Analisis perkiraan", completed: "Final", active: "Belum final", overdue: "Tenggat lewat", progress: "Finalisasi perkiraan" },
  "daily-operations": { total: "Tugas operasional", completed: "Tugas selesai", active: "Belum selesai", overdue: "Terlambat", progress: "Penyelesaian tugas" },
  "facility-inventory": { total: "Barang/aset tercatat", completed: "Kondisi baik", active: "Perlu perhatian", overdue: "Perlu tindak lanjut", progress: "Kondisi inventaris" },
  "visitor-management": { total: "Kunjungan tercatat", completed: "Kunjungan selesai", active: "Belum selesai", overdue: "Jadwal terlewat", progress: "Penyelesaian kunjungan" },
  "schedules-announcements": { total: "Agenda/pengumuman", completed: "Kegiatan selesai", active: "Belum selesai", overdue: "Agenda terlewat", progress: "Penyelesaian agenda" },
  "creative-workspace": { total: "Proyek kreatif", completed: "Selesai", active: "Masih dikerjakan", overdue: "Tenggat lewat", progress: "Penyelesaian proyek" },
  "ai-idea-generator": { total: "Ide tercatat", completed: "Ide terpilih", active: "Belum dipilih", overdue: "Perlu ditinjau", progress: "Seleksi ide" },
  "asset-library": { total: "Aset tercatat", completed: "Siap digunakan", active: "Belum siap", overdue: "Perlu ditinjau", progress: "Kesiapan aset" },
  "client-approvals": { total: "Pekerjaan menunggu", completed: "Disetujui klien", active: "Belum disetujui", overdue: "Persetujuan terlambat", progress: "Persetujuan klien" },
  "market-data-and-portfolio": { total: "Instrumen tercatat", completed: "Dalam pemantauan", active: "Perlu ditinjau", overdue: "Perlu tindak lanjut", progress: "Pemantauan portofolio" },
  "scenario-modeling": { total: "Skenario tercatat", completed: "Final", active: "Belum final", overdue: "Tenggat lewat", progress: "Finalisasi skenario" },
  "risk-assessment": { total: "Risiko tercatat", completed: "Risiko ditutup", active: "Masih terbuka", overdue: "Mitigasi terlambat", progress: "Penanganan risiko" },
  "data-driven-decisions": { total: "Keputusan tercatat", completed: "Diputuskan", active: "Belum diputuskan", overdue: "Tenggat lewat", progress: "Penyelesaian keputusan" },
  "classes-and-students": { total: "Kelas/siswa tercatat", completed: "Aktif dikelola", active: "Perlu perhatian", overdue: "Perlu tindak lanjut", progress: "Pengelolaan kelas" },
  "lesson-plan-creator": { total: "Rencana pelajaran", completed: "Selesai disiapkan", active: "Belum selesai", overdue: "Tenggat lewat", progress: "Kesiapan pembelajaran" },
  "assignments-and-grading": { total: "Tugas/penilaian", completed: "Selesai dinilai", active: "Belum selesai dinilai", overdue: "Terlambat dinilai", progress: "Penyelesaian penilaian" },
  "interactive-resources": { total: "Materi tercatat", completed: "Siap digunakan", active: "Belum siap", overdue: "Perlu ditinjau", progress: "Kesiapan materi" },
  "client-and-engagement": { total: "Klien/proyek", completed: "Pekerjaan selesai", active: "Masih aktif", overdue: "Tenggat lewat", progress: "Penyelesaian pekerjaan" },
  "industry-knowledge-base": { total: "Referensi tercatat", completed: "Sudah ditinjau", active: "Belum ditinjau", overdue: "Perlu ditinjau", progress: "Peninjauan referensi" },
  "time-and-invoicing": { total: "Pekerjaan/tagihan", completed: "Lunas", active: "Belum lunas", overdue: "Tagihan terlambat", progress: "Penyelesaian tagihan" },
  "strategic-reports": { total: "Laporan strategi", completed: "Final", active: "Belum final", overdue: "Tenggat lewat", progress: "Finalisasi laporan" },
  "property-listings": { total: "Listing properti", completed: "Terjual/disewakan", active: "Masih dipasarkan", overdue: "Perlu tindak lanjut", progress: "Realisasi listing" },
  "client-crm-and-leads": { total: "Calon klien", completed: "Selesai ditangani", active: "Masih ditindaklanjuti", overdue: "Tindak lanjut lewat", progress: "Penanganan calon klien" },
  "showings-calendar": { total: "Jadwal kunjungan", completed: "Kunjungan selesai", active: "Belum selesai", overdue: "Jadwal terlewat", progress: "Penyelesaian kunjungan" },
  "contracts-and-documents": { total: "Kontrak/dokumen", completed: "Ditandatangani", active: "Belum ditandatangani", overdue: "Tenggat lewat", progress: "Penyelesaian kontrak" },
  "overview": { total: "Catatan", completed: "Selesai", active: "Belum selesai", overdue: "Terlambat", progress: "Penyelesaian catatan" },
};

export default function ModuleAchievementSummary({ moduleId, refreshKey = 0 }: { moduleId: string; refreshKey?: number }) {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const copy = labels[moduleId] ?? labels.overview;

  const load = useCallback(async () => {
    const user = auth?.currentUser;
    if (!user) return;
    setLoading(true); setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/workspace-data?moduleId=${encodeURIComponent(moduleId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Ringkasan modul gagal dimuat.");
      setData(result);
    } catch (err) { setError(err instanceof Error ? err.message : "Ringkasan modul gagal dimuat."); }
    finally { setLoading(false); }
  }, [moduleId]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const metrics = data?.metrics;
  return <section style={s.card}>
    <div style={s.header}><div><div style={s.eyebrow}>{data?.scope === "company" ? "PENCAPAIAN PERUSAHAAN" : "PENCAPAIAN PRIBADI"}</div><h2 style={s.title}>Ringkasan {copy.progress.toLowerCase()}</h2><p style={s.subtitle}>{data?.scope === "company" ? "Data gabungan seluruh akun pada modul ini." : "Dihitung dari catatan yang tersimpan pada modul ini."}</p></div><button style={s.refresh} aria-label="Segarkan ringkasan modul" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /></button></div>
    {error && <p role="alert" style={s.error}>{error}</p>}
    {loading ? <div style={s.loading}><LoaderCircle size={17} /> Menghitung pencapaian...</div> : <>
      <div style={s.metrics}>
        <Metric icon={<Activity size={17} />} label={copy.total} value={metrics?.total ?? 0} />
        <Metric icon={<CheckCircle2 size={17} />} label={copy.completed} value={metrics?.completed ?? 0} />
        <Metric icon={<Clock3 size={17} />} label={copy.active} value={metrics?.active ?? 0} />
        <Metric icon={<CalendarClock size={17} />} label={copy.overdue} value={metrics?.overdue ?? 0} />
      </div>
      <div style={s.progressHead}><span>{copy.progress}</span><b>{metrics?.completionRate ?? 0}%</b></div><div style={s.track}><div style={{ ...s.fill, width: `${metrics?.completionRate ?? 0}%` }} /></div>
      {metrics?.total === 0 && <p style={s.empty}>Belum ada data tersimpan pada modul ini. Tambahkan data melalui formulir modul agar pencapaian mulai terhitung.</p>}
      {data?.note && <p style={s.note}>{data.note}</p>}
    </>}
  </section>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div style={s.metric}><span style={s.icon}>{icon}</span><span style={s.label}>{label}</span><b style={s.value}>{value}</b></div>;
}

const s: Record<string, React.CSSProperties> = {
  card: { background: "#fff", border: "1px solid #e9ebf2", borderRadius: 14, padding: 18, margin: "18px 0 24px" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 15 },
  eyebrow: { color: "#7162df", fontSize: 10, fontWeight: 800, letterSpacing: 1.2 },
  title: { fontSize: 17, margin: "6px 0 4px", color: "#202438" },
  subtitle: { fontSize: 12, lineHeight: 1.5, color: "#777d90", margin: 0 },
  refresh: { display: "grid", placeItems: "center", width: 32, height: 32, border: "1px solid #e1e4ee", borderRadius: 8, background: "#fff", color: "#555b70" },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 9 },
  metric: { display: "grid", gridTemplateColumns: "29px 1fr", gap: "4px 8px", alignItems: "center", background: "#fbfbfe", border: "1px solid #f0f1f6", borderRadius: 10, padding: 11 },
  icon: { gridRow: "span 2", width: 29, height: 29, display: "grid", placeItems: "center", borderRadius: 8, background: "#f0edff", color: "#6657d9" },
  label: { fontSize: 11, color: "#777d90", lineHeight: 1.3 },
  value: { fontSize: 18, color: "#202438" },
  progressHead: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#5c6175", marginTop: 16 },
  track: { height: 7, borderRadius: 20, background: "#efedf8", overflow: "hidden", marginTop: 8 },
  fill: { height: "100%", borderRadius: 20, background: "#7162df" },
  loading: { display: "flex", alignItems: "center", gap: 8, color: "#777d90", fontSize: 12, padding: 12 },
  empty: { fontSize: 12, lineHeight: 1.5, color: "#858a9b", margin: "13px 0 0" },
  note: { color: "#9a5b00", fontSize: 12 },
  error: { color: "#a42d36", fontSize: 12 },
};
