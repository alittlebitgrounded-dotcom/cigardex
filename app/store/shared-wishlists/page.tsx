'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

type SearchResult = {
  customerId: string
  firstName: string | null
  lastName: string | null
}

type WishlistDetail = {
  customer: {
    customerId: string
    firstName: string | null
    lastName: string | null
    displayName: string
  }
  inventoryMatchingAvailable: boolean
  items: Array<{
    id: string
    addedAt: string
    cigar: {
      id: string
      brand: string
      name: string
      line: string | null
      vitola: string | null
      lengthInches: number | null
      ringGauge: number | null
      strength: string | null
      wrapperOrigin: string | null
      wrapperColor: string | null
      msrp: number | null
    } | null
    carriedHere: boolean | null
  }>
}

const STRENGTH_LABELS: Record<string, string> = {
  mild: 'Mild',
  mild_medium: 'Mild-Medium',
  medium: 'Medium',
  medium_full: 'Medium-Full',
  full: 'Full',
}

function formatSize(length: number | null, ringGauge: number | null) {
  if (length && ringGauge) return `${length} x ${ringGauge}`
  if (length) return `${length}"`
  if (ringGauge) return `RG ${ringGauge}`
  return null
}

function formatWrapper(color: string | null, origin: string | null) {
  if (color && origin) return `${color} wrapper`
  if (color) return `${color} wrapper`
  if (origin) return `${origin} wrapper`
  return null
}

