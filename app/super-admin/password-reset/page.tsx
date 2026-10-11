"use client";

import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, firebaseConfigured } from "@/lib/firebase";
import { ArrowLeft, Check, CheckCircle2, CircleAlert, Copy, LoaderCircle, RefreshCw, ShieldCheck, X } from "lucide-react";
import Link from "next/link";

type ResetRequest = { id: string; email: string; reason: string; status: "pending" | "approved" | "rejected" | string; createdAt: string; reviewedAt: string };
type LinkState = { id: string; url: string; message: string } | null;

export default function PasswordResetRequestsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [generatedLink, setGeneratedLink] = useState<LinkState>(null);

  const api = useCallback(async (init: RequestInit = {}) => {
    if (!user) throw new Error("Sesi login belum siap.");
    const token = await user.getIdToken();
    const response = await fetch("/api/admin/password-reset-requests", {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Permintaan gagal.");
    return data;
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError("");
    try { const data = await api(); setRequests(data.requests ?? []); }
    catch (err) { setError(err instanceof Error ? err.message : "Permintaan gagal dimuat."); }
    finally { setLoading(false); }
  }, [api, user]);

  useEffect(() => {
    if (!firebaseConfigured || !auth) { setError("Firebase belum dikonfigurasi."); setSessionReady(true); return; }
    return onAuthStateChanged(auth, (current) => {
      if (!current) { window.location.replace("/login"); return; }
      setUser(current); setSessionReady(true);
    });
  }, []);

  useEffect(() => { if (user) void load(); }, [user, load]);

  async function process(item: ResetRequest, action: "approve" | "reject" | "reissue") {
    setWorking(item.id); setError(""); setNotice(""); setGeneratedLink(null);
    try {
      const data = await api({ method: "PATCH", body: JSON.stringify({ id: item.id, action }) });
      if (data.resetLink) setGeneratedLink({ id: item.id, url: data.resetLink, message: data.message });
      else setNotice(action === "reject" ? "Permintaan ditolak." : data.message || "Permintaan diperbarui.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Permintaan gagal diproses."); }
    finally { setWorking(""); }
  }

  async function copyLink() {
    if (!generatedLink) return;
    try { await navigator.clipboard.writeText(generatedLink.url); setNotice("Tautan berhasil disalin. Kirim secara pribadi kepada pemilik akun."); }
    catch { setNotice("Salin tautan yang ditampilkan secara manual, lalu kirim secara pribadi kepada pemilik akun."); }
  }

  if (!sessionReady) return <main style={s.center}><LoaderCircle size={20} /> Memeriksa sesi admin...</main>;

  const pending = requests.filter((item) => item.status === "pending");
  return <main style={s.page}>
    <header style={s.header}>
      <Link href="/super-admin" style={s.back}><ArrowLeft size={17} /> Manajemen akun</Link>
      <div style={s.brand}><ShieldCheck size={22} /> Delta <span>Super Admin</span></div>
      <span style={s.count}>{pending.length} menunggu</span>
    </header>
    <section style={s.content}>
      <div style={s.eyebrow}>KEAMANAN AKUN</div><h1 style={s.title}>Permintaan lupa password</h1>
      <p style={s.subtitle}>Periksa permintaan sebelum membuat tautan pemulihan. Tautan hanya ditampilkan setelah persetujuan dan harus dikirim secara pribadi kepada pengguna.</p>
      {error && <div role="alert" style={s.error}><CircleAlert size={17} /> {error}</div>}
      {notice && <div role="status" style={s.notice}><CheckCircle2 size={17} /> {notice}</div>}
      {generatedLink && <div style={s.linkPanel}>
        <strong>Tautan pemulihan siap</strong><p>{generatedLink.message}</p>
        <div style={s.linkBox}>{generatedLink.url}</div>
        <button style={s.primary} onClick={() => void copyLink()}><Copy size={16} /> Salin tautan</button>
        <small style={s.hint}>Jangan posting tautan ini di tempat publik. Tautan reset bersifat sensitif dan dapat digunakan untuk mengubah kata sandi akun.</small>
      </div>}
      <div style={s.listHead}><h2 style={s.listTitle}>Semua permintaan <span>{requests.length}</span></h2><button style={s.secondary} onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Segarkan</button></div>
      {loading && !requests.length ? <div style={s.empty}><LoaderCircle size={20} /> Memuat permintaan...</div> : requests.length === 0 ? <div style={s.empty}>Belum ada permintaan pemulihan password.</div> :
        <div style={s.list}>{requests.map((item) => <article key={item.id} style={s.card}>
          <div style={s.cardTop}><div style={s.email}>{item.email}</div><span style={{ ...s.status, ...(item.status === "pending" ? s.pending : item.status === "approved" ? s.approved : s.rejected) }}>{item.status === "pending" ? "Menunggu" : item.status === "approved" ? "Disetujui" : "Ditolak"}</span></div>
          {item.reason && <p style={s.reason}>{item.reason}</p>}
          <div style={s.date}>Diajukan: {item.createdAt ? new Date(item.createdAt).toLocaleString("id-ID") : "Waktu tidak tersedia"}</div>
          <div style={s.actions}>
            {item.status === "pending" && <>
              <button style={s.approve} disabled={working === item.id} onClick={() => void process(item, "approve")}>{working === item.id ? <LoaderCircle size={15} /> : <Check size={15} />} Setujui & buat tautan</button>
              <button style={s.reject} disabled={working === item.id} onClick={() => void process(item, "reject")}><X size={15} /> Tolak</button>
            </>}
            {item.status === "approved" && <button style={s.secondary} disabled={working === item.id} onClick={() => void process(item, "reissue")}>{working === item.id ? <LoaderCircle size={15} /> : <RefreshCw size={15} />} Buat ulang tautan</button>}
          </div>
        </article>)}</div>}
      <p style={s.footnote}>Delta tidak menampilkan kata sandi pengguna kepada Super Admin. Sistem membuat tautan reset resmi Firebase setelah persetujuan. Pengiriman email otomatis belum dikonfigurasi, jadi tautan perlu dibagikan langsung dan secara privat.</p>
    </section>
  </main>;
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f7f8fc", color: "#202438", fontFamily: "Arial, sans-serif" },
  center: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#5d6277" },
  header: { minHeight: 72, padding: "0 5vw", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "#fff", borderBottom: "1px solid #e9ebf2" },
  back: { color: "#5d6277", textDecoration: "none", display: "flex", alignItems: "center", gap: 7, fontSize: 14 },
  brand: { display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: "#5144c9" },
  count: { fontSize: 12, color: "#7162df", background: "#f0edff", borderRadius: 8, padding: "7px 10px", whiteSpace: "nowrap" },
  content: { maxWidth: 900, margin: "0 auto", padding: "42px 22px 60px" },
  eyebrow: { color: "#7162df", fontWeight: 700, fontSize: 11, letterSpacing: 1.5 },
  title: { margin: "10px 0 8px", fontSize: 30, letterSpacing: -1 },
  subtitle: { color: "#777d90", marginTop: 0, marginBottom: 24, lineHeight: 1.7, fontSize: 13 },
  error: { display: "flex", gap: 8, alignItems: "center", padding: 13, borderRadius: 10, background: "#fff0f0", color: "#a42d36", marginBottom: 14, fontSize: 14 },
  notice: { display: "flex", gap: 8, alignItems: "center", padding: 13, borderRadius: 10, background: "#eaf8f0", color: "#247346", marginBottom: 14, fontSize: 13 },
  linkPanel: { padding: 18, border: "1px solid #d7eadf", background: "#f7fcf8", borderRadius: 14, marginBottom: 20, overflowWrap: "anywhere" },
  linkBox: { fontSize: 12, lineHeight: 1.6, padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #dfe8e1", margin: "10px 0 12px", overflowWrap: "anywhere", color: "#435b4b" },
  primary: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, border: 0, borderRadius: 9, background: "#247346", color: "#fff", padding: "11px 14px", fontWeight: 700, cursor: "pointer" },
  secondary: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, border: "1px solid #e1e4ee", borderRadius: 9, background: "#fff", color: "#555b70", padding: "9px 12px", cursor: "pointer", textDecoration: "none" },
  listHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, margin: "26px 0 12px" },
  listTitle: { fontSize: 18, margin: 0 }, listTitleSpan: { color: "#777d90" },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: { background: "#fff", border: "1px solid #e9ebf2", borderRadius: 14, padding: 18 },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  email: { fontWeight: 700, fontSize: 14, overflowWrap: "anywhere" },
  status: { display: "inline-flex", borderRadius: 20, padding: "5px 9px", fontSize: 11, fontWeight: 700 },
  pending: { background: "#fff5df", color: "#9b6b0d" }, approved: { background: "#eaf8f0", color: "#247346" }, rejected: { background: "#fff0f0", color: "#a42d36" },
  reason: { fontSize: 13, lineHeight: 1.6, color: "#666d81", whiteSpace: "pre-wrap", margin: "12px 0" },
  date: { fontSize: 11, color: "#858a9b", marginTop: 10 },
  actions: { display: "flex", flexWrap: "wrap", gap: 9, marginTop: 14 },
  approve: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, border: 0, borderRadius: 9, background: "#247346", color: "#fff", padding: "10px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  reject: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, border: "1px solid #f0caca", borderRadius: 9, background: "#fff", color: "#a42d36", padding: "10px 12px", fontSize: 12, cursor: "pointer" },
  hint: { display: "block", fontSize: 11, lineHeight: 1.6, color: "#777d90", marginTop: 12 },
  empty: { minHeight: 140, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: "#fff", border: "1px dashed #dfe2ec", borderRadius: 14, color: "#858a9b", fontSize: 13 },
  footnote: { fontSize: 11, color: "#858a9b", lineHeight: 1.7, marginTop: 20 },
};
