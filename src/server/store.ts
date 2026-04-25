import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function createSupabaseStoreClient() {
  return createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

export async function requireStoreFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized')
  }

  const supabaseAdmin = createSupabaseStoreClient()
  const token = authHeader.slice('Bearer '.length).trim()

  if (!token) {
    throw new Error('Unauthorized')
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token)

  if (userError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Unauthorized')
  }

  const { data: account, error: accountError } = await supabaseAdmin
    .from('store_accounts')
    .select('id, tier, company_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (accountError || !account) {
    throw new Error('Forbidden')
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from('stores')
    .select('id, name')
    .eq('store_account_id', account.id)
    .maybeSingle()

  if (storeError || !store) {
    throw new Error('Forbidden')
  }

  return { supabaseAdmin, user, profile, store, account }
}

export async function requirePaidStoreFromRequest(request: NextRequest) {
  const context = await requireStoreFromRequest(request)

  if (context.account.tier !== 'paid') {
    throw new Error('PaymentRequired')
  }

  return context
}
