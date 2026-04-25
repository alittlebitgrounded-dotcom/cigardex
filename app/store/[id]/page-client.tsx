'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

type Store = {
  id: string
  name: string
  type: string
  address: string | null
  city: string | null
  state: string | null
  phone: string | null
  website_url: string | null
  description: string | null
  hours: Record<string, string> | null
  active: boolean
}

type Designation = {
  id: string
  custom_name: string | null
  retailer_designations: { name: string; description: string | null } | null
}

type StoreBrand = {
  id: string
  brand_accounts: { id: string; name: string; country_of_origin: string | null } | null
}

type Review = {
  id: string
  rating: number | null
  notes: string | null
  created_at: string
  users: { username: string } | null
  cigars: { id: string; name: string; brand_accounts: { name: string } | null } | null
}

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

export default function StoreProfilePage() {
  const params = useParams()
  const storeId = params.id as string

  const [store, setStore] = useState<Store | null>(null)
  const [designations, setDesignations] = useState<Designation[]>([])
  const [brands, setBrands] = useState<StoreBrand[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => { fetchAll() }, [storeId])

  async function fetchAll() {
    const { data: storeData } = await supabase
      .from('stores')
      .select('id, name, type, address, city, state, phone, website_url, description, hours, active')
      .eq('id', storeId)
      .eq('active', true)
      .maybeSingle()

    if (!storeData) { setNotFound(true); setLoading(false); return }
    setStore(storeData)

    const [designRes, brandRes, reviewRes, sessionRes] = await Promise.all([
      supabase.from('store_designations')
        .select('id, custom_name, retailer_designations(name, description)')
        .eq('store_id', storeId)
        .or('status.eq.approved,verified.eq.true'),
      supabase.from('store_brands')
        .select('id, brand_accounts(id, name, country_of_origin)')
        .eq('store_id', storeId)
        .order('brand_accounts(name)'),
      supabase.from('reviews')
        .select('id, rating, notes, created_at, users(username), cigars(id, name, brand_accounts(name))')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.auth.getSession(),
    ])

    if (designRes.data) setDesignations(designRes.data as unknown as Designation[])
    if (brandRes.data) setBrands(brandRes.data as unknown as StoreBrand[])
    if (reviewRes.data) setReviews(reviewRes.data as unknown as Review[])

    // Check if current user owns this store
    if (sessionRes.data.session) {
      const { data: account } = await supabase
        .from('store_accounts').select('id').eq('user_id', sessionRes.data.session.user.id).maybeSingle()
      if (account) {
        const { data: ownedStore } = await supabase
          .from('stores').select('id').eq('store_account_id', account.id).eq('id', storeId).maybeSingle()
        if (ownedStore) setIsOwner(true)
      }
    }

    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
      <p style={{ color: '#8b5e2a' }}>Loading...</p>
    </div>
  )

  if (notFound || !store) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'Georgia, serif' }}>
      <Header />
      <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>🏪</p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a0a00', margin: '0 0 12px' }}>Store not found</h1>
        <p style={{ color: '#8b5e2a', fontSize: 15, marginBottom: 24 }}>This store may not be active or the link may be incorrect.</p>
        <a href="/" style={{ color: '#c4a96a', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>← Back to CigarDex</a>
      </div>
      <Footer />
    </div>
  )

  const location = [store.address, store.city, store.state].filter(Boolean).join(', ')
  const avgRating = reviews.filter(r => r.rating).length > 0
    ? (reviews.filter(r => r.rating).reduce((s, r) => s + (r.rating || 0), 0) / reviews.filter(r => r.rating).length).toFixed(1)
    : null
  const hoursEntries = store.hours ? DAYS.filter(d => store.hours![d.key]) : []

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'Georgia, serif' }}>
      <Header />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '48px 32px 40px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: '#c4a96a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
              🏪
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <h1 style={{ color: '#f5e6c8', fontSize: 28, fontWeight: 700, margin: 0, fontFamily: 'Georgia, serif' }}>{store.name}</h1>
                <span style={{ fontSize: 11, background: '#c4a96a', color: '#1a0a00', padding: '2px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.05em' }}>VERIFIED</span>
                {isOwner && (
                  <a href="/store/setup" style={{ fontSize: 11, background: 'rgba(196,169,106,0.2)', color: '#c4a96a', padding: '2px 10px', borderRadius: 4, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(196,169,106,0.4)' }}>
                    ✏ Edit Profile
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                {location && <span style={{ color: '#c4a96a', fontSize: 14 }}>📍 {location}</span>}
                {store.phone && <span style={{ color: '#8b6a4a', fontSize: 14 }}>📞 {store.phone}</span>}
                {store.website_url && (
                  <a href={store.website_url} target="_blank" rel="noopener noreferrer"
                    style={{ color: '#c4a96a', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
                    🌐 Website ↗
                  </a>
                )}
                {avgRating && (
                  <span style={{ color: '#f5e6c8', fontSize: 14, fontWeight: 700 }}>⭐ {avgRating} avg</span>
                )}
              </div>
            </div>
          </div>

          {/* Designations in hero */}
          {designations.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {designations.map(d => (
                <span key={d.id} style={{ fontSize: 12, background: 'rgba(196,169,106,0.15)', border: '1px solid rgba(196,169,106,0.4)', color: '#c4a96a', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
                  {d.retailer_designations?.name || d.custom_name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 64px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* About */}
          {store.description && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>About</h2>
              <p style={{ fontSize: 14, color: '#5a3a1a', lineHeight: 1.8, margin: 0 }}>{store.description}</p>
            </div>
          )}

          {/* Brands carried */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: 0, fontFamily: 'Georgia, serif' }}>
                Brands Carried
                <span style={{ fontSize: 13, color: '#8b5e2a', fontWeight: 400, fontFamily: 'Georgia, serif', marginLeft: 8 }}>
                  {brands.length > 0 ? `${brands.length} brand${brands.length !== 1 ? 's' : ''}` : ''}
                </span>
              </h2>
              {isOwner && (
                <a href="/store/inventory" style={{ fontSize: 12, color: '#c4a96a', fontWeight: 600, textDecoration: 'none' }}>
                  Manage →
                </a>
              )}
            </div>
            {brands.length === 0 ? (
              <div style={{ background: '#f5f0e8', borderRadius: 8, padding: '16px 20px' }}>
                <p style={{ fontSize: 13, color: '#8b5e2a', margin: 0 }}>
                  {isOwner
                    ? <><a href="/store/inventory" style={{ color: '#c4a96a', fontWeight: 600, textDecoration: 'none' }}>Add brands you carry →</a></>
                    : 'This store hasn\'t listed their brands yet.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {brands.map(b => (
                  <a key={b.id} href={`/brand/${b.brand_accounts?.id}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f5f0e8', border: '1px solid #d4b896', borderRadius: 8, padding: '6px 12px', textDecoration: 'none' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a0a00' }}>{b.brand_accounts?.name}</span>
                    {b.brand_accounts?.country_of_origin && (
                      <span style={{ fontSize: 11, color: '#8b5e2a' }}>{b.brand_accounts.country_of_origin}</span>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Reviews */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: 0, fontFamily: 'Georgia, serif' }}>
                Reviews
                {avgRating && <span style={{ fontSize: 13, color: '#8b5e2a', fontWeight: 400, fontFamily: 'Georgia, serif', marginLeft: 8 }}>{avgRating}/10 avg</span>}
              </h2>
              <span style={{ fontSize: 13, color: '#aaa' }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
            </div>
            {reviews.length === 0 ? (
              <div style={{ background: '#f5f0e8', borderRadius: 8, padding: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: '#8b5e2a', margin: 0 }}>No reviews yet — be the first.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {reviews.map((r, i) => (
                  <div key={r.id} style={{ borderBottom: i < reviews.length - 1 ? '1px solid #f0e8dc' : 'none', paddingBottom: i < reviews.length - 1 ? 14 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        {r.cigars && (
                          <a href={`/cigar/${r.cigars.id}`} style={{ textDecoration: 'none' }}>
                            <p style={{ fontSize: 11, color: '#c4a96a', fontWeight: 600, margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.cigars.brand_accounts?.name}</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#1a0a00', margin: 0 }}>{r.cigars.name}</p>
                          </a>
                        )}
                        <p style={{ fontSize: 12, color: '#aaa', margin: '4px 0 0' }}>
                          by {r.users?.username} · {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {r.rating && (
                        <span style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', flexShrink: 0 }}>
                          {r.rating.toFixed(1)}<span style={{ fontSize: 11, color: '#aaa' }}>/10</span>
                        </span>
                      )}
                    </div>
                    {r.notes && <p style={{ fontSize: 13, color: '#5a3a1a', lineHeight: 1.6, margin: 0 }}>{r.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Hours */}
          {hoursEntries.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a0a00', margin: '0 0 14px', fontFamily: 'Georgia, serif' }}>Hours</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {hoursEntries.map(day => (
                  <div key={day.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#8b5e2a', fontWeight: 600 }}>{day.label}</span>
                    <span style={{ color: store.hours![day.key]?.toLowerCase() === 'closed' ? '#aaa' : '#1a0a00' }}>
                      {store.hours![day.key]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          {(location || store.phone || store.website_url) && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a0a00', margin: '0 0 14px', fontFamily: 'Georgia, serif' }}>Contact</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {location && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>📍</span>
                    <span style={{ fontSize: 13, color: '#5a3a1a', lineHeight: 1.5 }}>{location}</span>
                  </div>
                )}
                {store.phone && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 14 }}>📞</span>
                    <a href={`tel:${store.phone}`} style={{ fontSize: 13, color: '#1a0a00', textDecoration: 'none' }}>{store.phone}</a>
                  </div>
                )}
                {store.website_url && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 14 }}>🌐</span>
                    <a href={store.website_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 13, color: '#c4a96a', textDecoration: 'none', fontWeight: 500, wordBreak: 'break-all' }}>
                      {store.website_url.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Industry Honors */}
          {designations.length > 0 && (
            <div style={{ background: '#f5f0e8', borderRadius: 12, border: '1px solid #d4b896', padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a0a00', margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>Industry Honors</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {designations.map(d => (
                  <div key={d.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: '#c4a96a', fontSize: 12, flexShrink: 0, marginTop: 2 }}>✦</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#1a0a00', margin: 0 }}>
                        {d.retailer_designations?.name || d.custom_name}
                      </p>
                      {d.retailer_designations?.description && (
                        <p style={{ fontSize: 11, color: '#8b5e2a', margin: '1px 0 0' }}>{d.retailer_designations.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </div>
  )
}

