"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardList, LoaderCircle, Package, Plus, Trash2, Users, Megaphone, RefreshCw } from "lucide-react";
import { auth, db, firebaseConfigured } from "@/lib/firebase";

type ModuleId = "daily-operations" | "facility-inventory" | "visitor-management" | "schedules-announcements";
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
        if (role !== "office" && role !== "superadmin") {
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
    return <main className="module-page"><section className="module-empty"><h1>Modul tidak ditemukan</h1><p>Pilih modul dari dashboard Manajer Kantor.</p><button onClick={() => router.push("/dashboard")}>Kembali ke dashboard</button></section></main>;
  }

  const Icon = config.icon;

  return (
    <main className="module-page">
      <header className="module-topbar">
        <button className="module-back" onClick={() => router.push("/dashboard")}><ArrowLeft size={17} /> Dashboard</button>
        <span className="module-brand">delta<span>.</span> WORKSPACE</span>
      </header>
      <div className="module-content">
        <div className="module-eyebrow">MANAJER KANTOR / MODUL OPERASIONAL</div>
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
