'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Footer from '@/components/Footer'
import Header from '@/components/Header'

type WishlistItem = {
  id: string
  added_at: string
  cigars: {
    id: string
    name: string
    vitola: string | null
    strength: string | null
    msrp: number | null
    brand_accounts: { id: string; name: string } | null
  } | null
  userRating?: number | null
}

const STRENGTH_BG: Record<string, string> = {
  mild: '#e8f5e9', mild_medium: '#c8e6c9', medium: '#fff3e0',
  medium_full: '#ffe0b2', full: '#fbe9e7',
}
const STRENGTH_TEXT: Record<string, string> = {
  mild: '#2e7d32', mild_medium: '#388e3c', medium: '#e65100',
  medium_full: '#bf360c', full: '#b71c1c',
}
const STRENGTH_LABELS: Record<string, string> = {
  mild: 'Mild', mild_medium: 'Mild-Medium', medium: 'Medium',
  medium_full: 'Medium-Full', full: 'Full',
}

export default function WishlistPage() {
  const router = useRouter()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [actionMsg, setActionMsg] = useState('')
  const [sortBy, setSortBy] = useState<'added' | 'name' | 'brand' | 'price'>('added')

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUserId(session.user.id)
    fetchWishlist(session.user.id)
  }

  async function fetchWishlist(uid: string) {
    setLoading(true)
    const { data } = await supabase
      .from('wishlist_items')
      .select('id, added_at, cigars(id, name, vitola, strength, msrp, brand_accounts(id, name))')
      .eq('user_id', uid)
      .order('added_at', { ascending: false })

    if (data) {
      const cigarIds = data.map(d => (d.cigars as any)?.id).filter(Boolean) as string[]
      let ratingsMap: Record<string, number> = {}

      if (cigarIds.length > 0) {
        const { data: reviews } = await supabase
          .from('reviews').select('cigar_id, rating')
          .eq('user_id', uid).in('cigar_id', cigarIds).not('rating', 'is', null)
        reviews?.forEach(r => { if (r.cigar_id && r.rating) ratingsMap[r.cigar_id] = r.rating })
      }

      setItems(data.map(d => ({
        ...d,
        cigars: d.cigars as unknown as WishlistItem['cigars'],
        userRating: (d.cigars as any)?.id ? ratingsMap[(d.cigars as any).id] ?? null : null,
      })))
    }
    setLoading(false)
  }

  async function moveToHumidor(item: WishlistItem) {
    if (!userId || !item.cigars) return
    await supabase.from('wishlist_items').delete().eq('id', item.id)
    await supabase.from('humidor_items').upsert(
      { user_id: userId, cigar_id: item.cigars.id, quantity: 1 },
      { onConflict: 'user_id,cigar_id' }
    )
    setItems(prev => prev.filter(i => i.id !== item.id))
    setActionMsg(`Moved "${item.cigars?.name}" to humidor`)
    setTimeout(() => setActionMsg(''), 3000)
  }

  async function removeFromWishlist(item: WishlistItem) {
    await supabase.from('wishlist_items').delete().eq('id', item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    setActionMsg(`Removed "${item.cigars?.name}" from wishlist`)
    setTimeout(() => setActionMsg(''), 3000)
  }

  const sorted = [...items].sort((a, b) => {
    if (sortBy === 'name') return (a.cigars?.name || '').localeCompare(b.cigars?.name || '')
    if (sortBy === 'brand') return (a.cigars?.brand_accounts?.name || '').localeCompare(b.cigars?.brand_accounts?.name || '')
    if (sortBy === 'price') return (b.cigars?.msrp || 0) - (a.cigars?.msrp || 0)
    return new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
  })

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif' }}>
      <Header />

      {/* Breadcrumb */}
      <div style={{ background: '#f0e8dc', padding: '10px 32px', fontSize: 13, color: '#8b5e2a' }}>
        <a href="/" style={{ color: '#8b5e2a', textDecoration: 'none' }}>Browse</a>
        <span style={{ margin: '0 8px' }}>›</span>
        <span style={{ color: '#1a0a00', fontWeight: 500 }}>My Wishlist</span>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '32px 32px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h1 style={{ color: '#f5e6c8', fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>My Wishlist</h1>
              <span style={{ color: '#c4a96a', fontSize: 14 }}>🎯 {items.length} cigar{items.length !== 1 ? 's' : ''} on your list</span>
            </div>
            {/* View toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 3, gap: 2 }}>
              {(['grid', 'list'] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  padding: '6px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  background: viewMode === mode ? '#c4a96a' : 'transparent',
                  color: viewMode === mode ? '#1a0a00' : '#c4a96a',
                }}>
                  {mode === 'grid' ? '⊞ Grid' : '☰ List'}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs — Humidor / Wishlist */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(196,169,106,0.2)' }}>
            <a href="/humidor" style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: '3px solid transparent', color: '#8b6a4a', fontSize: 14, fontWeight: 400, cursor: 'pointer', marginBottom: -1, textDecoration: 'none' }}>
              Humidor
            </a>
            <button style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: '3px solid #c4a96a', color: '#f5e6c8', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: -1 }}>
              Wishlist
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 48px' }}>

        {actionMsg && (
          <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14, fontWeight: 500 }}>
            ✅ {actionMsg}
          </div>
        )}

        {items.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#8b5e2a', marginRight: 4 }}>Sort by:</span>
            {(['added', 'name', 'brand', 'price'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)} style={{
                padding: '6px 14px', borderRadius: 20, border: sortBy === s ? '2px solid #1a0a00' : '1px solid #d4b896',
                background: sortBy === s ? '#1a0a00' : '#fff', color: sortBy === s ? '#f5e6c8' : '#5a3a1a',
                fontSize: 13, fontWeight: sortBy === s ? 600 : 400, cursor: 'pointer',
              }}>
                {s === 'added' ? 'Date Added' : s === 'name' ? 'Name' : s === 'brand' ? 'Brand' : 'MSRP'}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 13, color: '#aaa' }}>{items.length} cigars</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#8b5e2a' }}>Loading your wishlist...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <p style={{ fontSize: 18, color: '#8b5e2a', marginBottom: 8 }}>Your wishlist is empty</p>
            <p style={{ fontSize: 14, color: '#aaa', marginBottom: 24 }}>Find cigars you want to try and add them from any cigar detail page</p>
            <a href="/" style={{ background: '#1a0a00', color: '#f5e6c8', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>Browse Cigars</a>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {sorted.map(item => <WishlistCard key={item.id} item={item} onMoveToHumidor={moveToHumidor} onRemove={removeFromWishlist} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sorted.map(item => <WishlistListItem key={item.id} item={item} onMoveToHumidor={moveToHumidor} onRemove={removeFromWishlist} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function WishlistCard({ item, onMoveToHumidor, onRemove }: {
  item: WishlistItem
  onMoveToHumidor: (item: WishlistItem) => void
  onRemove: (item: WishlistItem) => void
}) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <p style={{ color: '#c4a96a', fontSize: 11, fontWeight: 600, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {item.cigars?.brand_accounts?.name}
        </p>
        <a href={`/cigar/${item.cigars?.id}`} style={{ textDecoration: 'none' }}>
          <h3 style={{ color: '#1a0a00', fontSize: 16, fontWeight: 700, margin: '0 0 8px', lineHeight: 1.3 }}>{item.cigars?.name}</h3>
        </a>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {item.cigars?.vitola && <span style={{ background: '#f5f0e8', color: '#5a3a1a', fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 500 }}>{item.cigars.vitola}</span>}
          {item.cigars?.strength && <span style={{ background: STRENGTH_BG[item.cigars.strength] || '#f5f5f5', color: STRENGTH_TEXT[item.cigars.strength] || '#555', fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 500 }}>{STRENGTH_LABELS[item.cigars.strength]}</span>}
          {item.userRating && <span style={{ background: '#1a0a00', color: '#c4a96a', fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>★ {item.userRating.toFixed(1)}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f0e8dc', paddingTop: 12 }}>
        <div>
          {item.cigars?.msrp && <span style={{ fontSize: 15, fontWeight: 700, color: '#1a0a00' }}>${item.cigars.msrp.toFixed(2)}</span>}
          <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>Added {new Date(item.added_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f0e8dc', paddingTop: 12 }}>
        <button onClick={() => onMoveToHumidor(item)} style={{ flex: 1, padding: '8px 0', background: '#f5f0e8', color: '#5a3a1a', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          → Humidor
        </button>
        <a href={`/cigar/${item.cigars?.id}`} style={{ flex: 1, padding: '8px 0', textAlign: 'center', background: '#fff3e0', color: '#e65100', borderRadius: 6, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
          View
        </a>
        {!showConfirm ? (
          <button onClick={() => setShowConfirm(true)} style={{ padding: '8px 12px', background: '#fbe9e7', color: '#b71c1c', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>✕</button>
        ) : (
          <button onClick={() => onRemove(item)} style={{ padding: '8px 12px', background: '#b71c1c', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Confirm</button>
        )}
      </div>
    </div>
  )
}

function WishlistListItem({ item, onMoveToHumidor, onRemove }: {
  item: WishlistItem
  onMoveToHumidor: (item: WishlistItem) => void
  onRemove: (item: WishlistItem) => void
}) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#c4a96a', fontSize: 11, fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.cigars?.brand_accounts?.name}</p>
        <a href={`/cigar/${item.cigars?.id}`} style={{ textDecoration: 'none' }}>
          <h3 style={{ color: '#1a0a00', fontSize: 15, fontWeight: 700, margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.cigars?.name}</h3>
        </a>
        <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#8b5e2a' }}>
          {item.cigars?.vitola && <span>{item.cigars.vitola}</span>}
          <span>· Added {new Date(item.added_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
        {item.cigars?.msrp && <span style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00' }}>${item.cigars.msrp.toFixed(2)}</span>}
        {item.userRating && (
          <div style={{ background: '#1a0a00', color: '#c4a96a', padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>
            ★ {item.userRating.toFixed(1)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={() => onMoveToHumidor(item)} style={{ padding: '7px 14px', background: '#f5f0e8', color: '#5a3a1a', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          → Humidor
        </button>
        <a href={`/cigar/${item.cigars?.id}`} style={{ padding: '7px 14px', background: '#fff3e0', color: '#e65100', borderRadius: 6, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
          View
        </a>
        {!showConfirm ? (
          <button onClick={() => setShowConfirm(true)} style={{ padding: '7px 12px', background: '#fbe9e7', color: '#b71c1c', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>✕</button>
        ) : (
          <button onClick={() => onRemove(item)} style={{ padding: '7px 12px', background: '#b71c1c', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Confirm</button>
        )}
      </div>
      <Footer />
    </div>
  )
}
