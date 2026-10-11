"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Mail, ShieldCheck, Sparkles } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Permintaan gagal dikirim.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permintaan gagal dikirim. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-page">
    <div className="auth-decoration auth-decoration-one" /><div className="auth-decoration auth-decoration-two" />
    <Link className="auth-brand" href="/"><span className="brand-mark"><Sparkles size={20} /></span><span>delta<span className="brand-dot">.</span><small>WORKSPACE</small></span></Link>
    <section className="auth-card">
      <div className="auth-icon"><KeyRound size={22} /></div>
      <div className="auth-eyebrow">PEMULIHAN AKUN</div>
      <h1>Lupa kata sandi?</h1>
      <p className="auth-description">Ajukan pemulihan akun. Super Admin akan memeriksa dan menyetujui permintaan sebelum tautan reset dibuat.</p>
      {sent ? <div role="status" className="auth-success"><CheckCircle2 size={18} /> Permintaan telah diterima jika email cocok dengan akun Delta. Tunggu pemeriksaan Super Admin sebelum menerima tautan pemulihan.</div> :
        <form onSubmit={submit} className="auth-form">
          <label>Email akun</label><div className="auth-input-wrap"><Mail size={17} /><input type="email" autoComplete="email" placeholder="nama@perusahaan.com" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} /></div>
          <label>Alasan permintaan <span className="label-note">Opsional</span></label><textarea className="auth-textarea" placeholder="Contoh: lupa kata sandi dan tidak bisa masuk." value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Mengirim permintaan..." : "Ajukan pemulihan"} {!loading && <ShieldCheck size={17} />}</button>
        </form>}
      <div className="auth-switch"><Link href="/login"><ArrowLeft size={14} style={{ display: "inline", verticalAlign: "middle" }} /> Kembali ke login</Link></div>
      <div className="auth-footnote">Tautan reset hanya dibuat setelah persetujuan Super Admin.</div>
    </section><footer className="auth-footer">© 2026 Delta Workspace</footer>
  </main>;
}
