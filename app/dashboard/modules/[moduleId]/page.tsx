"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Activity, ArrowLeft, CalendarDays, CheckCircle2, ClipboardList, LoaderCircle, Package, Plus, Trash2, Users, Megaphone, RefreshCw } from "lucide-react";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import WorkspaceTools from "@/components/workspace-tools";

type ModuleId = "overview" | "general-ledger" | "financial-reports" | "tax-and-compliance" | "ai-data-analytics" | "hr-metrics" | "recruitment-ats" | "employee-experience" | "policy-generator" | "sales-pipeline" | "team-performance" | "smart-follow-ups" | "forecasting-insights" | "daily-operations" | "facility-inventory" | "visitor-management" | "schedules-announcements" | "creative-workspace" | "ai-idea-generator" | "asset-library" | "client-approvals" | "market-data-and-portfolio" | "scenario-modeling" | "risk-assessment" | "data-driven-decisions" | "classes-and-students" | "lesson-plan-creator" | "assignments-and-grading" | "interactive-resources" | "client-and-engagement" | "industry-knowledge-base" | "time-and-invoicing" | "strategic-reports" | "property-listings" | "client-crm-and-leads" | "showings-calendar" | "contracts-and-documents";
type WorkspaceRecord = {
  id: string;
  moduleId: ModuleId;
  title: string;
  detail: string;
  status: string;
  priority: string;
  date: string;
  quantity: string;
  createdAt: number;
};

