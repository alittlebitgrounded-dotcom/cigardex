import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/profile/")) {
    return NextResponse.next();
  }

  const parts = pathname.split("/");

  if (parts.length !== 3) {
    return NextResponse.next();
  }

  const username = decodeURIComponent(parts[2] ?? "");

  if (!username || !supabaseUrl || !supabaseKey) {
    return NextResponse.next();
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (!userError && user) {
    return NextResponse.next();
  }

  const { data: history } = await supabase
    .from("username_history")
    .select("new_username")
    .eq("old_username", username)
    .order("changed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (history?.new_username) {
    const newUrl = request.nextUrl.clone();
    newUrl.pathname = `/profile/${history.new_username}`;
    return NextResponse.redirect(newUrl, { status: 301 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/profile/:username*",
};
