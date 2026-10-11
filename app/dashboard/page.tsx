"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, FileText, LayoutDashboard, Menu, MessageSquareText, Search, Settings2, Sparkles, Users, X, LogOut } from "lucide-react";

const roles = [
  { id: "accountant", label: "Akuntan", english: "Accountants", description: "Laporan, transaksi, dan kepatuhan keuangan", icon: "◈", accent: "violet", modules: ["Overview", "General Ledger", "Financial Reports", "Tax & Compliance", "AI Data Analytics"] },
  { id: "hr", label: "Profesional SDM", english: "HR Professionals", description: "Rekrutmen, karyawan, dan kebijakan", icon: "◎", accent: "blue", modules: ["HR Metrics", "Recruitment (ATS)", "Employee Experience", "Policy Generator"] },
  { id: "sales", label: "Manajer Penjualan", english: "Sales Managers", description: "Pipeline, target, dan tindak lanjut", icon: "↗", accent: "orange", modules: ["Sales Pipeline", "Team Performance", "Smart Follow-ups", "Forecasting & Insights"] },
  { id: "office", label: "Manajer Kantor", english: "Office Managers", description: "Operasional, inventaris, dan jadwal", icon: "▦", accent: "teal", modules: ["Daily Operations", "Facility & Inventory", "Visitor Management", "Schedules & Announcements"] },
  { id: "designer", label: "Desainer", english: "Designers", description: "Ide kreatif, aset, dan persetujuan klien", icon: "✳", accent: "pink", modules: ["Creative Workspace", "AI Idea Generator", "Asset Library", "Client Approvals"] },
  { id: "financier", label: "Ahli Keuangan / Investor", english: "Financiers", description: "Portofolio, skenario, dan penilaian risiko", icon: "⌁", accent: "green", modules: ["Market Data & Portfolio", "Scenario Modeling", "Risk Assessment", "Data-Driven Decisions"] },
  { id: "teacher", label: "Guru / Pengajar", english: "Teachers", description: "Kelas, RPP, tugas, dan materi belajar", icon: "▤", accent: "yellow", modules: ["Classes & Students", "Lesson Plan Creator", "Assignments & Grading", "Interactive Resources"] },
  { id: "consultant", label: "Konsultan", english: "Consultants", description: "Klien, riset industri, dan laporan strategi", icon: "⌘", accent: "indigo", modules: ["Client & Engagement", "Industry Knowledge Base", "Time & Invoicing", "Strategic Reports"] },
  { id: "property", label: "Agen Properti", english: "Real Estate Agents", description: "Listing, calon klien, kunjungan, dan dokumen", icon: "⌂", accent: "cyan", modules: ["Property Listings", "Client CRM & Leads", "Showings Calendar", "Contracts & Documents"] },
] as const;

const stats = [
  { label: "Tugas aktif", value: "12", change: "+2 dari kemarin", up: true },
  { label: "Selesai minggu ini", value: "28", change: "+18% minggu lalu", up: true },
  { label: "Perlu perhatian", value: "04", change: "2 mendekati tenggat", up: false },
];

