"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowLeft, ArrowUp, Bot, Check, LoaderCircle, MessageSquareText, Sparkles, UserRound } from "lucide-react";
import { auth, firebaseConfigured } from "@/lib/firebase";

type Message = { role: "user" | "model"; text: string };

const suggestions = [
  "Buatkan SOP penerimaan tamu kantor.",
  "Susun agenda rapat mingguan yang efektif.",
  "Bantu ringkas dan analisis catatan workspace saya.",
];

export default function DeltaAiPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setError("Firebase belum dikonfigurasi. Silakan hubungi pengelola workspace.");
      setReady(true);
      return;
    }
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setReady(true);
    });
  }, [router]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function sendMessage(event?: FormEvent<HTMLFormElement>, suggestedText?: string) {
    event?.preventDefault();
    const text = (suggestedText ?? input).trim();
    if (!text || loading || !auth?.currentUser) return;
    setError("");
    setInput("");
    const nextMessages: Message[] = [...messages, { role: "user", text }].slice(-12);
    setMessages(nextMessages);
    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Pesan gagal diproses.");
      setMessages((current) => [...current, { role: "model", text: result.answer }].slice(-12));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke Delta AI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100dvh", background: "#f7f8fc", color: "#202438", padding: "clamp(14px, 3vw, 32px)" }}>
      <div style={{ width: "min(100%, 900px)", margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "calc(100dvh - 2 * clamp(14px, 3vw, 32px))" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 20, borderBottom: "1px solid #e7e9f1" }}>
          <Link href="/dashboard" aria-label="Kembali ke dashboard" style={{ width: 40, height: 40, display: "grid", placeItems: "center", border: "1px solid #e3e6ef", borderRadius: 12, background: "#fff", color: "inherit" }}><ArrowLeft size={19} /></Link>
          <div style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 13, color: "#fff", background: "#7061de" }}><Sparkles size={21} /></div>
          <div style={{ flex: 1, minWidth: 0 }}><h1 style={{ margin: 0, fontSize: 20, letterSpacing: "-.4px" }}>Delta AI Assistant</h1><p style={{ margin: "4px 0 0", color: "#7b8094", fontSize: 13 }}>Asisten kerja untuk workspace-mu</p></div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 9px", borderRadius: 999, background: "#e8f7ee", color: "#23774a", fontSize: 11, fontWeight: 700 }}><span style={{ width: 7, height: 7, borderRadius: 99, background: "#2b9a71" }} /> AI</span>
        </header>

        {!ready ? <div style={{ flex: 1, display: "grid", placeItems: "center", color: "#7b8094" }}><LoaderCircle size={24} /> Menyiapkan sesi...</div> : (
          <>
            <section style={{ flex: 1, padding: "24px 0 16px", display: "flex", flexDirection: "column", gap: 18 }}>
              {!messages.length && <div style={{ margin: "auto 0", textAlign: "center", padding: "28px 0" }}>
                <div style={{ width: 62, height: 62, margin: "0 auto 18px", display: "grid", placeItems: "center", borderRadius: 20, background: "#efedff", color: "#7061de" }}><Bot size={30} /></div>
                <h2 style={{ margin: "0 0 8px", fontSize: "clamp(23px, 5vw, 30px)", letterSpacing: "-.8px" }}>Apa yang bisa gue bantu?</h2>
                <p style={{ maxWidth: 480, margin: "0 auto", color: "#777d91", fontSize: 14, lineHeight: 1.7 }}>Buat draf dokumen, susun rencana kerja, cari ide, atau minta ringkasan catatan workspace yang tersimpan di akunmu.</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 9, marginTop: 24, textAlign: "left" }}>
                  {suggestions.map((suggestion) => <button key={suggestion} type="button" disabled={loading} onClick={() => void sendMessage(undefined, suggestion)} style={{ minHeight: 58, display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", border: "1px solid #e3e6ef", borderRadius: 13, background: "#fff", color: "#42475b", textAlign: "left", lineHeight: 1.45, fontSize: 13 }}>{suggestion}<ArrowUp size={15} style={{ marginLeft: "auto", flexShrink: 0, color: "#7061de" }} /></button>)}
                </div>
              </div>}

              {messages.map((message, index) => <article key={index} style={{ display: "flex", justifyContent: message.role === "user" ? "flex-end" : "flex-start", gap: 10, alignItems: "flex-start" }}>
                {message.role === "model" && <span style={{ flexShrink: 0, width: 32, height: 32, display: "grid", placeItems: "center", borderRadius: 10, background: "#efedff", color: "#7061de" }}><Sparkles size={16} /></span>}
                <div style={{ maxWidth: "min(100%, 680px)", whiteSpace: "pre-wrap", overflowWrap: "anywhere", padding: "13px 15px", borderRadius: 15, background: message.role === "user" ? "#7061de" : "#fff", color: message.role === "user" ? "#fff" : "#34394d", border: message.role === "model" ? "1px solid #e7e9f1" : "1px solid transparent", fontSize: 14, lineHeight: 1.7 }}>{message.text}</div>
                {message.role === "user" && <span style={{ flexShrink: 0, width: 32, height: 32, display: "grid", placeItems: "center", borderRadius: 10, background: "#e9edf5", color: "#586078" }}><UserRound size={16} /></span>}
              </article>)}
              {loading && <div style={{ display: "flex", alignItems: "center", gap: 9, color: "#777d91", fontSize: 13 }}><LoaderCircle size={17} className="delta-ai-spin" /> Delta sedang menyusun jawaban...</div>}
              {error && <div role="alert" style={{ padding: "12px 14px", borderRadius: 12, background: "#fff1f0", color: "#a3332c", fontSize: 13, lineHeight: 1.6 }}>{error}</div>}
              <div ref={scrollRef} />
            </section>

            <form onSubmit={(event) => void sendMessage(event)} style={{ position: "sticky", bottom: 0, padding: "12px 0 max(8px, env(safe-area-inset-bottom))", background: "#f7f8fc" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, padding: 8, border: "1px solid #dfe3ee", borderRadius: 17, background: "#fff", boxShadow: "0 8px 26px #26345b0b" }}>
                <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} rows={2} maxLength={4000} placeholder="Tulis pesan untuk Delta AI..." aria-label="Pesan untuk Delta AI" disabled={!ready || loading || Boolean(error && !auth?.currentUser)} style={{ flex: 1, minWidth: 0, resize: "vertical", maxHeight: 160, border: 0, outline: 0, padding: "9px 10px", background: "transparent", color: "inherit", font: "inherit", fontSize: 14, lineHeight: 1.5 }} />
                <button type="submit" disabled={!input.trim() || loading || !ready} aria-label="Kirim pesan" style={{ width: 42, height: 42, flexShrink: 0, display: "grid", placeItems: "center", border: 0, borderRadius: 12, background: !input.trim() || loading ? "#c9c5ed" : "#7061de", color: "#fff" }}>{loading ? <LoaderCircle size={18} className="delta-ai-spin" /> : <ArrowUp size={20} />}</button>
              </div>
              <p style={{ margin: "9px 4px 0", textAlign: "center", color: "#9297a8", fontSize: 11 }}>Jangan masukkan kata sandi, API key, atau informasi rahasia.</p>
            </form>
          </>
        )}
      </div>
      <style jsx global>{`@keyframes delta-ai-spin { to { transform: rotate(360deg); } } .delta-ai-spin { animation: delta-ai-spin 1s linear infinite; }`}</style>
    </main>
  );
}
