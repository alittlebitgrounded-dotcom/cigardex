'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

type Brand = {
  id: string
  name: string
  country_of_origin: string | null
  created_at: string
}

export default function StoreInventoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeName, setStoreName] = useState('')
  const [carriedIds, setCarriedIds] = useState<Set<string>>(new Set())
  const [allBrands, setAllBrands] = useState<Brand[]>([])
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/?signin=true'); return }
    const foundStore = await fetchStore(session.user.id)
    if (!foundStore) { router.push('/pro'); return }
    setLoading(false)
  }

  async function fetchStore(userId: string) {
    const { data: account } = await supabase.from('store_accounts').select('id').eq('user_id', userId).maybeSingle()
    if (!account) return false
    const { data: store } = await supabase.from('stores').select('id, name').eq('store_account_id', account.id).maybeSingle()
    if (!store) return false
    setStoreId(store.id)
    setStoreName(store.name)
    await Promise.all([fetchAllBrands(), fetchCarried(store.id)])
    return true
  }

  async function fetchAllBrands() {
    const { data } = await supabase
      .from('brand_accounts')
      .select('id, name, country_of_origin, created_at')
      .eq('suspended', false)
      .order('name')
    if (data) setAllBrands(data)
  }

  async function fetchCarried(sid: string) {
    const { data } = await supabase.from('store_brands').select('brand_account_id').eq('store_id', sid)
    if (data) setCarriedIds(new Set(data.map((r: any) => r.brand_account_id)))
  }

  async function toggleBrand(brandId: string) {
    if (!storeId || toggling) return
    setToggling(brandId)
    setMsg('')
    const isCarried = carriedIds.has(brandId)
    try {
      if (isCarried) {
        const { error } = await supabase.from('store_brands').delete().eq('store_id', storeId).eq('brand_account_id', brandId)
        if (error) throw error
        setCarriedIds(prev => { const next = new Set(prev); next.delete(brandId); return next })
      } else {
        const { error } = await supabase.from('store_brands').insert({ store_id: storeId, brand_account_id: brandId })
        if (error) throw error
        setCarriedIds(prev => new Set([...prev, brandId]))
      }
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Could not update inventory.')
    } finally {
      setToggling(null)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
      <p style={{ color: '#8b5e2a' }}>Loading...</p>
    </div>
  )

  const thisMonth = allBrands.filter(b => b.created_at >= thisMonthStart)
  const lastMonth = allBrands.filter(b => b.created_at >= lastMonthStart && b.created_at < thisMonthStart)

  const filtered = search
    ? allBrands.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || (b.country_of_origin || '').toLowerCase().includes(search.toLowerCase()))
    : allBrands

  // Group by first letter
  const grouped: Record<string, Brand[]> = {}
  filtered.forEach(b => {
    const letter = b.name[0].toUpperCase()
    if (!grouped[letter]) grouped[letter] = []
    grouped[letter].push(b)
  })
  const letters = Object.keys(grouped).sort()

  const carriedCount = carriedIds.size

  function BrandToggle({ brand }: { brand: Brand }) {
    const carried = carriedIds.has(brand.id)
    const isToggling = toggling === brand.id
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 14px', borderRadius: 8,
        background: carried ? '#f5f0e8' : '#fff',
        border: `1px solid ${carried ? '#d4b896' : '#e8ddd0'}`,
        transition: 'all 0.1s',
      }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: carried ? 700 : 400, color: '#1a0a00' }}>{brand.name}</span>
          {brand.country_of_origin && (
            <span style={{ fontSize: 11, color: '#8b5e2a', marginLeft: 8 }}>{brand.country_of_origin}</span>
          )}
        </div>
        <button
          onClick={() => toggleBrand(brand.id)}
          disabled={!!toggling}
          style={{
            padding: '4px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600,
            cursor: toggling ? 'not-allowed' : 'pointer',
            background: carried ? '#1a0a00' : '#f0ebe3',
            color: carried ? '#f5e6c8' : '#8b5e2a',
            opacity: isToggling ? 0.5 : 1,
            flexShrink: 0, marginLeft: 12,
            transition: 'all 0.1s',
          }}>
          {isToggling ? '...' : carried ? '✓ Carrying' : '+ Add'}
        </button>
      </div>
    )
  }

  function NewBrandChip({ brand }: { brand: Brand }) {
    const carried = carriedIds.has(brand.id)
    const isToggling = toggling === brand.id
    return (
      <button
        onClick={() => toggleBrand(brand.id)}
        disabled={!!toggling}
        style={{
          padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: carried ? 700 : 500,
          cursor: toggling ? 'not-allowed' : 'pointer',
          background: carried ? '#1a0a00' : '#fff',
          color: carried ? '#f5e6c8' : '#5a3a1a',
          border: `1px solid ${carried ? '#1a0a00' : '#d4b896'}`,
          opacity: isToggling ? 0.5 : 1,
          transition: 'all 0.1s',
        }}>
        {isToggling ? '...' : carried ? `✓ ${brand.name}` : `+ ${brand.name}`}
      </button>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'Georgia, serif' }}>
      <Header />

      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '36px 32px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: '#f5e6c8', fontSize: 24, fontWeight: 700, margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              Brand Inventory
            </h1>
            <p style={{ color: '#c4a96a', fontSize: 14, margin: 0 }}>
              {storeName} · <strong style={{ color: '#f5e6c8' }}>{carriedCount}</strong> brand{carriedCount !== 1 ? 's' : ''} listed
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href="/store/setup" style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid rgba(196,169,106,0.4)', color: '#c4a96a', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>← Store Profile</a>
            <a href="/pro" style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid rgba(196,169,106,0.4)', color: '#c4a96a', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Dashboard</a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 64px' }}>

        {msg && (
          <div style={{ background: '#fbe9e7', border: '1px solid #f5c6c6', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#b71c1c' }}>{msg}</div>
        )}

        {/* New this month */}
        {thisMonth.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, background: '#c4a96a', color: '#1a0a00', padding: '2px 8px', borderRadius: 10, letterSpacing: '0.06em' }}>NEW THIS MONTH</span>
              <span style={{ fontSize: 12, color: '#aaa' }}>{thisMonth.length} brand{thisMonth.length !== 1 ? 's' : ''} added to CigarDex</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {thisMonth.map(b => <NewBrandChip key={b.id} brand={b} />)}
            </div>
          </div>
        )}

        {/* New last month */}
        {lastMonth.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, background: '#f5f0e8', color: '#8b5e2a', padding: '2px 8px', borderRadius: 10, letterSpacing: '0.06em' }}>LAST MONTH</span>
              <span style={{ fontSize: 12, color: '#aaa' }}>{lastMonth.length} brand{lastMonth.length !== 1 ? 's' : ''} added</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {lastMonth.map(b => <NewBrandChip key={b.id} brand={b} />)}
            </div>
          </div>
        )}

        {/* Search + alphabetical list */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: 0, fontFamily: 'Georgia, serif' }}>
              All Brands
            </h2>
            <span style={{ fontSize: 13, color: '#8b5e2a' }}>{allBrands.length} total</span>
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by brand name or country..."
            style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #d4b896', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 20, fontFamily: 'Georgia, serif' }}
          />

          {/* Letter jump bar */}
          {!search && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 20 }}>
              {letters.map(letter => (
                <a key={letter} href={`#letter-${letter}`}
                  style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: '#f5f0e8', color: '#8b5e2a', fontSize: 12, fontWeight: 700, textDecoration: 'none', border: '1px solid #e8ddd0' }}>
                  {letter}
                </a>
              ))}
            </div>
          )}

          {search && filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#aaa' }}>
              <p style={{ fontSize: 14, margin: '0 0 8px' }}>No brands found for &ldquo;{search}&rdquo;</p>
              <p style={{ fontSize: 13, margin: 0 }}>
                Don&apos;t see your brand?{' '}
                <a href="/feedback" style={{ color: '#c4a96a', fontWeight: 600, textDecoration: 'none' }}>Request it →</a>
              </p>
            </div>
          ) : search ? (
            // Search results — flat list
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.map(b => <BrandToggle key={b.id} brand={b} />)}
            </div>
          ) : (
            // Alphabetical grouped
            <div>
              {letters.map(letter => (
                <div key={letter} id={`letter-${letter}`} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#c4a96a', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 0', marginBottom: 8, borderBottom: '1px solid #f0e8dc' }}>
                    {letter}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {grouped[letter].map(b => <BrandToggle key={b.id} brand={b} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      <Footer />
    </div>
  )
}

