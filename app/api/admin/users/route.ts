import { NextResponse } from "next/server";
import { adminAuth, adminDb, requireSuperAdmin } from "@/lib/firebase-admin";
import { isRoleId } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    const [authResult, profiles] = await Promise.all([
      adminAuth().listUsers(1000),
      adminDb().collection("users").get(),
    ]);
    const profileByUid = new Map(profiles.docs.map((doc) => [doc.id, doc.data()]));
    const users = authResult.users.map((user) => {
      const profile = profileByUid.get(user.uid);
      return {
        uid: user.uid,
        email: user.email ?? "",
        displayName: user.displayName ?? profile?.displayName ?? "",
        role: typeof profile?.role === "string" ? profile.role : "unassigned",
        disabled: user.disabled,
        createdAt: user.metadata.creationTime ?? "",
      };
    });
    return NextResponse.json({ users, nextPageToken: authResult.pageToken ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Daftar akun gagal dimuat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const role = typeof body.role === "string" ? body.role : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    }
    if (password.length < 8) return NextResponse.json({ error: "Kata sandi minimal 8 karakter." }, { status: 400 });
    if (!displayName || displayName.length > 80) return NextResponse.json({ error: "Nama wajib diisi (maksimal 80 karakter)." }, { status: 400 });
    if (!isRoleId(role)) return NextResponse.json({ error: "Profesi tidak valid." }, { status: 400 });

    const user = await adminAuth().createUser({ email, password, displayName, emailVerified: false, disabled: false });
    try {
      await adminDb().collection("users").doc(user.uid).create({
        uid: user.uid, email, displayName, role, createdAt: new Date(),
      });
    } catch (error) {
      await adminAuth().deleteUser(user.uid).catch(() => undefined);
      throw error;
    }
    return NextResponse.json({ ok: true, uid: user.uid }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string }).code;
    const message = code === "auth/email-already-exists"
      ? "Email tersebut sudah terdaftar."
      : error instanceof Error ? error.message : "Pembuatan akun gagal.";
    return NextResponse.json({ error: message }, { status: code === "auth/email-already-exists" ? 409 : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    const body = await request.json();
    const uid = typeof body.uid === "string" ? body.uid : "";
    const disabled = body.disabled;
    if (!uid || typeof disabled !== "boolean") {
      return NextResponse.json({ error: "UID dan status akun wajib diisi." }, { status: 400 });
    }
    if (uid === admin.uid) return NextResponse.json({ error: "Akun Super Admin tidak dapat dinonaktifkan dari halaman ini." }, { status: 400 });
    await adminAuth().updateUser(uid, { disabled });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Status akun gagal diubah.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
