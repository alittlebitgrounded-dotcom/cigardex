'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Footer from '@/components/Footer'

type UserDetail = {
  id: string
  username: string
  email: string
  role: string
  tier: string
  suspended: boolean
  experience_level: string | null
  created_at: string
}

type Review = {
  id: string
  rating: number | null
  notes: string | null
  draw_score: number | null
  burn_score: number | null
  construction_score: number | null
  value_score: number | null
  strength_impression: string | null
  body: string | null
  finish: string | null
  occasion: string | null
  where_smoked: string | null
  smoked_at: string | null
  created_at: string
  updated_at: string
  cigars: { id: string; name: string; brand_accounts: { name: string } | null } | null
}

type CigarEdit = {
  id: string
  status: string
  changes: Record<string, unknown>
  created_at: string
  cigars: { name: string } | null
}

type HumidorItem = {
  id: string
  quantity: number
  purchase_date: string | null
  purchase_price: number | null
  added_at: string
  cigars: { id: string; name: string; brand_accounts: { name: string } | null } | null
}

type Characteristic = {
  id: string
  created_at: string
  characteristics: { canonical_name: string; category: string } | null
  cigars: { name: string } | null
}

type AdminSection = 'reviews' | 'humidor' | 'edits' | 'characteristics'

const ROLES = ['registered', 'premium', 'brand', 'store', 'moderator', 'super_admin']
const TIERS = ['free', 'paid']

const DURATION_LABELS: Record<number, string> = {
  25: '< 30 min', 38: '30–45 min', 53: '45–60 min',
  75: '1–1.5 hrs', 105: '1.5–2 hrs', 135: '2+ hrs',
}