const moduleConfig: Record<ModuleId, {
  title: string;
  description: string;
  titleLabel: string;
  detailLabel: string;
  icon: typeof ClipboardList;
  statuses: string[];
  hasDate?: boolean;
  hasPriority?: boolean;
  hasQuantity?: boolean;
}> = {
  "sales-pipeline": {
    title: "Sales Pipeline",
    description: "Pantau prospek penjualan dari kontak awal sampai hasil akhir.",
    titleLabel: "Nama prospek atau peluang",
    detailLabel: "Perusahaan, nilai, atau langkah berikutnya",
    icon: Activity,
    statuses: ["Prospek baru", "Dihubungi", "Negosiasi", "Menang", "Kalah"],
    hasDate: true,
    hasPriority: true,
  },
  "team-performance": {
    title: "Team Performance",
    description: "Catat target, pencapaian, dan kebutuhan dukungan anggota tim.",
    titleLabel: "Nama anggota tim",
    detailLabel: "Target dan catatan kinerja",
    icon: Users,
    statuses: ["Sesuai target", "Perlu dukungan", "Melampaui target"],
    hasDate: true,
  },
  "smart-follow-ups": {
    title: "Smart Follow-ups",
    description: "Kelola jadwal tindak lanjut agar tidak ada prospek yang terlewat.",
    titleLabel: "Nama prospek atau tindak lanjut",
    detailLabel: "Catatan tindak lanjut",
    icon: CalendarDays,
    statuses: ["Perlu dihubungi", "Dijadwalkan", "Selesai"],
    hasDate: true,
    hasPriority: true,
  },
  "forecasting-insights": {
    title: "Forecasting & Insights",
    description: "Catat perkiraan penjualan dan insight berdasarkan peluang yang ada.",
    titleLabel: "Judul perkiraan atau insight",
    detailLabel: "Nilai perkiraan dan dasar analisis",
    icon: CheckCircle2,
    statuses: ["Draft", "Ditinjau", "Final"],
    hasDate: true,
  },
  "overview": {
    title: "Overview",
    description: "Ringkasan aktivitas dan catatan kerja utama.",
    titleLabel: "Judul ringkasan",
    detailLabel: "Catatan atau hasil utama",
    icon: ClipboardList,
    statuses: ["Aktif","Dalam proses","Selesai"],
    hasDate: true,
  },
  "general-ledger": {
    title: "General Ledger",
    description: "Catat referensi transaksi dan aktivitas buku besar.",
    titleLabel: "Referensi transaksi",
    detailLabel: "Akun, nominal, atau catatan transaksi",
    icon: ClipboardList,
    statuses: ["Draft","Ditinjau","Selesai"],
    hasDate: true,
  },
  "financial-reports": {
    title: "Financial Reports",
    description: "Kelola daftar laporan keuangan dan status penyusunannya.",
    titleLabel: "Nama laporan",
    detailLabel: "Periode dan catatan laporan",
    icon: ClipboardList,
    statuses: ["Draft","Disusun","Final"],
    hasDate: true,
  },
  "tax-and-compliance": {
    title: "Tax And Compliance",
    description: "Pantau pekerjaan pajak dan kepatuhan.",
    titleLabel: "Nama kewajiban",
    detailLabel: "Periode dan catatan kepatuhan",
    icon: ClipboardList,
    statuses: ["Belum dimulai","Dalam proses","Selesai"],
    hasDate: true,
  },
  "ai-data-analytics": {
    title: "AI Data Analytics",
    description: "Simpan pertanyaan analisis dan temuan data.",
    titleLabel: "Topik analisis",
    detailLabel: "Pertanyaan atau temuan",
    icon: ClipboardList,
    statuses: ["Perlu dianalisis","Ditinjau","Selesai"],
    hasDate: true,
  },
  "hr-metrics": {
    title: "HR Metrics",
    description: "Catat indikator SDM dan hasil pemantauan.",
    titleLabel: "Nama indikator SDM",
    detailLabel: "Nilai, periode, atau catatan",
    icon: ClipboardList,
    statuses: ["Dipantau","Perlu perhatian","Selesai"],
    hasDate: true,
  },
  "recruitment-ats": {
    title: "Recruitment Ats",
    description: "Kelola kandidat dan tahapan rekrutmen.",
    titleLabel: "Nama kandidat atau posisi",
    detailLabel: "Kontak, posisi, atau catatan",
    icon: ClipboardList,
    statuses: ["Lamaran baru","Wawancara","Ditawarkan","Ditutup"],
    hasDate: true,
  },
  "employee-experience": {
    title: "Employee Experience",
    description: "Catat masukan dan tindak lanjut pengalaman karyawan.",
    titleLabel: "Topik atau nama karyawan",
    detailLabel: "Masukan dan tindak lanjut",
    icon: ClipboardList,
    statuses: ["Baru","Ditindaklanjuti","Selesai"],
    hasDate: true,
  },
  "policy-generator": {
    title: "Policy Generator",
    description: "Kelola rancangan kebijakan dan prosedur SDM.",
    titleLabel: "Nama kebijakan",
    detailLabel: "Ringkasan isi atau catatan",
    icon: ClipboardList,
    statuses: ["Draft","Ditinjau","Disetujui"],
    hasDate: true,
  },
  "creative-workspace": {
    title: "Creative Workspace",
    description: "Kelola pekerjaan dan ide kreatif.",
    titleLabel: "Nama proyek kreatif",
    detailLabel: "Brief atau catatan proyek",
    icon: ClipboardList,
    statuses: ["Ide","Dikerjakan","Ditinjau","Selesai"],
    hasDate: true,
  },
  "ai-idea-generator": {
    title: "AI Idea Generator",
    description: "Catat ide kreatif yang ingin dikembangkan.",
    titleLabel: "Judul ide",
    detailLabel: "Konsep atau arahan ide",
    icon: ClipboardList,
    statuses: ["Ide baru","Dikembangkan","Dipilih"],
    hasDate: true,
  },
  "asset-library": {
    title: "Asset Library",
    description: "Catat aset desain dan lokasi berkasnya.",
    titleLabel: "Nama aset",
    detailLabel: "Jenis, lokasi, atau catatan",
    icon: ClipboardList,
    statuses: ["Draft","Siap digunakan","Diarsipkan"],
    hasDate: true,
  },
  "client-approvals": {
    title: "Client Approvals",
    description: "Pantau persetujuan hasil desain dari klien.",
    titleLabel: "Nama pekerjaan atau klien",
    detailLabel: "Versi dan catatan revisi",
    icon: ClipboardList,
    statuses: ["Menunggu","Perlu revisi","Disetujui"],
    hasDate: true,
  },
  "market-data-and-portfolio": {
    title: "Market Data And Portfolio",
    description: "Catat aset portofolio dan pantauan pasar.",
    titleLabel: "Nama aset atau instrumen",
    detailLabel: "Nilai, sumber, atau catatan",
    icon: ClipboardList,
    statuses: ["Dipantau","Perlu ditinjau","Diarsipkan"],
    hasDate: true,
  },
  "scenario-modeling": {
    title: "Scenario Modeling",
    description: "Kelola skenario dan asumsi perencanaan.",
    titleLabel: "Nama skenario",
    detailLabel: "Asumsi dan hasil perkiraan",
    icon: ClipboardList,
    statuses: ["Draft","Dianalisis","Final"],
    hasDate: true,
  },
  "risk-assessment": {
    title: "Risk Assessment",
    description: "Catat risiko dan rencana mitigasi.",
    titleLabel: "Nama risiko",
    detailLabel: "Dampak dan rencana mitigasi",
    icon: ClipboardList,
    statuses: ["Baru","Dimitigasi","Ditutup"],
    hasDate: true,
  },
  "data-driven-decisions": {
    title: "Data Driven Decisions",
    description: "Catat keputusan beserta dasar datanya.",
    titleLabel: "Judul keputusan",
    detailLabel: "Data pendukung dan alasan",
    icon: ClipboardList,
    statuses: ["Perlu analisis","Ditinjau","Diputuskan"],
    hasDate: true,
  },
  "classes-and-students": {
    title: "Classes And Students",
    description: "Kelola kelas dan catatan siswa.",
    titleLabel: "Nama kelas atau siswa",
    detailLabel: "Jadwal dan catatan pembelajaran",
    icon: ClipboardList,
    statuses: ["Aktif","Perlu perhatian","Selesai"],
    hasDate: true,
  },
  "lesson-plan-creator": {
    title: "Lesson Plan Creator",
    description: "Kelola rencana pelaksanaan pembelajaran.",
    titleLabel: "Topik pelajaran",
    detailLabel: "Tujuan dan catatan pembelajaran",
    icon: ClipboardList,
    statuses: ["Draft","Disiapkan","Selesai"],
    hasDate: true,
  },
  "assignments-and-grading": {
    title: "Assignments And Grading",
    description: "Pantau tugas dan penilaian siswa.",
    titleLabel: "Nama tugas",
    detailLabel: "Instruksi atau catatan penilaian",
    icon: ClipboardList,
    statuses: ["Dibagikan","Dinilai","Selesai"],
    hasDate: true,
  },
  "interactive-resources": {
    title: "Interactive Resources",
    description: "Kelola sumber belajar dan materi interaktif.",
    titleLabel: "Nama materi",
    detailLabel: "Tautan atau catatan materi",
    icon: ClipboardList,
    statuses: ["Draft","Siap digunakan","Diarsipkan"],
    hasDate: true,
  },
  "client-and-engagement": {
    title: "Client And Engagement",
    description: "Kelola klien dan pekerjaan konsultasi.",
    titleLabel: "Nama klien atau proyek",
    detailLabel: "Ruang lingkup dan catatan",
    icon: ClipboardList,
    statuses: ["Prospek","Aktif","Selesai"],
    hasDate: true,
  },
  "industry-knowledge-base": {
    title: "Industry Knowledge Base",
    description: "Catat referensi dan riset industri.",
    titleLabel: "Judul referensi",
    detailLabel: "Sumber dan ringkasan",
    icon: ClipboardList,
    statuses: ["Perlu dibaca","Ditinjau","Diarsipkan"],
    hasDate: true,
  },
  "time-and-invoicing": {
    title: "Time And Invoicing",
    description: "Catat pekerjaan, waktu, dan penagihan.",
    titleLabel: "Nama pekerjaan",
    detailLabel: "Jam, nilai, atau catatan",
    icon: ClipboardList,
    statuses: ["Belum ditagih","Ditagih","Lunas"],
    hasDate: true,
  },
  "strategic-reports": {
    title: "Strategic Reports",
    description: "Kelola laporan dan rekomendasi strategis.",
    titleLabel: "Judul laporan",
    detailLabel: "Temuan dan rekomendasi",
    icon: ClipboardList,
    statuses: ["Draft","Ditinjau","Final"],
    hasDate: true,
  },
  "property-listings": {
    title: "Property Listings",
    description: "Kelola daftar properti yang dipasarkan.",
    titleLabel: "Nama atau alamat properti",
    detailLabel: "Harga, lokasi, atau detail",
    icon: ClipboardList,
    statuses: ["Tersedia","Dalam negosiasi","Terjual/Disewakan"],
    hasDate: true,
  },
  "client-crm-and-leads": {
    title: "Client Crm And Leads",
    description: "Pantau calon pembeli/penyewa dan tindak lanjut.",
    titleLabel: "Nama calon klien",
    detailLabel: "Kontak dan kebutuhan properti",
    icon: ClipboardList,
    statuses: ["Prospek baru","Dihubungi","Negosiasi","Selesai"],
    hasDate: true,
  },
  "showings-calendar": {
    title: "Showings Calendar",
    description: "Kelola jadwal kunjungan properti.",
    titleLabel: "Nama properti atau klien",
    detailLabel: "Lokasi dan catatan kunjungan",
    icon: ClipboardList,
    statuses: ["Dijadwalkan","Selesai","Dibatalkan"],
    hasDate: true,
  },
  "contracts-and-documents": {
    title: "Contracts And Documents",
    description: "Pantau kontrak dan dokumen properti.",
    titleLabel: "Nama dokumen atau kontrak",
    detailLabel: "Pihak terkait dan catatan",
    icon: ClipboardList,
    statuses: ["Disiapkan","Ditinjau","Ditandatangani"],
    hasDate: true,
  },
  "daily-operations": {
    title: "Daily Operations",
    description: "Catat tugas harian, tentukan prioritas, dan pantau pekerjaan sampai selesai.",
    titleLabel: "Nama tugas",
    detailLabel: "Catatan tugas",
    icon: ClipboardList,
    statuses: ["Belum dimulai", "Sedang dikerjakan", "Selesai"],
    hasDate: true,
    hasPriority: true,
  },
  "facility-inventory": {
    title: "Facility & Inventory",
    description: "Simpan daftar barang dan aset kantor, jumlah, serta kondisi terkininya.",
    titleLabel: "Nama barang atau aset",
    detailLabel: "Lokasi atau catatan",
    icon: Package,
    statuses: ["Baik", "Perlu perawatan", "Rusak"],
    hasQuantity: true,
  },
  "visitor-management": {
    title: "Visitor Management",
    description: "Catat tamu kantor, tujuan kedatangan, dan status kunjungan.",
    titleLabel: "Nama tamu",
    detailLabel: "Tujuan kunjungan dan catatan",
    icon: Users,
    statuses: ["Dijadwalkan", "Sudah datang", "Selesai"],
    hasDate: true,
  },
  "schedules-announcements": {
    title: "Schedules & Announcements",
    description: "Kelola jadwal rapat, kegiatan, dan pengumuman internal kantor.",
    titleLabel: "Judul kegiatan atau pengumuman",
    detailLabel: "Isi atau detail",
    icon: Megaphone,
    statuses: ["Terjadwal", "Selesai", "Dibatalkan"],
    hasDate: true,
  },
};

