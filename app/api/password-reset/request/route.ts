import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const attempts = new Map<string, { count: number; expiresAt: number }>();

export async function POST(request: Request) {
  try {
    const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    const now = Date.now();
    const entry = attempts.get(ip);
    if (entry && entry.expiresAt > now && entry.count >= 5) {
      return NextResponse.json({ ok: true, message: "Jika akun cocok, permintaan akan diteruskan kepada Super Admin." });
    }
    if (!entry || entry.expiresAt <= now) attempts.set(ip, { count: 1, expiresAt: now + 15 * 60 * 1000 });
    else entry.count += 1;

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Masukkan alamat email yang valid." }, { status: 400 });
    }

    // Always record a valid request so it is visible to Super Admin.
    // Do not disclose whether an email belongs to an account on this public endpoint.
    const db = adminDb();
    const pending = await db.collection("passwordResetRequests")
      .where("email", "==", email).limit(10).get();
    const hasPending = pending.docs.some((doc) => doc.get("status") === "pending");

    if (!hasPending) {
      let uid: string | undefined;
      try {
        const account = await adminAuth().getUserByEmail(email);
        uid = account.uid;
      } catch (error) {
        if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
      }

      await db.collection("passwordResetRequests").add({
        email,
        ...(uid ? { uid } : {}),
        reason,
        status: "pending",
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ ok: true, message: "Permintaan telah dicatat dan akan diperiksa oleh Super Admin." });
  } catch {
    return NextResponse.json({ error: "Permintaan belum dapat diproses. Coba lagi nanti." }, { status: 500 });
  }
}
