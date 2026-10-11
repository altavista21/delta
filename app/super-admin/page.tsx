"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, firebaseConfigured } from "@/lib/firebase";
import { roles } from "@/lib/roles";
import { ArrowLeft, CheckCircle2, CircleAlert, KeyRound, LoaderCircle, LogOut, Plus, RefreshCw, ShieldCheck, UserRound, UserRoundX } from "lucide-react";
import Link from "next/link";

type AdminUser = { uid: string; email: string; displayName: string; role: string; disabled: boolean; createdAt: string };

export default function SuperAdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(roles[0].id);

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    if (!user) throw new Error("Sesi login belum siap.");
    const token = await user.getIdToken();
    const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Permintaan gagal.");
    return data;
  }, [user]);

  const loadUsers = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError("");
    try { const data = await request("/api/admin/users"); setRows(data.users ?? []); }
    catch (err) { setError(err instanceof Error ? err.message : "Daftar akun gagal dimuat."); }
    finally { setLoading(false); }
  }, [request, user]);

  useEffect(() => {
    if (!firebaseConfigured || !auth) { setError("Firebase belum dikonfigurasi."); setSessionReady(true); return; }
    return onAuthStateChanged(auth, (current) => {
      if (!current) { window.location.replace("/login"); return; }
      setUser(current); setSessionReady(true);
    });
  }, []);

  useEffect(() => { if (user) void loadUsers(); }, [user, loadUsers]);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      await request("/api/admin/users", { method: "POST", body: JSON.stringify({ displayName: name, email, password, role }) });
      setName(""); setEmail(""); setPassword(""); setShowCreate(false);
      setNotice("Akun berhasil dibuat."); await loadUsers();
    } catch (err) { setError(err instanceof Error ? err.message : "Akun gagal dibuat."); }
    finally { setSaving(false); }
  }

  async function toggleAccount(account: AdminUser) {
    setError(""); setNotice("");
    try {
      await request("/api/admin/users", { method: "PATCH", body: JSON.stringify({ uid: account.uid, disabled: !account.disabled }) });
      setNotice(account.disabled ? "Akun diaktifkan kembali." : "Akun dinonaktifkan."); await loadUsers();
    } catch (err) { setError(err instanceof Error ? err.message : "Status akun gagal diubah."); }
  }

  async function logout() { if (auth) await signOut(auth); window.location.replace("/login"); }

  if (!sessionReady) return <main style={styles.center}><LoaderCircle /> Memeriksa sesi admin...</main>;

  return <main style={styles.page}>
    <header style={styles.header}><Link href="/dashboard" style={styles.back}><ArrowLeft size={17} /> Dashboard</Link><div style={styles.brand}><ShieldCheck size={22} /> Delta <span>Super Admin</span></div><Link href="/super-admin/password-reset" style={styles.secondary}><KeyRound size={16} /> Reset password</Link><button style={styles.secondary} onClick={logout}><LogOut size={16} /> Keluar</button></header>
    <section style={styles.content}>
      <div style={styles.eyebrow}>PENGELOLAAN SISTEM</div><h1 style={styles.title}>Manajemen akun</h1><p style={styles.subtitle}>Kelola akun pengguna dan akses workspace dari satu tempat.</p>
      <div style={styles.summary}><div style={styles.summaryIcon}><UserRound size={21} /></div><div><small>Total akun terdaftar</small><strong>{rows.length}</strong></div><div style={styles.summaryDivider} /><div><small>Akun aktif</small><strong>{rows.filter((item) => !item.disabled).length}</strong></div><button style={styles.primary} onClick={() => setShowCreate(!showCreate)}><Plus size={17} /> Buat akun</button></div>
      {error && <div role="alert" style={styles.error}><CircleAlert size={17} /> {error}</div>}
      {notice && <div role="status" style={styles.success}><CheckCircle2 size={17} /> {notice}</div>}
      {showCreate && <form onSubmit={createAccount} style={styles.form}>
        <h2 style={styles.formTitle}>Buat akun pengguna</h2><div style={styles.fields}>
          <label style={styles.label}>Nama lengkap<input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" /></label>
          <label style={styles.label}>Email<input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
          <label style={styles.label}>Kata sandi awal<input style={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" /><small style={styles.hint}>Minimal 8 karakter. Bagikan secara aman kepada pengguna.</small></label>
          <label style={styles.label}>Profesi<select style={styles.input} value={role} onChange={(e) => setRole(e.target.value)}>{roles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        </div><div style={styles.formActions}><button type="button" style={styles.secondary} onClick={() => setShowCreate(false)}>Batal</button><button type="submit" style={styles.primary} disabled={saving}>{saving ? <LoaderCircle size={16} /> : <Plus size={16} />} Buat akun</button></div>
      </form>}
      <div style={styles.listHead}><h2 style={styles.listTitle}>Semua akun</h2><button style={styles.secondary} onClick={() => void loadUsers()} disabled={loading}><RefreshCw size={15} /> Segarkan</button></div>
      <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={styles.th}>Pengguna</th><th style={styles.th}>Profesi</th><th style={styles.th}>Status</th><th style={styles.th}>Tindakan</th></tr></thead><tbody>
        {rows.map((account) => <tr key={account.uid}><td style={styles.td}><strong style={styles.name}>{account.displayName || "Tanpa nama"}</strong><span style={styles.email}>{account.email || "Email tidak tersedia"}</span></td><td style={styles.td}>{roles.find((item) => item.id === account.role)?.label ?? (account.role === "superadmin" ? "Super Admin" : "Belum diatur")}</td><td style={styles.td}><span style={{ ...styles.status, ...(account.disabled ? styles.statusOff : styles.statusOn) }}>{account.disabled ? "Nonaktif" : "Aktif"}</span></td><td style={styles.td}>{account.uid === user?.uid ? <span style={styles.you}>Akun Anda</span> : <button style={account.disabled ? styles.enable : styles.disable} onClick={() => void toggleAccount(account)}>{account.disabled ? <UserRound size={15} /> : <UserRoundX size={15} />}{account.disabled ? "Aktifkan" : "Nonaktifkan"}</button>}</td></tr>)}
        {!rows.length && <tr><td style={styles.empty} colSpan={4}>{loading ? "Memuat akun..." : "Belum ada akun."}</td></tr>}
      </tbody></table></div>
      <p style={styles.footnote}>Akses Super Admin dibatasi di server berdasarkan UID yang dikonfigurasi. Kata sandi tidak pernah ditampilkan setelah akun dibuat.</p>
    </section>
  </main>;
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f7f8fc", color: "#202438", fontFamily: "Arial, sans-serif" },
  center: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#5d6277" },
  header: { minHeight: 72, padding: "0 5vw", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "#fff", borderBottom: "1px solid #e9ebf2" },
  back: { color: "#5d6277", textDecoration: "none", display: "flex", alignItems: "center", gap: 7, fontSize: 14 },
  brand: { display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: "#5144c9" },
  content: { maxWidth: 1100, margin: "0 auto", padding: "42px 22px 60px" },
  eyebrow: { color: "#7162df", fontWeight: 700, fontSize: 11, letterSpacing: 1.5 },
  title: { margin: "10px 0 8px", fontSize: 32, letterSpacing: -1 },
  subtitle: { color: "#777d90", marginTop: 0, marginBottom: 26 },
  summary: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", background: "#fff", border: "1px solid #e9ebf2", borderRadius: 16, padding: 20, marginBottom: 20 },
  summaryIcon: { background: "#f0edff", color: "#7162df", padding: 13, borderRadius: 12 },
  summaryDivider: { height: 38, width: 1, background: "#e9ebf2", margin: "0 10px" },
  primary: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, marginLeft: "auto", border: 0, borderRadius: 10, background: "#6657d9", color: "#fff", padding: "11px 15px", fontWeight: 700, cursor: "pointer" },
  secondary: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, border: "1px solid #e1e4ee", borderRadius: 9, background: "#fff", color: "#555b70", padding: "9px 12px", cursor: "pointer", textDecoration: "none" },
  error: { display: "flex", gap: 8, alignItems: "center", padding: 13, borderRadius: 10, background: "#fff0f0", color: "#a42d36", marginBottom: 14, fontSize: 14 },
  success: { display: "flex", gap: 8, alignItems: "center", padding: 13, borderRadius: 10, background: "#eaf8f0", color: "#247346", marginBottom: 14, fontSize: 14 },
  form: { background: "#fff", border: "1px solid #e9ebf2", borderRadius: 16, padding: 22, marginBottom: 22 },
  formTitle: { margin: "0 0 18px", fontSize: 18 },
  fields: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 },
  label: { display: "flex", flexDirection: "column", gap: 7, fontSize: 13, fontWeight: 700, color: "#51566b" },
  input: { minWidth: 0, width: "100%", border: "1px solid #dfe2ec", borderRadius: 9, padding: "11px 12px", color: "#202438", background: "#fff", outlineColor: "#7162df" },
  hint: { color: "#858a9b", fontWeight: 400, lineHeight: 1.4 },
  formActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 },
  listHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, margin: "28px 0 12px" },
  listTitle: { fontSize: 19, margin: 0 },
  tableWrap: { overflowX: "auto", background: "#fff", border: "1px solid #e9ebf2", borderRadius: 14 },
  table: { borderCollapse: "collapse", width: "100%", minWidth: 620, textAlign: "left" },
  th: { background: "#fbfbfe", color: "#777d90", fontSize: 11, letterSpacing: 0.5, padding: "13px 16px", borderBottom: "1px solid #e9ebf2" },
  td: { padding: "15px 16px", borderBottom: "1px solid #f0f1f6", fontSize: 13, verticalAlign: "middle" },
  name: { display: "block", fontSize: 14, marginBottom: 4 },
  email: { color: "#83889a", fontSize: 12, overflowWrap: "anywhere" },
  status: { display: "inline-block", borderRadius: 20, padding: "5px 9px", fontSize: 11, fontWeight: 700 },
  statusOn: { background: "#eaf8f0", color: "#247346" },
  statusOff: { background: "#fff0f0", color: "#a42d36" },
  disable: { display: "inline-flex", gap: 6, alignItems: "center", border: "1px solid #f0caca", color: "#a42d36", background: "#fff", padding: "7px 9px", borderRadius: 8, cursor: "pointer" },
  enable: { display: "inline-flex", gap: 6, alignItems: "center", border: "1px solid #bce2cb", color: "#247346", background: "#fff", padding: "7px 9px", borderRadius: 8, cursor: "pointer" },
  you: { color: "#777d90", fontSize: 12 },
  empty: { padding: 28, textAlign: "center", color: "#777d90" },
  footnote: { fontSize: 12, color: "#858a9b", lineHeight: 1.6, marginTop: 18 },
};