export default function OfficeModulePage() {
  const params = useParams<{ moduleId: string }>();
  const router = useRouter();
  const moduleId = params.moduleId as ModuleId;
  const professionByModule: Record<string, string> = {
  "sales-pipeline": "Manajer Penjualan",
  "team-performance": "Manajer Penjualan",
  "smart-follow-ups": "Manajer Penjualan",
  "forecasting-insights": "Manajer Penjualan",
  "forecasting-and-insights": "Manajer Penjualan",
  overview: "Akuntan",
  "general-ledger": "Akuntan",
  "financial-reports": "Akuntan",
  "tax-compliance": "Akuntan",
  "tax-and-compliance": "Akuntan",
  "ai-data-analytics": "Akuntan",
  "hr-metrics": "Profesional SDM",
  "recruitment-ats": "Profesional SDM",
  "employee-experience": "Profesional SDM",
  "policy-generator": "Profesional SDM",
  "daily-operations": "Manajer Kantor",
  "facility-inventory": "Manajer Kantor",
  "visitor-management": "Manajer Kantor",
  "schedules-announcements": "Manajer Kantor",
  "creative-workspace": "Desainer",
  "ai-idea-generator": "Desainer",
  "asset-library": "Desainer",
  "client-approvals": "Desainer",
  "market-data-portfolio": "Ahli Keuangan / Investor",
  "scenario-modeling": "Ahli Keuangan / Investor",
  "risk-assessment": "Ahli Keuangan / Investor",
  "data-driven-decisions": "Ahli Keuangan / Investor",
  "classes-students": "Guru / Pengajar",
  "lesson-plan-creator": "Guru / Pengajar",
  "assignments-grading": "Guru / Pengajar",
  "interactive-resources": "Guru / Pengajar",
  "client-engagement": "Konsultan",
  "client-and-engagement": "Konsultan",
  "industry-knowledge-base": "Konsultan",
  "time-invoicing": "Konsultan",
  "strategic-reports": "Konsultan",
  "property-listings": "Agen Properti",
  "client-crm-leads": "Agen Properti",
  "showings-calendar": "Agen Properti",
  "contracts-documents": "Agen Properti",
};
const professionLabel = professionByModule[moduleId] ?? "Workspace";
const config = moduleConfig[moduleId];
  const [userId, setUserId] = useState("");
  const [records, setRecords] = useState<WorkspaceRecord[]>([]);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [date, setDate] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeRecords = useMemo(() => records.filter((record) => record.moduleId === moduleId), [records, moduleId]);

  async function loadRecords(uid: string) {
    const currentUser = auth?.currentUser;
    if (!currentUser || currentUser.uid !== uid) return;
    const token = await currentUser.getIdToken();
    const response = await fetch("/api/workspace/items", { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Data modul gagal dimuat.");
    setRecords((data.items ?? []).filter((item: WorkspaceRecord) => item.moduleId in moduleConfig));
  }

  useEffect(() => {
    if (!firebaseConfigured || !auth || !db) {
      setError("Firebase belum dikonfigurasi. Modul belum dapat menyimpan data.");
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const profileSnapshot = await getDoc(doc(db!, "users", user.uid));
        if (!profileSnapshot.exists()) {
          router.replace("/register");
          return;
        }
        const role = profileSnapshot.data().role;
        const roleModules: Record<string, string[]> = {"accountant":["overview","general-ledger","financial-reports","tax-and-compliance","ai-data-analytics"],"hr":["hr-metrics","recruitment-ats","employee-experience","policy-generator"],"sales":["sales-pipeline","team-performance","smart-follow-ups","forecasting-insights"],"office":["daily-operations","facility-inventory","visitor-management","schedules-announcements"],"designer":["creative-workspace","ai-idea-generator","asset-library","client-approvals"],"financier":["market-data-and-portfolio","scenario-modeling","risk-assessment","data-driven-decisions"],"teacher":["classes-and-students","lesson-plan-creator","assignments-and-grading","interactive-resources"],"consultant":["client-and-engagement","industry-knowledge-base","time-and-invoicing","strategic-reports"],"property":["property-listings","client-crm-and-leads","showings-calendar","contracts-and-documents"]};
        const allowedForRole = role === "superadmin" || (roleModules[role] ?? []).includes(moduleId);
        if (!allowedForRole) {
          router.replace("/dashboard");
          return;
        }
        setUserId(user.uid);
        await loadRecords(user.uid);
        setStatus(config?.statuses[0] ?? "");
      } catch {
        setError("Data modul gagal dimuat. Periksa koneksi dan konfigurasi server.");
      } finally {
        setLoading(false);
      }
    });
  }, [router, config]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || !auth?.currentUser || !config) return;
    if (!title.trim()) {
      setError("Nama atau judul wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/workspace/items", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          moduleId,
          title: title.trim(),
          detail: detail.trim(),
          status,
          priority: config.hasPriority ? priority : "",
          date: config.hasDate ? date : "",
          quantity: config.hasQuantity ? quantity : "",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan data.");
      await loadRecords(userId);
      setTitle("");
      setDetail("");
      setDate("");
      setQuantity("1");
      setStatus(config.statuses[0]);
      setPriority("Normal");
      setNotice("Data berhasil disimpan.");
    } catch {
      setError("Gagal menyimpan data. Periksa koneksi lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(recordId: string) {
    if (!userId || !auth?.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/workspace/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: recordId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Data tidak bisa dihapus.");
      setRecords((current) => current.filter((record) => record.id !== recordId));
      setNotice("Data berhasil dihapus.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data tidak bisa dihapus.");
    }
  }

  if (!config) {
    return <main className="module-page"><section className="module-empty"><h1>Modul tidak ditemukan</h1><p>Pilih modul dari dashboard workspace Anda.</p><button onClick={() => router.push("/dashboard")}>Kembali ke dashboard</button></section></main>;
  }

  const Icon = config.icon;

  return (
    <main className="module-page">
      <header className="module-topbar">
        <button className="module-back" onClick={() => router.push("/dashboard")}><ArrowLeft size={17} /> Dashboard</button>
        <span className="module-brand">delta<span>.</span> WORKSPACE</span>
        <WorkspaceTools variant="inline" />
      </header>
      <div className="module-content">
        <div className="module-eyebrow">{professionLabel.toLocaleUpperCase("id-ID")} / MODUL {professionLabel.toLocaleUpperCase("id-ID")}</div>
        <section className="module-hero">
          <div className="module-hero-icon"><Icon size={25} /></div>
          <div><h1>{config.title}</h1><p>{config.description}</p></div>
        </section>

        {error && <div className="module-alert" role="alert">{error}</div>}
        {notice && <div className="module-notice" role="status"><CheckCircle2 size={17} /> {notice}</div>}

        <div className="module-work-grid">
          <section className="module-panel">
            <div className="module-panel-heading"><div><h2>Tambah data</h2><p>Informasi disimpan ke akun lo di Firestore.</p></div><Plus size={19} /></div>
            <form className="module-form" onSubmit={handleSubmit}>
              <label>{config.titleLabel}<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required placeholder={config.titleLabel} /></label>
              <label>{config.detailLabel}<textarea value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={2000} rows={3} placeholder="Tambahkan keterangan bila perlu" /></label>
              <div className="module-form-row">
                {config.hasDate && <label>Tanggal<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>}
                {config.hasQuantity && <label>Jumlah<input type="number" min="0" max="999999" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label>}
              </div>
              <div className="module-form-row">
                <label>{moduleId === "facility-inventory" ? "Kondisi barang" : "Status"}<select value={status} onChange={(event) => setStatus(event.target.value)}>{config.statuses.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                {config.hasPriority && <label>Prioritas<select value={priority} onChange={(event) => setPriority(event.target.value)}><option>Normal</option><option>Tinggi</option><option>Urgent</option></select></label>}
              </div>
              <button className="module-save" type="submit" disabled={saving || loading}>{saving ? <><LoaderCircle className="module-spin" size={17} /> Menyimpan...</> : "Simpan data"}</button>
            </form>
          </section>

          <section className="module-panel module-records-panel">
            <div className="module-panel-heading"><div><h2>Data tersimpan</h2><p>{activeRecords.length} catatan pada modul ini</p></div><button className="module-refresh" onClick={() => userId && loadRecords(userId)} aria-label="Muat ulang data"><RefreshCw size={17} /></button></div>
            {loading ? <div className="module-loading"><LoaderCircle className="module-spin" size={20} /> Memuat data...</div> : activeRecords.length === 0 ? <div className="module-empty-records"><Icon size={27} /><b>Belum ada data</b><span>Tambahkan catatan pertama lewat formulir.</span></div> : <div className="module-record-list">{activeRecords.map((record) => <article className="module-record" key={record.id}><div className="module-record-top"><div><h3>{record.title}</h3><span className="module-status">{record.status}</span></div><button className="module-delete" aria-label={`Hapus ${record.title}`} onClick={() => handleDelete(record.id)}><Trash2 size={16} /></button></div>{record.detail && <p>{record.detail}</p>}<div className="module-record-meta">{record.date && <span><CalendarDays size={14} /> {record.date}</span>}{record.priority && <span>Prioritas: {record.priority}</span>}{record.quantity && <span>Jumlah: {record.quantity}</span>}</div></article>)}</div>}
          </section>
        </div>
        <p className="module-privacy-note">Data modul ini hanya dapat dibaca dan dikelola oleh akun pemiliknya.</p>
      </div>
    </main>
  );
}
