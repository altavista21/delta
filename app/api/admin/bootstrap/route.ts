import { NextResponse } from "next/server";
import { adminAuth, adminDb, requireSuperAdmin } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

    const user = await adminAuth().getUser(admin.uid);
    const ref = adminDb().collection("users").doc(admin.uid);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      await ref.create({
        uid: admin.uid,
        email: user.email ?? "",
        displayName: user.displayName || "Super Admin",
        role: "superadmin",
        createdAt: new Date(),
      });
    } else if (snapshot.get("role") !== "superadmin") {
      return NextResponse.json({ error: "Profil akun admin tidak cocok. Hubungi pengelola sistem." }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bootstrap gagal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
