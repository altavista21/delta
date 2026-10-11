import { NextResponse } from "next/server";
import { adminAuth, adminDb, requireSuperAdmin } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    const snapshot = await adminDb().collection("passwordResetRequests")
      .orderBy("createdAt", "desc").limit(100).get();
    const requests = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        email: String(data.email ?? ""),
        reason: String(data.reason ?? ""),
        status: String(data.status ?? "pending"),
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? "",
        reviewedAt: data.reviewedAt?.toDate?.()?.toISOString?.() ?? "",
      };
    });
    return NextResponse.json({ requests });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Permintaan gagal dimuat." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    const action = body.action;
    if (!id || !["approve", "reject", "reissue"].includes(action)) {
      return NextResponse.json({ error: "Permintaan atau tindakan tidak valid." }, { status: 400 });
    }

    const db = adminDb();
    const ref = db.collection("passwordResetRequests").doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return NextResponse.json({ error: "Permintaan tidak ditemukan." }, { status: 404 });
    const data = snapshot.data()!;
    const status = String(data.status ?? "pending");

    if (action === "reject") {
      if (status !== "pending") return NextResponse.json({ error: "Hanya permintaan yang menunggu dapat ditolak." }, { status: 409 });
      await ref.update({ status: "rejected", reviewedAt: new Date(), reviewedBy: admin.uid });
      return NextResponse.json({ ok: true });
    }

    if (action === "approve" && status !== "pending") {
      return NextResponse.json({ error: "Permintaan ini sudah diproses." }, { status: 409 });
    }
    if (action === "reissue" && status !== "approved") {
      return NextResponse.json({ error: "Tautan hanya dapat dibuat ulang untuk permintaan yang disetujui." }, { status: 409 });
    }

    const email = String(data.email ?? "");
    const account = await adminAuth().getUserByEmail(email);
    if (account.disabled) return NextResponse.json({ error: "Akun sedang dinonaktifkan. Aktifkan akun terlebih dahulu." }, { status: 409 });
    const resetLink = await adminAuth().generatePasswordResetLink(email);
    await ref.update({
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: admin.uid,
      linkGeneratedAt: new Date(),
    });
    return NextResponse.json({
      ok: true,
      resetLink,
      message: action === "reissue" ? "Tautan pemulihan baru dibuat. Tautan sebelumnya sebaiknya tidak digunakan." : "Permintaan disetujui. Salin tautan dan kirim secara pribadi kepada pengguna.",
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    const message = code === "auth/user-not-found"
      ? "Akun dengan email tersebut tidak ditemukan."
      : error instanceof Error ? error.message : "Permintaan gagal diproses.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
