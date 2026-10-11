"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, onAuthStateChanged, updateProfile, User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { ArrowRight, BriefcaseBusiness, Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import { roles, RoleId, isRoleId } from "@/lib/roles";

export default function RegisterPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleId>("accountant");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth || !db) { setCheckingSession(false); return; }
    return onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await getDoc(doc(db!, "users", user.uid));
        if (profile.exists()) router.replace("/dashboard");
      }
      setCheckingSession(false);
    });
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!firebaseConfigured || !auth || !db) {
      setError("Firebase belum dikonfigurasi. Admin perlu mengisi environment variables di Vercel.");
      return;
    }
    if (!isRoleId(role)) { setError("Pilih profesi yang tersedia."); return; }
    setLoading(true);
    try {
      let user = currentUser;
      if (!user) {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        user = credential.user;
        await updateProfile(user, { displayName: name.trim() });
      }
      const existing = await getDoc(doc(db, "users", user.uid));
      if (existing.exists()) {
        setError("Profil akun sudah ada. Silakan masuk.");
        router.replace("/dashboard");
        return;
      }
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: currentUser?.displayName || name.trim(),
        role,
        createdAt: serverTimestamp(),
      });
      router.replace("/dashboard");
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(code === "auth/email-already-in-use" ? "Email ini sudah terdaftar. Silakan masuk."
        : code === "auth/weak-password" ? "Kata sandi terlalu lemah. Gunakan minimal 6 karakter."
        : code === "auth/invalid-email" ? "Format email tidak valid."
        : code === "permission-denied" ? "Firestore menolak penyimpanan profil. Pastikan Firestore Rules sudah diterapkan."
        : "Pendaftaran gagal. Periksa koneksi dan konfigurasi Firebase.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) return <main className="auth-page"><div className="auth-loading">Menyiapkan ruang kerja...</div></main>;

  return <main className="auth-page"><div className="auth-decoration auth-decoration-one" /><div className="auth-decoration auth-decoration-two" />
    <Link className="auth-brand" href="/"><span className="brand-mark"><Sparkles size={20} /></span><span>delta<span className="brand-dot">.</span><small>WORKSPACE</small></span></Link>
    <section className="auth-card register-card"><div className="auth-icon"><BriefcaseBusiness size={22} /></div><div className="auth-eyebrow">MULAI DENGAN DELTA</div><h1>{currentUser ? "Pilih profesi utamamu" : "Buat ruang kerjamu"}</h1><p className="auth-description">{currentUser ? "Satu langkah lagi untuk menyiapkan dashboard sesuai pekerjaanmu." : "Buat akun dan pilih dashboard yang paling sesuai dengan pekerjaanmu."}</p>
      <form onSubmit={handleSubmit} className="auth-form">
        {!currentUser && <><label>Nama lengkap</label><div className="auth-input-wrap"><UserRound size={17} /><input autoComplete="name" placeholder="Nama yang ingin ditampilkan" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></div><label>Email</label><div className="auth-input-wrap"><Mail size={17} /><input type="email" autoComplete="email" placeholder="nama@perusahaan.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div><label>Kata sandi <span className="label-note">Minimal 6 karakter</span></label><div className="auth-input-wrap"><LockKeyhole size={17} /><input type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Buat kata sandi" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /><button type="button" className="password-toggle" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></>}
        <label>Profesi utama</label><div className="auth-input-wrap role-input"><BriefcaseBusiness size={17} /><select value={role} onChange={(e) => setRole(e.target.value as RoleId)} required aria-label="Pilih profesi">{roles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div><p className="role-hint">Dashboard akan menampilkan modul yang relevan dengan profesi pilihanmu.</p>
        {error && <div className="auth-error" role="alert">{error}</div>}<button className="auth-submit" type="submit" disabled={loading || !firebaseConfigured}>{loading ? "Membuat akun..." : currentUser ? "Simpan profesi" : "Buat akun"} {!loading && <ArrowRight size={17} />}</button>
        {!firebaseConfigured && <p className="config-note">Konfigurasi Firebase belum tersedia. Form akan aktif setelah environment variables ditambahkan.</p>}
      </form>
      {!currentUser && <div className="auth-switch">Sudah punya akun? <Link href="/login">Masuk</Link></div>}<div className="auth-footnote">Data akun digunakan untuk mengatur ruang kerjamu.</div>
    </section><footer className="auth-footer">© 2026 Delta Workspace</footer>
  </main>;
}
