import { NextRequest, NextResponse } from 'next/server'
import { requirePaidStoreFromRequest } from '@/server/store'

type RouteContext = {
  params: Promise<{ userId: string }>
}

function normalizePrivacy(privacy?: {
  wishlistStoreLookupEnabled?: boolean
} | null) {
  return {
    wishlistStoreLookupEnabled: privacy?.wishlistStoreLookupEnabled ?? false,
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await params
    const { supabaseAdmin, store } = await requirePaidStoreFromRequest(request)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, privacy')
      .eq('id', userId)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const privacy = normalizePrivacy(profile.privacy)
    if (!privacy.wishlistStoreLookupEnabled) {
      return NextResponse.json({ error: 'Customer has not enabled store wishlist lookup' }, { status: 403 })
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('wishlist_items')
      .select('id, added_at, cigars(id, name, line, vitola, strength, wrapper_origin, wrapper_color, length_inches, ring_gauge, msrp, brand_account_id, brand_accounts(name))')
      .eq('user_id', userId)
      .order('added_at', { ascending: false })

    if (itemsError) {
      return NextResponse.json({ error: 'Unable to load wishlist' }, { status: 500 })
    }

    const exactCigarIds = (items || []).map(item => (item.cigars as { id?: string } | null)?.id).filter(Boolean) as string[]
    const brandIds = (items || []).map(item => (item.cigars as { brand_account_id?: string } | null)?.brand_account_id).filter(Boolean) as string[]

    const { data: exactInventory } = exactCigarIds.length > 0
      ? await supabaseAdmin
        .from('inventory')
        .select('cigar_id')
        .eq('store_id', store.id)
        .in('cigar_id', exactCigarIds)
      : { data: [] as { cigar_id: string }[] }

    const { data: carriedBrands } = brandIds.length > 0
      ? await supabaseAdmin
        .from('store_brands')
        .select('brand_account_id')
        .eq('store_id', store.id)
        .in('brand_account_id', brandIds)
      : { data: [] as { brand_account_id: string }[] }

    const exactInventoryIds = new Set((exactInventory || []).map(row => row.cigar_id))
    const carriedBrandIds = new Set((carriedBrands || []).map(row => row.brand_account_id))

    const wishlistItems = (items || []).map(item => {
      const cigar = item.cigars as unknown as {
        id: string
        name: string
        line: string | null
        vitola: string | null
        strength: string | null
        wrapper_origin: string | null
        wrapper_color: string | null
        length_inches: number | null
        ring_gauge: number | null
        msrp: number | null
        brand_account_id: string | null
        brand_accounts: { name: string } | null
      } | null

      const carriedHere = cigar?.id
        ? exactInventoryIds.has(cigar.id) || (cigar.brand_account_id ? carriedBrandIds.has(cigar.brand_account_id) : false)
        : null

      return {
        id: item.id,
        addedAt: item.added_at,
        cigar: cigar ? {
          id: cigar.id,
          brand: cigar.brand_accounts?.name || 'Unknown Brand',
          name: cigar.name,
          line: cigar.line,
          vitola: cigar.vitola,
          lengthInches: cigar.length_inches,
          ringGauge: cigar.ring_gauge,
          strength: cigar.strength,
          wrapperOrigin: cigar.wrapper_origin,
          wrapperColor: cigar.wrapper_color,
          msrp: cigar.msrp,
        } : null,
        carriedHere,
      }
    })

    const customerName = [profile.first_name, profile.last_name].filter(Boolean).join(' ')

    return NextResponse.json(
      {
        customer: {
          customerId: profile.id,
          firstName: profile.first_name,
          lastName: profile.last_name,
          displayName: customerName || 'Shared Wishlist',
        },
        inventoryMatchingAvailable: true,
        items: wishlistItems,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Forbidden'
    const status = message === 'Unauthorized' ? 401 : message === 'PaymentRequired' ? 402 : 403
    return NextResponse.json({ error: message }, { status })
  }
}
