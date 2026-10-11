import { createHash } from "node:crypto";
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Masukkan alamat email yang valid." }, { status: 400 });
    }

    // Keep the public response identical whether or not the account exists.
    try {
      const account = await adminAuth().getUserByEmail(email);
      if (!account.disabled) {
        const db = adminDb();
        const pending = await db.collection("passwordResetRequests")
          .where("email", "==", email).where("status", "==", "pending").limit(1).get();
        if (pending.empty) {
          await db.collection("passwordResetRequests").add({
            email,
            uid: account.uid,
            reason,
            status: "pending",
            createdAt: new Date(),
          });
        }
      }
    } catch (error) {
      if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
    }

    return NextResponse.json({ ok: true, message: "Jika akun cocok, permintaan akan diteruskan kepada Super Admin." });
  } catch {
    return NextResponse.json({ error: "Permintaan belum dapat diproses. Coba lagi nanti." }, { status: 500 });
  }
}