export default function StoreSharedWishlistsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [storeName, setStoreName] = useState('')
  const [storeTier, setStoreTier] = useState('free')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [wishlistDetail, setWishlistDetail] = useState<WishlistDetail | null>(null)
  const [error, setError] = useState('')
  const [showOnlyCarried, setShowOnlyCarried] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/?signin=true')
      return
    }

    const { data: account } = await supabase.from('store_accounts').select('id, tier').eq('user_id', session.user.id).maybeSingle()
    if (!account) {
      router.push('/pro')
      return
    }

    const { data: store } = await supabase.from('stores').select('id, name').eq('store_account_id', account.id).maybeSingle()
    if (!store) {
      router.push('/store/setup')
      return
    }

    setStoreName(store.name)
    setStoreTier(account.tier || 'free')
    setAccessToken(session.access_token)
    setLoading(false)
  }

  async function searchCustomers(nextQuery: string) {
    if (!accessToken) return

    const trimmed = nextQuery.trim()
    setQuery(nextQuery)
    setSelectedCustomerId(null)
    setWishlistDetail(null)
    setError('')

    if (!trimmed) {
      setSearchResults([])
      return
    }

    setSearching(true)
    const response = await fetch(`/api/store/shared-wishlists/search?q=${encodeURIComponent(trimmed)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })
    setSearching(false)

    if (response.status === 402) {
      setError('Shared Wishlists is part of the paid store membership.')
      setSearchResults([])
      return
    }

    if (!response.ok) {
      setError('We could not search shared wishlists right now.')
      setSearchResults([])
      return
    }

    const payload = await response.json()
    setSearchResults(payload.results || [])
  }

  async function openWishlist(customerId: string) {
    if (!accessToken) return

    setSelectedCustomerId(customerId)
    setWishlistLoading(true)
    setError('')

    const response = await fetch(`/api/store/shared-wishlists/${customerId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })

    setWishlistLoading(false)

    if (response.status === 402) {
      setWishlistDetail(null)
      setError('Shared Wishlists is part of the paid store membership.')
      return
    }

    if (!response.ok) {
      setWishlistDetail(null)
      setError(response.status === 403 ? 'This customer has not enabled store wishlist lookup.' : 'We could not load that wishlist right now.')
      return
    }

    const payload = await response.json()
    setWishlistDetail(payload)
  }

  const groupedItems = useMemo(() => {
    if (!wishlistDetail) return {}

    const filtered = showOnlyCarried
      ? wishlistDetail.items.filter(item => item.carriedHere === true)
      : wishlistDetail.items

    const sorted = [...filtered].sort((a, b) => {
      const brandA = a.cigar?.brand || ''
      const brandB = b.cigar?.brand || ''
      if (brandA !== brandB) return brandA.localeCompare(brandB)
      const lineA = a.cigar?.line || ''
      const lineB = b.cigar?.line || ''
      if (lineA !== lineB) return lineA.localeCompare(lineB)
      const nameA = a.cigar?.name || ''
      const nameB = b.cigar?.name || ''
      if (nameA !== nameB) return nameA.localeCompare(nameB)
      return (a.cigar?.vitola || '').localeCompare(b.cigar?.vitola || '')
    })

    return sorted.reduce<Record<string, WishlistDetail['items']>>((acc, item) => {
      const brand = item.cigar?.brand || 'Unknown Brand'
      if (!acc[brand]) acc[brand] = []
      acc[brand].push(item)
      return acc
    }, {})
  }, [wishlistDetail, showOnlyCarried])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ color: '#8b5e2a' }}>Loading...</p>
      </div>
    )
  }

  if (storeTier !== 'paid') {
    return (
      <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif' }}>
        <Header />

        <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '36px 32px' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <h1 style={{ color: '#f5e6c8', fontSize: 24, fontWeight: 700, margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>Shared Wishlists</h1>
            <p style={{ color: '#c4a96a', fontSize: 14, margin: 0 }}>
              {storeName} · This feature is available to paid store memberships.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px 56px' }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>Paid Membership Feature</h2>
            <p style={{ fontSize: 14, color: '#8b5e2a', margin: '0 0 14px', lineHeight: 1.7 }}>
              Shared Wishlists is built and ready, but access is locked to paid store accounts. Once your store is marked paid, this page will let you search opted-in customers by real name and open their wishlists in-store.
            </p>
            <p style={{ fontSize: 13, color: '#5a3a1a', margin: 0 }}>
              Current store tier: <strong>{storeTier}</strong>
            </p>
          </div>
        </div>

        <Footer />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif' }}>
      <Header />

      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '36px 32px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ color: '#f5e6c8', fontSize: 24, fontWeight: 700, margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>Shared Wishlists</h1>
            <p style={{ color: '#c4a96a', fontSize: 14, margin: 0 }}>
              {storeName} · Look up customers who have allowed registered stores to view their wishlist.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href="/store/setup" style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid rgba(196,169,106,0.4)', color: '#c4a96a', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Store Profile</a>
            <a href="/store/inventory" style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid rgba(196,169,106,0.4)', color: '#c4a96a', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Inventory</a>
            <a href="/pro" style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid rgba(196,169,106,0.4)', color: '#c4a96a', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Dashboard</a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px 56px', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 20, alignSelf: 'start' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 10px', fontFamily: 'Georgia, serif' }}>Customer Lookup</h2>
          <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 14px', lineHeight: 1.6 }}>
            Search by customer name.
          </p>

          <input
            value={query}
            onChange={event => searchCustomers(event.target.value)}
            placeholder="Search by customer name"
            style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #d4b896', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />

          {searching && <p style={{ fontSize: 12, color: '#8b5e2a', margin: '12px 0 0' }}>Searching...</p>}

          {!searching && query.trim() && searchResults.length === 0 && (
            <p style={{ fontSize: 12, color: '#8b5e2a', margin: '12px 0 0' }}>
              No opted-in customers matched that name.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {searchResults.map(result => {
              const displayName = [result.firstName, result.lastName].filter(Boolean).join(' ')
              const selected = selectedCustomerId === result.customerId

              return (
                <button
                  key={result.customerId}
                  onClick={() => openWishlist(result.customerId)}
                  style={{
                    textAlign: 'left',
                    borderRadius: 8,
                    border: selected ? '2px solid #1a0a00' : '1px solid #e8ddd0',
                    background: selected ? '#f5f0e8' : '#fff',
                    color: '#1a0a00',
                    padding: '12px 14px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{displayName || 'Unnamed customer'}</div>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 24 }}>
          {error && (
            <div style={{ background: '#fbe9e7', border: '1px solid #f5c6c6', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#b71c1c' }}>
              {error}
            </div>
          )}

          {!wishlistDetail && !wishlistLoading && !error && (
            <div style={{ textAlign: 'center', padding: '56px 24px', color: '#8b5e2a' }}>
              Select a customer to view their shared wishlist.
            </div>
          )}

          {wishlistLoading && (
            <div style={{ textAlign: 'center', padding: '56px 24px', color: '#8b5e2a' }}>
              Loading shared wishlist...
            </div>
          )}

          {wishlistDetail && !wishlistLoading && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>{wishlistDetail.customer.displayName}</h2>
                  <p style={{ fontSize: 13, color: '#8b5e2a', margin: 0 }}>
                    In-store shopping view for shared wishlist access.
                  </p>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: wishlistDetail.inventoryMatchingAvailable ? '#1a0a00' : '#aaa', cursor: wishlistDetail.inventoryMatchingAvailable ? 'pointer' : 'not-allowed' }}>
                    <input
                      type="checkbox"
                      checked={showOnlyCarried}
                      onChange={event => setShowOnlyCarried(event.target.checked)}
                      disabled={!wishlistDetail.inventoryMatchingAvailable}
                    />
                    Show only cigars this store carries
                  </label>
                  {!wishlistDetail.inventoryMatchingAvailable && (
                    <p style={{ fontSize: 12, color: '#8b5e2a', margin: '6px 0 0' }}>Store inventory matching is not available yet.</p>
                  )}
                </div>
              </div>

              {wishlistDetail.items.length === 0 ? (
                <div style={{ background: '#faf8f5', borderRadius: 10, border: '1px solid #e8ddd0', padding: 28, color: '#8b5e2a' }}>
                  This customer has shared wishlist access with stores, but their wishlist is currently empty.
                </div>
              ) : Object.keys(groupedItems).length === 0 ? (
                <div style={{ background: '#faf8f5', borderRadius: 10, border: '1px solid #e8ddd0', padding: 28, color: '#8b5e2a' }}>
                  No wishlist items match the current filter.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  {Object.keys(groupedItems).sort().map(brand => (
                    <section key={brand}>
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1a0a00', margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>{brand}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {groupedItems[brand].map(item => {
                          const cigar = item.cigar
                          const detailParts = [
                            cigar?.vitola,
                            formatSize(cigar?.lengthInches ?? null, cigar?.ringGauge ?? null),
                            cigar?.strength ? STRENGTH_LABELS[cigar.strength] || cigar.strength : null,
                            formatWrapper(cigar?.wrapperColor ?? null, cigar?.wrapperOrigin ?? null),
                          ].filter(Boolean)

                          return (
                            <div key={item.id} style={{ background: '#faf8f5', borderRadius: 10, border: '1px solid #e8ddd0', padding: 18 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontSize: 12, color: '#c4a96a', fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cigar?.brand}</p>
                                  <h4 style={{ fontSize: 16, color: '#1a0a00', fontWeight: 700, margin: '0 0 6px' }}>{cigar?.name}</h4>
                                  {cigar?.line && <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 6px' }}>{cigar.line}</p>}
                                  {detailParts.length > 0 && <p style={{ fontSize: 13, color: '#5a3a1a', margin: '0 0 8px', lineHeight: 1.6 }}>{detailParts.join(' · ')}</p>}
                                  {cigar?.msrp !== null && cigar?.msrp !== undefined && <p style={{ fontSize: 13, color: '#1a0a00', fontWeight: 600, margin: '0 0 8px' }}>MSRP: ${cigar.msrp.toFixed(2)}</p>}
                                  <p style={{ fontSize: 13, color: '#5a3a1a', margin: 0 }}>
                                    Carried here: {item.carriedHere === null ? 'Unknown' : item.carriedHere ? 'Yes' : 'No'}
                                  </p>
                                </div>
                                <div style={{ flexShrink: 0 }}>
                                  <a href={`/cigar/${cigar?.id}`} style={{ color: '#8b5e2a', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>View cigar</a>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
