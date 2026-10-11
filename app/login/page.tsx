"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { auth, db, firebaseConfigured } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!firebaseConfigured || !auth || !db) {
      setError("Firebase belum dikonfigurasi. Admin perlu mengisi environment variables di Vercel.");
      return;
    }
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const profile = await getDoc(doc(db, "users", credential.user.uid));
      if (!profile.exists()) {
        const token = await credential.user.getIdToken();
        const bootstrap = await fetch("/api/admin/bootstrap", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (bootstrap.ok) {
          router.replace("/super-admin");
          return;
        }
        router.replace("/register");
        return;
      }
      router.replace(profile.data().role === "superadmin" ? "/super-admin" : "/dashboard");
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found"
        ? "Email atau kata sandi tidak cocok."
        : code === "auth/too-many-requests"
          ? "Terlalu banyak percobaan. Coba lagi beberapa saat."
          : "Login gagal. Periksa koneksi dan konfigurasi Firebase.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-page"><div className="auth-decoration auth-decoration-one" /><div className="auth-decoration auth-decoration-two" />
    <Link className="auth-brand" href="/"><span className="brand-mark"><Sparkles size={20} /></span><span>delta<span className="brand-dot">.</span><small>WORKSPACE</small></span></Link>
    <section className="auth-card"><div className="auth-icon"><LockKeyhole size={22} /></div><div className="auth-eyebrow">SELAMAT DATANG KEMBALI</div><h1>Masuk ke ruang kerjamu</h1><p className="auth-description">Lanjutkan pekerjaanmu dari satu ruang kerja yang terarah.</p>
      <form onSubmit={handleSubmit} className="auth-form"><label>Email</label><div className="auth-input-wrap"><Mail size={17} /><input type="email" autoComplete="email" placeholder="nama@perusahaan.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div><label>Kata sandi</label><div className="auth-input-wrap"><LockKeyhole size={17} /><input type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Masukkan kata sandi" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /><button type="button" className="password-toggle" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
        {error && <div className="auth-error" role="alert">{error}</div>}<button className="auth-submit" type="submit" disabled={loading}>{loading ? "Memeriksa akun..." : "Masuk"} {!loading && <ArrowRight size={17} />}</button></form>
      <div className="auth-switch">Belum punya akun? <Link href="/register">Buat akun</Link></div><div className="auth-footnote">Akses aman untuk ruang kerjamu.</div>
    </section><footer className="auth-footer">© 2026 Delta Workspace</footer>
  </main>;
}