export default function Home() {
  const router = useRouter();
  const [roleId, setRoleId] = useState<string>("accountant");
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [accountName, setAccountName] = useState("Pengguna");
  const [activeModule, setActiveModule] = useState("Overview");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const role = roles.find((item) => item.id === roleId) ?? roles[0];
  const filteredModules = useMemo(() => role.modules.filter((module) => module.toLowerCase().includes(query.toLowerCase())), [role, query]);

  useEffect(() => {
    if (!firebaseConfigured || !auth || !db) {
      setAuthError("Firebase belum dikonfigurasi. Tambahkan environment variables di Vercel untuk mengaktifkan dashboard.");
      setAuthReady(true);
      return;
    }
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const snapshot = await getDoc(doc(db!, "users", user.uid));
        if (!snapshot.exists()) {
          router.replace("/register");
          return;
        }
        const profile = snapshot.data();
        const allowedRoles = ["accountant", "hr", "sales", "office", "designer", "financier", "teacher", "consultant", "property"];
        if (!allowedRoles.includes(profile.role)) {
          setAuthError("Profesi akun tidak valid. Hubungi pengelola sistem.");
          setAuthReady(true);
          return;
        }
        setRoleId(profile.role);
        setAccountName(typeof profile.displayName === "string" && profile.displayName.trim() ? profile.displayName : user.displayName || "Pengguna");
        setAuthReady(true);
      } catch {
        setAuthError("Profil tidak dapat dimuat. Periksa koneksi dan konfigurasi Firestore.");
        setAuthReady(true);
      }
    });
  }, [router]);

  async function handleLogout() {
    if (auth) await signOut(auth);
    router.replace("/login");
  }

  if (!authReady) return <main className="auth-page"><div className="auth-loading">Menyiapkan ruang kerjamu...</div></main>;
  if (authError) return <main className="auth-page"><section className="auth-card"><div className="auth-icon"><Sparkles size={22} /></div><h1>Dashboard belum siap</h1><p className="auth-description">{authError}</p><a className="auth-submit auth-link-button" href="/login">Kembali ke login</a></section></main>;

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="#" aria-label="Delta Workspace beranda"><span className="brand-mark"><Sparkles size={20} /></span><span>delta<span className="brand-dot">.</span><small>WORKSPACE</small></span></a>
        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switch" onClick={() => setMenuOpen(!menuOpen)}><span className="workspace-avatar">D</span><span className="workspace-copy"><b>Delta Studio</b><small>Personal workspace</small></span><ChevronDown size={16} /></button>
        <div className="nav-caption">MENU UTAMA</div>
        <button className={`nav-item ${activeModule === role.modules[0] ? "active" : ""}`} onClick={() => setActiveModule(role.modules[0])}><LayoutDashboard size={18} /> Ringkasan</button>
        <div className="nav-caption role-caption">DASHBOARD PROFESI <span>9</span></div>
        <div className="role-nav">{roles.filter((item) => item.id === roleId).map((item) => <div key={item.id} className="role-nav-item selected"><span className={`role-symbol ${item.accent}`}>{item.icon}</span><span>{item.label}</span><span className="active-dot" /></div>)}</div>
        <div className="sidebar-bottom"><button className="nav-item" onClick={() => setNotice("Pusat bantuan akan tersedia pada fase berikutnya.")}><CircleHelp size={18} /> Pusat bantuan</button><button className="nav-item" onClick={() => setNotice("Pengaturan workspace belum terhubung.")}><Settings2 size={18} /> Pengaturan</button><div className="profile-mini"><div className="profile-avatar">I</div><div className="profile-copy"><b>{accountName}</b><small>{role.label}</small></div><button className="icon-button" aria-label="Keluar dari akun" onClick={handleLogout}><LogOut size={17} /></button></div></div>
      </aside>
      {menuOpen && <button className="mobile-scrim" aria-label="Tutup menu" onClick={() => setMenuOpen(false)} />}
      <section className="main-area">
        <header className="topbar"><button className="mobile-menu icon-button" aria-label="Buka menu" onClick={() => setMenuOpen(!menuOpen)}><Menu size={21} /></button><div className="breadcrumbs">Workspace <span>/</span> <b>{role.label}</b></div><div className="top-actions"><label className="search-box"><Search size={16} /><input aria-label="Cari modul" placeholder="Cari sesuatu..." value={query} onChange={(e) => setQuery(e.target.value)} /><kbd>⌘ K</kbd></label><button className="icon-button notification-button" aria-label="Notifikasi" onClick={() => setNotice("Belum ada notifikasi baru.")}><Bell size={19} /><i /></button><div className="top-avatar">{accountName.charAt(0).toUpperCase()}</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> RUANG KERJA CERDAS</div><h1>Selamat datang, {accountName} <span className="wave">✳</span></h1><p className="welcome-subtitle">Mari buat hari ini lebih terarah. Ini ringkasan aktivitasmu.</p></div><button className="date-chip"><CalendarDays size={16} /> Minggu ini <ChevronDown size={14} /></button></div>
          <div className="role-banner"><div className={`role-banner-icon ${role.accent}`}>{role.icon}</div><div className="role-banner-copy"><span>DASHBOARD PROFESI</span><h2>{role.label}</h2><p>{role.description}</p></div><div className="role-current-label"><span>PROFESI AKUN</span><b>{role.label}</b></div></div>
          <div className="section-heading"><div><h2>Ringkasan aktivitas</h2><p>Gambaran singkat pekerjaanmu saat ini.</p></div><button className="text-button" onClick={() => setNotice("Semua aktivitas akan tersedia saat modul data terhubung.")}>Lihat aktivitas <ArrowRight size={15} /></button></div>
          <div className="stats-grid">{stats.map((stat, i) => <article className="stat-card" key={stat.label}><div className="stat-top"><span>{stat.label}</span><span className={`stat-icon stat-icon-${i}`}>{i === 0 ? <BriefcaseBusiness size={17} /> : i === 1 ? <Check size={17} /> : <Clock3 size={17} />}</span></div><div className="stat-value">{stat.value}</div><div className={`stat-change ${stat.up ? "positive" : "caution"}`}>{stat.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{stat.change}</div></article>)}</div>
          <div className="section-heading module-heading"><div><h2>Modul {role.label}</h2><p>Pilih area kerja untuk mulai mengelola aktivitas.</p></div><span className="module-count">{filteredModules.length} modul</span></div>
          {filteredModules.length ? <div className="module-grid">{filteredModules.map((module, i) => <button key={module} className={`module-card ${activeModule === module ? "module-active" : ""}`} onClick={() => { setActiveModule(module); setNotice(`Modul “${module}” dipilih. Integrasi data dan AI akan ditambahkan bertahap.`); }}><span className={`module-icon ${role.accent}`}>{i === 0 ? <Activity size={20} /> : i === 1 ? <FileText size={20} /> : i === 2 ? <Users size={20} /> : <MessageSquareText size={20} />}</span><span className="module-copy"><b>{module}</b><small>{moduleDescription(module)}</small></span><ArrowRight size={17} className="module-arrow" /></button>)}</div> : <div className="empty-state">Tidak ada modul yang cocok dengan “{query}”.</div>}
          <div className="ai-panel"><div className="ai-orb"><Sparkles size={21} /></div><div className="ai-copy"><span>DELTA AI ASSISTANT</span><h3>Butuh bantuan menyelesaikan sesuatu?</h3><p>Asisten AI akan membantumu menyusun ide, menganalisis informasi, dan mempercepat pekerjaan.</p></div><button className="ai-button" onClick={() => setNotice("Asisten AI akan diaktifkan setelah penyedia AI dan backend dikonfigurasi.")}>Jelajahi AI <ArrowRight size={16} /></button><div className="ai-decoration" /></div>
          <footer className="footer"><span>© 2026 Delta Workspace</span><span>Dibuat untuk bekerja lebih cerdas.</span></footer>
        </div>
      </section>
      {notice && <div className="toast" role="status"><span className="toast-check"><Check size={16} /></span><span>{notice}</span><button aria-label="Tutup pesan" onClick={() => setNotice("")}><X size={16} /></button></div>}
    </main>
  );
}

