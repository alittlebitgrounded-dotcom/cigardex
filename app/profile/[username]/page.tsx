'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Footer from '@/components/Footer'
import CountryPreferences from '@/components/CountryPreferences'

type UserProfile = {
  id: string
  username: string
  role: string
  tier: string
  created_at: string
  experience_level: string | null
  privacy?: {
    show_humidor?: boolean
    show_stats?: boolean
    show_activity?: boolean
    show_online?: boolean
  }
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
  smoke_duration_minutes: number | null
  smoked_at: string | null
  created_at: string
  cigars: { id: string; name: string; brand_accounts: { name: string } | null } | null
}

type HumidorItem = {
  id: string
  quantity: number
  purchase_date: string | null
  purchase_price: number | null
  notes: string | null
  added_at: string
  cigars: { id: string; name: string; brand_accounts: { name: string } | null } | null
}

type ProfileSection = 'reviews' | 'humidor' | 'stats' | 'activity' | 'edit'

const DURATION_LABELS: Record<number, string> = {
  25: '< 30 min', 38: '30–45 min', 53: '45–60 min',
  75: '1–1.5 hrs', 105: '1.5–2 hrs', 135: '2+ hrs',
}

const EXPERIENCE_LEVELS = ['New to cigars', 'Casual smoker', 'Enthusiast', 'Aficionado', 'Expert']

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [humidor, setHumidor] = useState<HumidorItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<ProfileSection>('reviews')
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [editUsername, setEditUsername] = useState('')
  const [editExperience, setEditExperience] = useState('')
  const [editPrivacy, setEditPrivacy] = useState({
    show_humidor: true, show_stats: true, show_activity: true, show_online: false,
  })
  const [editMsg, setEditMsg] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const [stats, setStats] = useState<{
    totalReviews: number
    avgRating: number | null
    favoriteBrand: string | null
    totalHumidor: number
    avgDrawScore: number | null
  } | null>(null)

  useEffect(() => {
    fetchProfile()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null)
    })
  }, [username])

  async function fetchProfile() {
    setLoading(true)
    const { data: profileData } = await supabase
      .from('users')
      .select('id, username, role, tier, created_at, experience_level')
      .eq('username', username)
      .maybeSingle()

    if (!profileData) { setLoading(false); return }
    setProfile(profileData)

    const { data: { session } } = await supabase.auth.getSession()
    const isOwn = session?.user?.id === profileData.id
    setIsOwnProfile(isOwn)

    const { data: reviewData } = await supabase
      .from('reviews')
      .select('id, rating, notes, draw_score, burn_score, construction_score, value_score, strength_impression, body, finish, occasion, where_smoked, smoke_duration_minutes, smoked_at, created_at, cigars(id, name, brand_accounts(name))')
      .eq('user_id', profileData.id)
      .order('created_at', { ascending: false })
    if (reviewData) setReviews(reviewData as unknown as Review[])

    const { data: humidorData } = await supabase
      .from('humidor_items')
      .select('id, quantity, purchase_date, purchase_price, notes, added_at, cigars(id, name, brand_accounts(name))')
      .eq('user_id', profileData.id)
      .order('added_at', { ascending: false })
    if (humidorData) setHumidor(humidorData as unknown as HumidorItem[])

    if (reviewData && reviewData.length > 0) {
      const rated = (reviewData as unknown as Review[]).filter(r => r.rating !== null)
      const avgRating = rated.length > 0 ? rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length : null
      const brandCounts: Record<string, number> = {}
      ;(reviewData as unknown as Review[]).forEach(r => {
        const b = r.cigars?.brand_accounts?.name
        if (b) brandCounts[b] = (brandCounts[b] || 0) + 1
      })
      const favoriteBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
      const drawRated = (reviewData as unknown as Review[]).filter(r => r.draw_score !== null)
      const avgDraw = drawRated.length > 0 ? drawRated.reduce((s, r) => s + (r.draw_score || 0), 0) / drawRated.length : null
      setStats({
        totalReviews: reviewData.length,
        avgRating,
        favoriteBrand,
        totalHumidor: humidorData?.length || 0,
        avgDrawScore: avgDraw,
      })
    }

    setEditUsername(profileData.username)
    setEditExperience(profileData.experience_level || '')
    setLoading(false)
  }

  async function saveProfile() {
    setEditLoading(true)
    setEditMsg('')
    if (!profile) return

    const updates: Record<string, unknown> = { experience_level: editExperience || null }
    const usernameChanged = editUsername !== profile.username

    if (usernameChanged) {
      // Check if new username is taken in users table
      const { data: existing } = await supabase
        .from('users').select('id').eq('username', editUsername).maybeSingle()
      if (existing) { setEditMsg('That username is already taken'); setEditLoading(false); return }

      // Check if new username is locked (previously used by someone with reviews)
      const { data: historyRow } = await supabase
        .from('username_history')
        .select('id, review_count_at_change')
        .eq('old_username', editUsername)
        .order('changed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (historyRow && historyRow.review_count_at_change > 0) {
        setEditMsg('That username has been used by another reviewer and cannot be reclaimed.')
        setEditLoading(false)
        return
      }

      updates.username = editUsername
    }

    const { error } = await supabase.from('users').update(updates).eq('id', profile.id)
    if (error) { setEditMsg(error.message); setEditLoading(false); return }

    // If username changed, write to history
    if (usernameChanged) {
      const reviewCount = reviews.length
      await supabase.from('username_history').insert({
        user_id: profile.id,
        old_username: profile.username,
        new_username: editUsername,
        review_count_at_change: reviewCount,
      })
      // Redirect to new profile URL
      router.push(`/profile/${editUsername}`)
      return
    }

    setEditMsg('Profile saved!')
    setProfile(prev => prev ? { ...prev, ...updates } : prev)
    setEditLoading(false)
  }

  function scoreBar(label: string, value: number | null) {
    if (!value) return null
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 12, color: '#8b5e2a' }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1a0a00' }}>{value.toFixed(1)}</span>
        </div>
        <div style={{ background: '#f0e8dc', borderRadius: 3, height: 5 }}>
          <div style={{ background: '#c4a96a', borderRadius: 3, height: 5, width: `${(value / 10) * 100}%` }} />
        </div>
      </div>
    )
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#8b5e2a' }}>Loading profile...</p>
    </div>
  )

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#8b5e2a' }}>User not found.</p>
    </div>
  )

  const navItems: { key: ProfileSection; label: string; ownerOnly?: boolean }[] = [
    { key: 'reviews', label: '📝 Reviews' },
    { key: 'humidor', label: '🗃 Humidor' },
    { key: 'stats', label: '📊 Stats' },
    { key: 'activity', label: '⚡ Activity' },
    { key: 'edit', label: '⚙️ Edit Profile', ownerOnly: true },
  ]

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{ background: '#1a0a00', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🍂</span>
          <a href="/" style={{ color: '#f5e6c8', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>CigarLog</a>
        </div>
        <nav style={{ display: 'flex', gap: 24 }}>
          <a href="/" style={{ color: '#c4a96a', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Browse</a>
        </nav>
      </header>

      {/* Profile hero */}
      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '32px 32px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#c4a96a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#1a0a00', flexShrink: 0 }}>
              {profile.username[0].toUpperCase()}
            </div>
            <div>
              <h1 style={{ color: '#f5e6c8', fontSize: 26, fontWeight: 700, margin: '0 0 4px' }}>{profile.username}</h1>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {profile.experience_level && <span style={{ color: '#c4a96a', fontSize: 13 }}>🍂 {profile.experience_level}</span>}
                <span style={{ color: '#8b6a4a', fontSize: 13 }}>Member since {joinDate}</span>
                {profile.role === 'super_admin' && <span style={{ background: '#c4a96a', color: '#1a0a00', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>ADMIN</span>}
                {stats && <span style={{ color: '#c4a96a', fontSize: 13 }}>📝 {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(196,169,106,0.2)' }}>
            {navItems.filter(n => !n.ownerOnly || isOwnProfile).map(({ key, label }) => (
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
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>
              Reviews <span style={{ fontSize: 14, color: '#8b5e2a', fontWeight: 400 }}>({reviews.length})</span>
            </h2>
            {reviews.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                <p style={{ fontSize: 16, marginBottom: 8 }}>No reviews yet</p>
                {isOwnProfile && <p style={{ fontSize: 13 }}>Find a cigar and share your thoughts!</p>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {reviews.map(r => (
                  <div key={r.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <a href={`/cigar/${r.cigars?.id}`} style={{ textDecoration: 'none' }}>
                          <p style={{ color: '#c4a96a', fontSize: 12, fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.cigars?.brand_accounts?.name}</p>
                          <h3 style={{ color: '#1a0a00', fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>{r.cigars?.name}</h3>
                        </a>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#8b5e2a', flexWrap: 'wrap' }}>
                          {r.smoked_at && <span>{new Date(r.smoked_at).toLocaleDateString()}</span>}
                          {r.smoke_duration_minutes && <span>· {DURATION_LABELS[r.smoke_duration_minutes] || `${r.smoke_duration_minutes}min`}</span>}
                          {r.where_smoked && <span>· {r.where_smoked}</span>}
                          {r.occasion && <span>· {r.occasion}</span>}
                        </div>
                      </div>
                      {r.rating && (
                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: 30, fontWeight: 700, color: '#1a0a00', lineHeight: 1 }}>{r.rating.toFixed(1)}</div>
                          <div style={{ fontSize: 11, color: '#aaa' }}>/10</div>
                        </div>
                      )}
                    </div>
                    {r.notes && <p style={{ color: '#444', fontSize: 14, lineHeight: 1.7, margin: '0 0 14px' }}>{r.notes}</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                      {scoreBar('Draw', r.draw_score)}
                      {scoreBar('Burn', r.burn_score)}
                      {scoreBar('Construction', r.construction_score)}
                      {scoreBar('Value', r.value_score)}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
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
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>
              Humidor <span style={{ fontSize: 14, color: '#8b5e2a', fontWeight: 400 }}>({humidor.length} cigars)</span>
            </h2>
            {humidor.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                <p style={{ fontSize: 16, marginBottom: 8 }}>Humidor is empty</p>
                {isOwnProfile && <p style={{ fontSize: 13 }}>Add cigars to track your collection</p>}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {humidor.map(item => (
                  <div key={item.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20 }}>
                    <a href={`/cigar/${item.cigars?.id}`} style={{ textDecoration: 'none' }}>
                      <p style={{ color: '#c4a96a', fontSize: 11, fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.cigars?.brand_accounts?.name}</p>
                      <h3 style={{ color: '#1a0a00', fontSize: 15, fontWeight: 700, margin: '0 0 10px' }}>{item.cigars?.name}</h3>
                    </a>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#5a3a1a', marginBottom: 8 }}>
                      <span>Qty: <strong>{item.quantity}</strong></span>
                      {item.purchase_price && <span>Paid: <strong>${item.purchase_price.toFixed(2)}</strong></span>}
                    </div>
                    {item.purchase_date && <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 6px' }}>Purchased {new Date(item.purchase_date).toLocaleDateString()}</p>}
                    {item.notes && <p style={{ fontSize: 13, color: '#666', margin: 0, fontStyle: 'italic' }}>{item.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== STATS ===== */}
        {activeSection === 'stats' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>Stats</h2>
            {!stats || stats.totalReviews === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                <p style={{ fontSize: 16 }}>No stats yet — write some reviews first!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Total Reviews', value: stats.totalReviews.toString(), icon: '📝' },
                  { label: 'Average Rating Given', value: stats.avgRating ? `${stats.avgRating.toFixed(1)} / 10` : '—', icon: '⭐' },
                  { label: 'Favorite Brand', value: stats.favoriteBrand || '—', icon: '🏆' },
                  { label: 'Cigars in Humidor', value: stats.totalHumidor.toString(), icon: '🗃' },
                  { label: 'Avg Draw Score', value: stats.avgDrawScore ? stats.avgDrawScore.toFixed(1) : '—', icon: '💨' },
                ].map(({ label, value, icon }) => (
                  <div key={label} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 24, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', marginBottom: 4 }}>{value}</div>
                    <div style={{ fontSize: 12, color: '#8b5e2a', fontWeight: 500 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== ACTIVITY ===== */}
        {activeSection === 'activity' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>Recent Activity</h2>
            {reviews.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                <p style={{ fontSize: 16 }}>No activity yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reviews.slice(0, 20).map(r => (
                  <div key={r.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>📝</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, color: '#1a0a00' }}>
                        Reviewed <a href={`/cigar/${r.cigars?.id}`} style={{ color: '#1a0a00', fontWeight: 600, textDecoration: 'none' }}>{r.cigars?.name}</a>
                        {r.rating && <span style={{ color: '#c4a96a', marginLeft: 8 }}>★ {r.rating.toFixed(1)}</span>}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: '#aaa' }}>{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== EDIT PROFILE ===== */}
        {activeSection === 'edit' && isOwnProfile && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', margin: '0 0 24px' }}>Edit Profile</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>

              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 14px' }}>Username</h3>
                <input value={editUsername} onChange={e => setEditUsername(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const }} />
                <p style={{ fontSize: 12, color: '#aaa', margin: '6px 0 0' }}>
                  Your public profile URL will be /profile/{editUsername}
                  {editUsername !== profile.username && (
                    <span style={{ color: '#c4a96a', marginLeft: 8 }}>— old URL will redirect here automatically</span>
                  )}
                </p>
              </div>

              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 14px' }}>Experience Level</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {EXPERIENCE_LEVELS.map(level => (
                    <button key={level} onClick={() => setEditExperience(editExperience === level ? '' : level)} style={{
                      padding: '8px 16px', borderRadius: 20, fontSize: 13,
                      background: editExperience === level ? '#1a0a00' : '#f5f0e8',
                      color: editExperience === level ? '#f5e6c8' : '#5a3a1a',
                      border: editExperience === level ? '1px solid #1a0a00' : '1px solid #d4b896',
                      fontWeight: editExperience === level ? 600 : 400, cursor: 'pointer',
                    }}>{level}</button>
                  ))}
                </div>
              </div>

              <CountryPreferences userId={profile.id} />

              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 6px' }}>Privacy Settings</h3>
                <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 16px' }}>Your reviews always show your username. Everything else is your choice.</p>
                {[
                  { key: 'show_humidor', label: 'Show my humidor publicly' },
                  { key: 'show_stats', label: 'Show my stats publicly' },
                  { key: 'show_activity', label: 'Show my activity feed publicly' },
                  { key: 'show_online', label: 'Show when I was last active' },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, cursor: 'pointer' }}>
                    <div onClick={() => setEditPrivacy(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                      style={{ width: 40, height: 22, borderRadius: 11, position: 'relative', flexShrink: 0, background: editPrivacy[key as keyof typeof editPrivacy] ? '#1a0a00' : '#d4b896', transition: 'background 0.2s', cursor: 'pointer' }}>
                      <div style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: editPrivacy[key as keyof typeof editPrivacy] ? 21 : 3 }} />
                    </div>
                    <span style={{ fontSize: 14, color: '#1a0a00' }}>{label}</span>
                  </label>
                ))}
              </div>

              {editMsg && (
                <p style={{ color: editMsg === 'Profile saved!' ? '#2e7d32' : '#b71c1c', fontSize: 14, background: editMsg === 'Profile saved!' ? '#e8f5e9' : '#fbe9e7', padding: '10px 14px', borderRadius: 6 }}>{editMsg}</p>
              )}

              <button onClick={saveProfile} disabled={editLoading}
                style={{ background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 8, padding: '13px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: editLoading ? 0.7 : 1 }}>
                {editLoading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}

      </div>
      <Footer />
    </div>
  )
}
