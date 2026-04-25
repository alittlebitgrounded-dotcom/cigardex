import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

const ADMIN_ROLES = new Set(["super_admin", "moderator"]);

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function createSupabaseAdminClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function requireAdminFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    throw new Error("Unauthorized");
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !ADMIN_ROLES.has(profile.role)) {
    throw new Error("Forbidden");
  }

  return { supabaseAdmin, user, role: profile.role };
}
