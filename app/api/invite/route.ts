import { NextRequest, NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/server/admin";

const ALLOWED_INVITE_ROLES = new Set(["brand", "store", "moderator"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { supabaseAdmin } = await requireAdminFromRequest(req);
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const roleType = typeof body.role_type === "string" ? body.role_type.trim() : "";
    const company = typeof body.company === "string" ? body.company.trim() : "";

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    if (!ALLOWED_INVITE_ROLES.has(roleType)) {
      return NextResponse.json({ error: "Invalid invite role" }, { status: 400 });
    }

    if (company.length > 200) {
      return NextResponse.json({ error: "Company name is too long" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { invited_as: roleType, company: company || null },
      redirectTo: `${siteUrl}/`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user_id: data.user?.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
