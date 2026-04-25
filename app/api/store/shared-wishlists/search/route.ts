import { NextRequest, NextResponse } from 'next/server'
import { requirePaidStoreFromRequest } from '@/server/store'

export async function GET(request: NextRequest) {
  try {
    const { supabaseAdmin } = await requirePaidStoreFromRequest(request)
    const query = request.nextUrl.searchParams.get('q')?.trim() || ''

    if (!query) {
      return NextResponse.json({ results: [] }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const safeQuery = query.replace(/[,%]/g, ' ').trim()
    const queryParts = safeQuery.split(/\s+/).filter(Boolean)
    const filters = new Set<string>([
      `first_name.ilike.%${safeQuery}%`,
      `last_name.ilike.%${safeQuery}%`,
    ])

    queryParts.forEach(part => {
      filters.add(`first_name.ilike.%${part}%`)
      filters.add(`last_name.ilike.%${part}%`)
    })

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, privacy')
      .contains('privacy', { wishlistStoreLookupEnabled: true })
      .or(Array.from(filters).join(','))
      .order('last_name')
      .limit(20)

    if (error) {
      return NextResponse.json({ error: 'Unable to search customers' }, { status: 500 })
    }

    const results = (data || [])
      .filter(user => user.first_name || user.last_name)
      .map(user => ({
        customerId: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
      }))

    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Forbidden'
    const status = message === 'Unauthorized' ? 401 : message === 'PaymentRequired' ? 402 : 403
    return NextResponse.json({ error: message }, { status })
  }
}