export default function AdminUserPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [user, setUser] = useState<UserDetail | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [humidor, setHumidor] = useState<HumidorItem[]>([])
  const [edits, setEdits] = useState<CigarEdit[]>([])
  const [characteristics, setCharacteristics] = useState<Characteristic[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<AdminSection>('reviews')
  const [actionMsg, setActionMsg] = useState('')

  useEffect(() => {
    checkAuth()
    fetchAll()
  }, [userId])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single()
    if (!data || !['super_admin', 'moderator'].includes(data.role)) router.push('/')
  }

  async function fetchAll() {
    setLoading(true)
    const [userRes, reviewRes, humidorRes, editRes] = await Promise.all([
      supabase.from('users').select('id, username, email, role, tier, suspended, experience_level, created_at').eq('id', userId).single(),
      supabase.from('reviews').select('id, rating, notes, draw_score, burn_score, construction_score, value_score, strength_impression, body, finish, occasion, where_smoked, smoked_at, created_at, updated_at, cigars(id, name, brand_accounts(name))').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('humidor_items').select('id, quantity, purchase_date, purchase_price, added_at, cigars(id, name, brand_accounts(name))').eq('user_id', userId).order('added_at', { ascending: false }),
      supabase.from('cigar_edits').select('id, status, changes, created_at, cigars(name)').eq('submitted_by', userId).order('created_at', { ascending: false }),
    ])

    if (userRes.data) setUser(userRes.data)
    if (reviewRes.data) setReviews(reviewRes.data as unknown as Review[])
    if (humidorRes.data) setHumidor(humidorRes.data as unknown as HumidorItem[])
    if (editRes.data) setEdits(editRes.data as unknown as CigarEdit[])
    setLoading(false)
  }

  async function updateRole(role: string) {
    await supabase.from('users').update({ role }).eq('id', userId)
    setUser(prev => prev ? { ...prev, role } : prev)
    setActionMsg(`Role updated to ${role}`)
  }

  async function updateTier(tier: string) {
    await supabase.from('users').update({ tier }).eq('id', userId)
    setUser(prev => prev ? { ...prev, tier } : prev)
    setActionMsg(`Tier updated to ${tier}`)
  }

  async function toggleSuspend() {
    if (!user) return
    const newVal = !user.suspended
    await supabase.from('users').update({ suspended: newVal }).eq('id', userId)
    setUser(prev => prev ? { ...prev, suspended: newVal } : prev)
    setActionMsg(newVal ? 'User suspended' : 'User reinstated')
  }

  async function deleteReview(reviewId: string) {
    await supabase.from('reviews').delete().eq('id', reviewId)
    setReviews(prev => prev.filter(r => r.id !== reviewId))
    setActionMsg('Review deleted')
  }

  function scoreBar(label: string, value: number | null) {
    if (!value) return null
    return (
      <div key={label} style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 11, color: '#8b5e2a' }}>{label}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#1a0a00' }}>{value.toFixed(1)}</span>
        </div>
        <div style={{ background: '#f0e8dc', borderRadius: 3, height: 4 }}>
          <div style={{ background: '#c4a96a', borderRadius: 3, height: 4, width: `${(value / 10) * 100}%` }} />
        </div>
      </div>
    )
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#8b5e2a' }}>Loading user...</p>
    </div>
  )

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#8b5e2a' }}>User not found.</p>
    </div>
  )

  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const avgRating = reviews.filter(r => r.rating).length > 0
    ? (reviews.filter(r => r.rating).reduce((s, r) => s + (r.rating || 0), 0) / reviews.filter(r => r.rating).length).toFixed(1)
    : null

  const btnStyle = { padding: '7px 14px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{ background: '#1a0a00', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ color: '#f5e6c8', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>🍂 CigarLog</a>
          <span style={{ color: '#c4a96a', fontSize: 13, background: '#2c1206', padding: '3px 10px', borderRadius: 4, fontWeight: 600 }}>ADMIN</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="/admin" style={{ color: '#c4a96a', fontSize: 14, textDecoration: 'none' }}>← Back to Admin</a>
        </div>
      </header>

      {/* User hero */}
      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '28px 32px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            {/* Avatar */}
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#c4a96a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#1a0a00', flexShrink: 0 }}>
              {user.username[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <h1 style={{ color: '#f5e6c8', fontSize: 24, fontWeight: 700, margin: 0 }}>{user.username}</h1>
                <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: user.suspended ? '#b71c1c' : '#2e7d32', color: '#fff', fontWeight: 600 }}>
                  {user.suspended ? 'SUSPENDED' : 'ACTIVE'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ color: '#c4a96a', fontSize: 13 }}>{user.email}</span>
                <span style={{ color: '#8b6a4a', fontSize: 13 }}>Joined {joinDate}</span>
                {user.experience_level && <span style={{ color: '#8b6a4a', fontSize: 13 }}>🍂 {user.experience_level}</span>}
              </div>
            </div>

            {/* Quick stats */}
            <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
              {[
                { label: 'Reviews', value: reviews.length },
                { label: 'Avg Rating', value: avgRating || '—' },
                { label: 'Humidor', value: humidor.length },
                { label: 'Edits', value: edits.length },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f5e6c8' }}>{value}</div>
                  <div style={{ fontSize: 11, color: '#8b6a4a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin controls */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={user.role} onChange={e => updateRole(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid rgba(196,169,106,0.3)', background: 'rgba(255,255,255,0.1)', color: '#f5e6c8', fontSize: 13, cursor: 'pointer' }}>
              {ROLES.map(r => <option key={r} value={r} style={{ background: '#1a0a00' }}>{r}</option>)}
            </select>
            <select value={user.tier} onChange={e => updateTier(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid rgba(196,169,106,0.3)', background: 'rgba(255,255,255,0.1)', color: '#f5e6c8', fontSize: 13, cursor: 'pointer' }}>
              {TIERS.map(t => <option key={t} value={t} style={{ background: '#1a0a00' }}>{t}</option>)}
            </select>
            <button onClick={toggleSuspend} style={{ ...btnStyle, background: user.suspended ? '#e8f5e9' : '#fbe9e7', color: user.suspended ? '#2e7d32' : '#b71c1c' }}>
              {user.suspended ? 'Reinstate User' : 'Suspend User'}
            </button>
            <a href={`/profile/${user.username}`} target="_blank" rel="noopener noreferrer"
              style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#c4a96a', textDecoration: 'none', display: 'inline-block' }}>
              View Public Profile ↗
            </a>
            {actionMsg && <span style={{ color: '#c4a96a', fontSize: 13, fontStyle: 'italic' }}>{actionMsg}</span>}
          </div>

          {/* Section tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(196,169,106,0.2)' }}>
            {([
              { key: 'reviews', label: `Reviews (${reviews.length})` },
              { key: 'humidor', label: `Humidor (${humidor.length})` },
              { key: 'edits', label: `Edits (${edits.length})` },
              { key: 'characteristics', label: `Characteristics (${characteristics.length})` },
            ] as { key: AdminSection; label: string }[]).map(({ key, label }) => (
              <button key={key} onClick={() => setActiveSection(key)} style={{
                padding: '12px 20px', background: 'none', border: 'none',
                borderBottom: activeSection === key ? '3px solid #c4a96a' : '3px solid transparent',
                color: activeSection === key ? '#f5e6c8' : '#8b6a4a',
                fontSize: 14, fontWeight: activeSection === key ? 600 : 400,
                cursor: 'pointer', marginBottom: -1,
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 48px' }}>

        {/* ===== REVIEWS ===== */}
        {activeSection === 'reviews' && (
          <div>
            {reviews.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                <p style={{ fontSize: 16 }}>No reviews yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {reviews.map(r => (
                  <div key={r.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <a href={`/cigar/${r.cigars?.id}`} style={{ textDecoration: 'none' }}>
                          <p style={{ color: '#c4a96a', fontSize: 11, fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.cigars?.brand_accounts?.name}</p>
                          <h3 style={{ color: '#1a0a00', fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{r.cigars?.name}</h3>
                        </a>
                        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#8b5e2a', flexWrap: 'wrap' }}>
                          <span>Added {new Date(r.created_at).toLocaleDateString()}</span>
                          {r.smoked_at && <span>· Smoked {new Date(r.smoked_at).toLocaleDateString()}</span>}
                          {r.where_smoked && <span>· {r.where_smoked}</span>}
                          {r.occasion && <span>· {r.occasion}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        {r.rating && <span style={{ fontSize: 26, fontWeight: 700, color: '#1a0a00' }}>{r.rating.toFixed(1)}<span style={{ fontSize: 12, color: '#aaa' }}>/10</span></span>}
                        <button onClick={() => deleteReview(r.id)} style={{ ...btnStyle, background: '#fbe9e7', color: '#b71c1c' }}>Delete</button>
                      </div>
                    </div>
                    {r.notes && <p style={{ color: '#444', fontSize: 14, lineHeight: 1.6, margin: '0 0 12px' }}>{r.notes}</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0 20px' }}>
                      {scoreBar('Draw', r.draw_score)}
                      {scoreBar('Burn', r.burn_score)}
                      {scoreBar('Construction', r.construction_score)}
                      {scoreBar('Value', r.value_score)}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {r.strength_impression && <span style={{ fontSize: 11, background: '#f5f0e8', color: '#5a3a1a', padding: '2px 8px', borderRadius: 4 }}>Strength: {r.strength_impression}</span>}
                      {r.body && <span style={{ fontSize: 11, background: '#f5f0e8', color: '#5a3a1a', padding: '2px 8px', borderRadius: 4 }}>Body: {r.body}</span>}
                      {r.finish && r.finish.split(',').map(f => <span key={f} style={{ fontSize: 11, background: '#f0f4f8', color: '#3a5a7a', padding: '2px 8px', borderRadius: 4 }}>{f.trim()}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== HUMIDOR ===== */}
        {activeSection === 'humidor' && (
          <div>
            {humidor.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                <p style={{ fontSize: 16 }}>Humidor is empty</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {humidor.map(item => (
                  <div key={item.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 18 }}>
                    <p style={{ color: '#c4a96a', fontSize: 11, fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.cigars?.brand_accounts?.name}</p>
                    <h3 style={{ color: '#1a0a00', fontSize: 14, fontWeight: 700, margin: '0 0 8px' }}>{item.cigars?.name}</h3>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#5a3a1a' }}>
                      <span>Qty: <strong>{item.quantity}</strong></span>
                      {item.purchase_price && <span>Paid: <strong>${item.purchase_price.toFixed(2)}</strong></span>}
                    </div>
                    {item.purchase_date && <p style={{ fontSize: 12, color: '#aaa', margin: '4px 0 0' }}>Purchased {new Date(item.purchase_date).toLocaleDateString()}</p>}
                    <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0' }}>Added {new Date(item.added_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== EDITS ===== */}
        {activeSection === 'edits' && (
          <div>
            {edits.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                <p style={{ fontSize: 16 }}>No edit submissions</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {edits.map(edit => (
                  <div key={edit.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 2px' }}>{edit.cigars?.name || 'Unknown cigar'}</h3>
                        <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>{new Date(edit.created_at).toLocaleDateString()}</p>
                      </div>
                      <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, fontWeight: 600, background: edit.status === 'approved' ? '#e8f5e9' : edit.status === 'rejected' ? '#fbe9e7' : '#fff3e0', color: edit.status === 'approved' ? '#2e7d32' : edit.status === 'rejected' ? '#b71c1c' : '#e65100' }}>
                        {edit.status}
                      </span>
                    </div>
                    <div style={{ background: '#f5f0e8', borderRadius: 6, padding: 10 }}>
                      {Object.entries(edit.changes).map(([key, val]) => (
                        <div key={key} style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 3 }}>
                          <span style={{ color: '#8b5e2a', minWidth: 120 }}>{key}:</span>
                          <span style={{ color: '#1a0a00', fontWeight: 500 }}>{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== CHARACTERISTICS ===== */}
        {activeSection === 'characteristics' && (
          <div>
            {characteristics.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                <p style={{ fontSize: 16 }}>No characteristic votes yet</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {characteristics.map(c => (
                  <div key={c.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1a0a00', margin: '0 0 4px' }}>{c.characteristics?.canonical_name}</p>
                    <p style={{ fontSize: 12, color: '#8b5e2a', margin: '0 0 4px' }}>{c.characteristics?.category}</p>
                    <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>on {c.cigars?.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
      <Footer />
    </div>
  )
}
