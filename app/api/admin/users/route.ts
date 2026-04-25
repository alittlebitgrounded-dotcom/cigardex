import { NextRequest, NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/server/admin";

const ALLOWED_ROLES = new Set([
  "registered",
  "premium",
  "brand",
  "store",
  "moderator",
  "super_admin",
]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { supabaseAdmin } = await requireAdminFromRequest(req);
    const body = await req.json();

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = typeof body.role === "string" ? body.role.trim() : "registered";

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    if (!USERNAME_RE.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3-32 characters using letters, numbers, or underscores" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with that username or email already exists" },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Could not create user" },
        { status: 400 }
      );
    }

    const { error: profileError } = await supabaseAdmin.from("users").insert({
      id: data.user.id,
      username,
      email,
      role,
      tier: "free",
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: { id: data.user.id, email, username, role },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
