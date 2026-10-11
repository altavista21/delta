"use client";

import { useEffect, useState } from "react";
import { CircleHelp, Settings2, X, Search, Mail, BookOpen, Bell, Check, RotateCcw } from "lucide-react";

type Panel = "help" | "settings" | null;
type Preferences = { emailUpdates: boolean; taskReminders: boolean; productTips: boolean; compactView: boolean };

const defaults: Preferences = { emailUpdates: true, taskReminders: true, productTips: false, compactView: false };

export default function WorkspaceTools({ variant = "sidebar" }: { variant?: "sidebar" | "inline" }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [query, setQuery] = useState("");
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("delta-workspace-preferences");
      if (raw) setPrefs({ ...defaults, ...JSON.parse(raw) });
    } catch { /* Use defaults when browser storage is unavailable. */ }
  }, []);

  const faqs = [
    { q: "Bagaimana cara menyimpan data?", a: "Buka modul profesi, isi formulir Tambah data, lalu tekan Simpan data. Catatan yang berhasil disimpan akan muncul pada bagian Data tersimpan." },
    { q: "Siapa yang dapat melihat data saya?", a: "Catatan workspace ditampilkan untuk akun pemiliknya. Gunakan akun pribadi dan jangan bagikan kata sandi atau kode masuk." },
    { q: "Bagaimana cara mengubah atau menghapus catatan?", a: "Saat ini modul menyediakan aksi hapus pada setiap catatan. Untuk mengubah isi catatan, buat catatan baru dengan informasi yang benar lalu hapus catatan lama." },
    { q: "Mengapa modul tidak bisa dibuka?", a: "Pastikan Anda masuk dengan akun yang profesinya sesuai dengan modul tersebut. Muat ulang halaman dan periksa koneksi internet jika masalah berlanjut." },
    { q: "Bagaimana mengelola akun?", a: "Keluar menggunakan tombol di samping profil, lalu masuk kembali dengan akun yang benar. Pengaturan di panel ini menyimpan preferensi tampilan dan pemberitahuan di perangkat ini." },
  ];
  const filteredFaqs = faqs.filter((item) => (item.q + " " + item.a).toLowerCase().includes(query.toLowerCase()));

  function savePreferences() {
    try {
      localStorage.setItem("delta-workspace-preferences", JSON.stringify(prefs));
      document.documentElement.dataset.deltaDensity = prefs.compactView ? "compact" : "comfortable";
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaved(false);
    }
  }

  function resetPreferences() {
    setPrefs(defaults);
    try {
      localStorage.setItem("delta-workspace-preferences", JSON.stringify(defaults));
      document.documentElement.dataset.deltaDensity = "comfortable";
    } catch { /* Keep the in-memory defaults. */ }
    setSaved(true);
  }

  function sendFeedback() {
    if (!feedback.trim()) return;
    const subject = encodeURIComponent("Masukan Delta Workspace");
    const body = encodeURIComponent(feedback.trim());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setFeedbackSent(true);
  }

  return (
    <>
      <div style={variant === "inline" ? { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } : { display: "grid", gap: 2 }}>
        <button className={variant === "inline" ? "module-back" : "nav-item"} type="button" onClick={() => { setPanel("help"); setQuery(""); }}><CircleHelp size={18} /> Pusat bantuan</button>
        <button className={variant === "inline" ? "module-back" : "nav-item"} type="button" onClick={() => { setPanel("settings"); setSaved(false); }}><Settings2 size={18} /> Pengaturan</button>
      </div>
      {panel && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPanel(null); }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <section role="dialog" aria-modal="true" aria-labelledby="workspace-tools-title" style={{ width: "min(100%, 560px)", maxHeight: "min(85dvh, 760px)", overflowY: "auto", background: "var(--panel, #fff)", color: "var(--foreground, #172033)", border: "1px solid #e5e7eb", borderRadius: 18, boxShadow: "0 24px 80px rgba(15,23,42,.25)", padding: 22 }}>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 12, background: "#e9f5ef", color: "#247346" }}>{panel === "help" ? <BookOpen size={21} /> : <Settings2 size={21} />}</span>
              <div><h2 id="workspace-tools-title" style={{ margin: 0, fontSize: 20, fontWeight: 750 }}>{panel === "help" ? "Pusat bantuan" : "Pengaturan workspace"}</h2><p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{panel === "help" ? "Panduan singkat menggunakan Delta" : "Preferensi tersimpan di perangkat ini"}</p></div>
            </div>
            <button type="button" aria-label="Tutup panel" onClick={() => setPanel(null)} style={{ border: 0, background: "transparent", padding: 8, borderRadius: 9, cursor: "pointer" }}><X size={20} /></button>
          </header>
          {panel === "help" ? <div>
            <label style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", border: "1px solid #dbe2ea", borderRadius: 10, marginBottom: 14 }}><Search size={17} color="#64748b" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari bantuan..." aria-label="Cari pertanyaan bantuan" style={{ border: 0, outline: 0, width: "100%", background: "transparent", color: "inherit", fontSize: 14 }} /></label>
            <div style={{ display: "grid", gap: 10 }}>{filteredFaqs.map((item) => <details key={item.q} style={{ padding: "13px 14px", border: "1px solid #e5e7eb", borderRadius: 11 }}><summary style={{ cursor: "pointer", fontWeight: 650, fontSize: 14 }}>{item.q}</summary><p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.65, margin: "10px 0 0" }}>{item.a}</p></details>)}
              {!filteredFaqs.length && <p style={{ color: "#64748b", fontSize: 14 }}>Tidak ada panduan yang cocok. Coba kata kunci lain.</p>}</div>
            <div style={{ marginTop: 18, padding: 14, background: "#f8fafc", borderRadius: 12 }}><h3 style={{ margin: "0 0 6px", fontSize: 14 }}>Masih butuh bantuan?</h3><p style={{ margin: "0 0 10px", color: "#64748b", fontSize: 13 }}>Tulis masukan atau jelaskan kendala yang kamu temui.</p><textarea value={feedback} onChange={(e) => { setFeedback(e.target.value); setFeedbackSent(false); }} rows={3} maxLength={1500} placeholder="Ceritakan kendalamu..." style={{ width: "100%", boxSizing: "border-box", resize: "vertical", border: "1px solid #dbe2ea", borderRadius: 9, padding: 10, font: "inherit", fontSize: 13, background: "#fff", color: "#172033" }} /><button type="button" onClick={sendFeedback} disabled={!feedback.trim()} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 9, border: 0, borderRadius: 9, padding: "10px 13px", background: "#247346", color: "white", fontWeight: 650, cursor: feedback.trim() ? "pointer" : "not-allowed", opacity: feedback.trim() ? 1 : .55 }}><Mail size={16} /> Buka aplikasi email</button>{feedbackSent && <p role="status" style={{ fontSize: 12, color: "#247346" }}>Aplikasi email dibuka jika tersedia. Pilih alamat tujuan sebelum mengirim.</p>}</div>
          </div> : <div>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>Preferensi pemberitahuan</h3>
            {([
              ["emailUpdates", "Pembaruan melalui email", "Informasi pembaruan produk"],
              ["taskReminders", "Pengingat tugas", "Preferensi untuk pengingat pekerjaan"],
              ["productTips", "Tips penggunaan", "Panduan fitur dan produktivitas"],
            ] as const).map(([key, title, description]) => <label key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 0", borderBottom: "1px solid #edf0f4", cursor: "pointer" }}><span><b style={{ display: "block", fontSize: 14 }}>{title}</b><small style={{ display: "block", color: "#64748b", marginTop: 4, fontSize: 12 }}>{description}</small></span><input type="checkbox" checked={prefs[key]} onChange={(e) => setPrefs((old) => ({ ...old, [key]: e.target.checked }))} style={{ width: 18, height: 18, accentColor: "#247346", flexShrink: 0 }} /></label>)}
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 0", cursor: "pointer" }}><span><b style={{ display: "block", fontSize: 14 }}>Tampilan ringkas</b><small style={{ display: "block", color: "#64748b", marginTop: 4, fontSize: 12 }}>Simpan preferensi untuk tampilan lebih padat</small></span><input type="checkbox" checked={prefs.compactView} onChange={(e) => setPrefs((old) => ({ ...old, compactView: e.target.checked }))} style={{ width: 18, height: 18, accentColor: "#247346", flexShrink: 0 }} /></label>
            <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>Preferensi pemberitahuan disimpan sebagai pilihan pengguna. Pengiriman notifikasi email/pengingat otomatis belum diaktifkan di backend.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 16 }}><button type="button" onClick={savePreferences} style={{ border: 0, borderRadius: 9, padding: "11px 15px", background: "#247346", color: "white", fontWeight: 650, cursor: "pointer" }}>{saved ? <><Check size={15} style={{ verticalAlign: "middle" }} /> Tersimpan</> : "Simpan pengaturan"}</button><button type="button" onClick={resetPreferences} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "1px solid #dbe2ea", borderRadius: 9, padding: "10px 13px", background: "transparent", color: "inherit", cursor: "pointer" }}><RotateCcw size={15} /> Pulihkan default</button></div>
          </div>}
        </section>
      </div>}
      <style jsx global>{`
        html[data-delta-density="compact"] .module-record { padding-top: 10px !important; padding-bottom: 10px !important; }
        html[data-delta-density="compact"] .module-panel { gap: 12px !important; }
        html[data-delta-density="compact"] .module-content { gap: 12px !important; }
        html[data-delta-density="comfortable"] .module-record { }
      `}</style>
    </>
  );
}
