// src/middleware.ts
// Handles old username redirects.
// When /profile/[username] returns no user, checks username_history
// and redirects to the new username with a 301 permanent redirect.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only handle /profile/[username] routes
  if (!pathname.startsWith('/profile/')) return NextResponse.next()

  const parts = pathname.split('/')
  // Must be exactly /profile/username — not /profile/username/something
  if (parts.length !== 3) return NextResponse.next()

  const username = parts[2]
  if (!username) return NextResponse.next()

  // Check if this username currently exists in users table
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  // Username exists — let Next.js handle it normally
  if (user) return NextResponse.next()

  // Username not found — check history for a redirect
  const { data: history } = await supabase
    .from('username_history')
    .select('new_username')
    .eq('old_username', username)
    .order('changed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (history?.new_username) {
    // 301 permanent redirect to new username
    const newUrl = request.nextUrl.clone()
    newUrl.pathname = `/profile/${history.new_username}`
    return NextResponse.redirect(newUrl, { status: 301 })
  }

  // Not in history either — let it 404 naturally
  return NextResponse.next()
}

export const config = {
  matcher: '/profile/:username*',
}
