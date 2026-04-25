'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

type SharedWishlistItem = {
  id: string
  added_at: string
  cigars: {
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
    brand_accounts: { name: string } | null
  } | null
}

const STRENGTH_LABELS: Record<string, string> = {
  mild: 'Mild',
  mild_medium: 'Mild-Medium',
  medium: 'Medium',
  medium_full: 'Medium-Full',
  full: 'Medium-Full',
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

export default function SharedWishlistPageClient() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sharedBy, setSharedBy] = useState('Shared Wishlist')
  const [items, setItems] = useState<SharedWishlistItem[]>([])

  useEffect(() => {
    fetchWishlist()
  }, [token])

  async function fetchWishlist() {
    setLoading(true)
    setError('')

    const response = await fetch(`/api/wishlist/shared/${encodeURIComponent(token)}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      setError(response.status === 404 ? 'This shared wishlist link is unavailable.' : 'We could not load this shared wishlist right now.')
      setItems([])
      setLoading(false)
      return
    }

    const payload = await response.json()
    setSharedBy(payload.sharedBy || 'Shared Wishlist')
    setItems(payload.items || [])
    setLoading(false)
  }

  const grouped = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const brandA = a.cigars?.brand_accounts?.name || ''
      const brandB = b.cigars?.brand_accounts?.name || ''
      if (brandA !== brandB) return brandA.localeCompare(brandB)
      const lineA = a.cigars?.line || ''
      const lineB = b.cigars?.line || ''
      if (lineA !== lineB) return lineA.localeCompare(lineB)
      const nameA = a.cigars?.name || ''
      const nameB = b.cigars?.name || ''
      if (nameA !== nameB) return nameA.localeCompare(nameB)
      return (a.cigars?.vitola || '').localeCompare(b.cigars?.vitola || '')
    })

    return sorted.reduce<Record<string, SharedWishlistItem[]>>((acc, item) => {
      const brand = item.cigars?.brand_accounts?.name || 'Unknown Brand'
      if (!acc[brand]) acc[brand] = []
      acc[brand].push(item)
      return acc
    }, {})
  }, [items])

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'Georgia, serif' }}>
      <Header />

      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '40px 32px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <h1 style={{ color: '#f5e6c8', fontSize: 28, fontWeight: 700, margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
            {sharedBy}'s Wishlist
          </h1>
          <p style={{ color: '#c4a96a', fontSize: 14, margin: 0 }}>
            Use this private wishlist link when shopping for someone.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px 56px' }}>
        {loading ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#8b5e2a' }}>
            Loading shared wishlist...
          </div>
        ) : error ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#8b5e2a' }}>
            {error}
          </div>
        ) : items.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#8b5e2a' }}>
            This wishlist is currently empty.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.keys(grouped).sort().map(brand => (
              <section key={brand} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a0a00', margin: '0 0 16px', fontFamily: 'Georgia, serif' }}>{brand}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {grouped[brand].map(item => {
                    const cigar = item.cigars
                    const parts = [
                      cigar?.vitola,
                      formatSize(cigar?.length_inches ?? null, cigar?.ring_gauge ?? null),
                      cigar?.strength ? STRENGTH_LABELS[cigar.strength] || cigar.strength : null,
                      formatWrapper(cigar?.wrapper_color ?? null, cigar?.wrapper_origin ?? null),
                    ].filter(Boolean)

                    return (
                      <div key={item.id} style={{ borderRadius: 10, border: '1px solid #e8ddd0', background: '#faf8f5', padding: 18 }}>
                        <a href={`/cigar/${cigar?.id}`} style={{ textDecoration: 'none' }}>
                          <h3 style={{ color: '#1a0a00', fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>{cigar?.name}</h3>
                        </a>
                        {cigar?.line && <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 8px' }}>{cigar.line}</p>}
                        {parts.length > 0 && <p style={{ fontSize: 13, color: '#5a3a1a', margin: '0 0 10px', lineHeight: 1.6 }}>{parts.join(' · ')}</p>}
                        {cigar?.msrp !== null && cigar?.msrp !== undefined && <p style={{ fontSize: 13, color: '#1a0a00', fontWeight: 600, margin: '0 0 12px' }}>MSRP: ${cigar.msrp.toFixed(2)}</p>}
                        <a href={`/cigar/${cigar?.id}`} style={{ color: '#8b5e2a', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>View cigar</a>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