function moduleDescription(module: string) {
  const descriptions: Record<string, string> = {
    "Overview": "Ringkasan kondisi dan aktivitas terkini", "General Ledger": "Catat dan telusuri transaksi keuangan", "Financial Reports": "Siapkan laporan keuangan terstruktur", "Tax & Compliance": "Pantau kewajiban dan kepatuhan", "AI Data Analytics": "Temukan pola dan wawasan dari data",
    "HR Metrics": "Pantau statistik dan tren karyawan", "Recruitment (ATS)": "Kelola kandidat dari awal hingga wawancara", "Employee Experience": "Cuti, survei, dan kinerja karyawan", "Policy Generator": "Susun draf kebijakan dan SOP",
    "Sales Pipeline": "Pantau prospek hingga closing", "Team Performance": "Lihat target dan pencapaian tim", "Smart Follow-ups": "Atur pengingat dan tindak lanjut", "Forecasting & Insights": "Analisis tren pendapatan", "Daily Operations": "Atur tugas dan kalender operasional", "Facility & Inventory": "Kelola inventaris dan pemeliharaan", "Visitor Management": "Catat kunjungan dan tamu", "Schedules & Announcements": "Atur ruang rapat dan pengumuman",
    "Creative Workspace": "Kelola proyek kreatif aktif", "AI Idea Generator": "Kembangkan ide dan moodboard", "Asset Library": "Kelola aset desain terpusat", "Client Approvals": "Catat revisi dan persetujuan klien", "Market Data & Portfolio": "Pantau data pasar dan portofolio", "Scenario Modeling": "Simulasikan beberapa skenario finansial", "Risk Assessment": "Evaluasi indikator risiko", "Data-Driven Decisions": "Bandingkan opsi berdasarkan data",
    "Classes & Students": "Kelola kelas dan perkembangan siswa", "Lesson Plan Creator": "Susun rencana pelajaran", "Assignments & Grading": "Atur tugas, kuis, dan rubrik", "Interactive Resources": "Siapkan materi belajar adaptif", "Client & Engagement": "Kelola klien dan proyek konsultasi", "Industry Knowledge Base": "Rangkum riset dan referensi industri", "Time & Invoicing": "Catat waktu dan tagihan", "Strategic Reports": "Susun laporan dan rekomendasi strategi",
    "Property Listings": "Kelola foto dan spesifikasi properti", "Client CRM & Leads": "Catat calon pembeli dan penyewa", "Showings Calendar": "Atur jadwal kunjungan lokasi", "Contracts & Documents": "Kelola penawaran dan dokumen properti"
  };
  return descriptions[module] ?? "Kelola pekerjaan dalam satu ruang kerja";
}
