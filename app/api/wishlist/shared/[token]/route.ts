import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/server/admin'

type RouteContext = {
  params: Promise<{ token: string }>
}

function normalizePrivacy(privacy?: {
  wishlistShareLinkEnabled?: boolean
  wishlistShowRealNameOnLink?: boolean
  wishlistShareToken?: string
} | null) {
  return {
    wishlistShareLinkEnabled: privacy?.wishlistShareLinkEnabled ?? false,
    wishlistShowRealNameOnLink: privacy?.wishlistShowRealNameOnLink ?? false,
    wishlistShareToken: privacy?.wishlistShareToken ?? null,
  }
}

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { token } = await params
    const supabaseAdmin = createSupabaseAdminClient()

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, username, first_name, last_name, privacy')
      .contains('privacy', { wishlistShareToken: token, wishlistShareLinkEnabled: true })
      .limit(1)

    if (profileError || !profiles || profiles.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const profile = profiles[0]
    const privacy = normalizePrivacy(profile.privacy)

    if (!privacy.wishlistShareLinkEnabled || privacy.wishlistShareToken !== token) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('wishlist_items')
      .select('id, added_at, cigars(id, name, line, vitola, strength, wrapper_origin, wrapper_color, length_inches, ring_gauge, msrp, brand_accounts(name))')
      .eq('user_id', profile.id)
      .order('added_at', { ascending: false })

    if (itemsError) {
      return NextResponse.json({ error: 'Unable to load wishlist' }, { status: 500 })
    }

    const firstName = profile.first_name?.trim() || ''
    const lastName = profile.last_name?.trim() || ''
    const realName = [firstName, lastName].filter(Boolean).join(' ') || null

    return NextResponse.json(
      {
        sharedBy: privacy.wishlistShowRealNameOnLink && realName ? realName : profile.username,
        showRealName: privacy.wishlistShowRealNameOnLink,
        items: items || [],
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch {
    return NextResponse.json({ error: 'Unable to load wishlist' }, { status: 500 })
  }
}
