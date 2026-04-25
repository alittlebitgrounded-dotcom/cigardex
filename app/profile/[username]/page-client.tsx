'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Footer from '@/components/Footer'
import CountryPreferences from '@/components/CountryPreferences'

type UserProfile = {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  home_zip: string | null
  role: string
  tier: string
  created_at: string
  experience_level: string | null
  privacy?: {
    show_humidor?: boolean
    show_stats?: boolean
    show_activity?: boolean
    show_online?: boolean
    wishlistShareLinkEnabled?: boolean
    wishlistShareToken?: string
    wishlistShowRealNameOnLink?: boolean
    wishlistStoreLookupEnabled?: boolean
  } | null
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

type WishlistItem = {
  id: string
  added_at: string
  cigars: {
    id: string
    name: string
    vitola: string | null
    strength: string | null
    msrp: number | null
    brand_accounts: { name: string } | null
  } | null
}

type ProfilePrivacy = {
  show_humidor: boolean
  show_stats: boolean
  show_activity: boolean
  show_online: boolean
  wishlistShareLinkEnabled: boolean
  wishlistShareToken: string | null
  wishlistShowRealNameOnLink: boolean
  wishlistStoreLookupEnabled: boolean
}

type ProfileSection = 'reviews' | 'humidor' | 'wishlist' | 'stats' | 'activity' | 'edit'

const DURATION_LABELS: Record<number, string> = {
  25: '< 30 min',
  38: '30-45 min',
  53: '45-60 min',
  75: '1-1.5 hrs',
  105: '1.5-2 hrs',
  135: '2+ hrs',
}

const EXPERIENCE_LEVELS = ['New to cigars', 'Casual smoker', 'Enthusiast', 'Aficionado', 'Expert']

function createWishlistShareToken() {
  const source = globalThis.crypto

  if (source?.randomUUID) {
    return source.randomUUID().replace(/-/g, '')
  }

  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function normalizePrivacy(privacy?: UserProfile['privacy']): ProfilePrivacy {
  return {
    show_humidor: privacy?.show_humidor ?? true,
    show_stats: privacy?.show_stats ?? true,
    show_activity: privacy?.show_activity ?? true,
    show_online: privacy?.show_online ?? false,
    wishlistShareLinkEnabled: privacy?.wishlistShareLinkEnabled ?? false,
    wishlistShareToken: privacy?.wishlistShareToken ?? null,
    wishlistShowRealNameOnLink: privacy?.wishlistShowRealNameOnLink ?? false,
    wishlistStoreLookupEnabled: privacy?.wishlistStoreLookupEnabled ?? false,
  }
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [humidor, setHumidor] = useState<HumidorItem[]>([])
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<ProfileSection>('reviews')
  const [isOwnProfile, setIsOwnProfile] = useState(false)

  const [editUsername, setEditUsername] = useState('')
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editHomeZip, setEditHomeZip] = useState('')
  const [editExperience, setEditExperience] = useState('')
  const [editPrivacy, setEditPrivacy] = useState<ProfilePrivacy>({
    show_humidor: true,
    show_stats: true,
    show_activity: true,
    show_online: false,
    wishlistShareLinkEnabled: false,
    wishlistShareToken: null,
    wishlistShowRealNameOnLink: false,
    wishlistStoreLookupEnabled: false,
  })
  const [editMsg, setEditMsg] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [copyMsg, setCopyMsg] = useState('')

  const [stats, setStats] = useState<{
    totalReviews: number
    avgRating: number | null
    favoriteBrand: string | null
    totalHumidor: number
    avgDrawScore: number | null
  } | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [username])

  async function fetchProfile() {
    setLoading(true)

    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('id, username, first_name, last_name, home_zip, role, tier, created_at, experience_level')
      .eq('username', username)
      .maybeSingle()

    if (profileError || !profileData) {
      setLoading(false)
      return
    }

    const { data: privacyData } = await supabase
      .from('users')
      .select('privacy')
      .eq('id', profileData.id)
      .maybeSingle()

    const normalizedPrivacy = normalizePrivacy(privacyData?.privacy)
    setProfile({ ...profileData, privacy: privacyData?.privacy ?? null })

    const { data: { session } } = await supabase.auth.getSession()
    const isOwn = session?.user?.id === profileData.id
    setIsOwnProfile(isOwn)

    const { data: reviewData } = await supabase
      .from('reviews')
      .select('id, rating, notes, draw_score, burn_score, construction_score, value_score, strength_impression, body, finish, occasion, where_smoked, smoke_duration_minutes, smoked_at, created_at, cigars(id, name, brand_accounts(name))')
      .eq('user_id', profileData.id)
      .order('created_at', { ascending: false })

    setReviews((reviewData || []) as unknown as Review[])

    let humidorItems: HumidorItem[] = []
    if (isOwn || normalizedPrivacy.show_humidor) {
      const { data: humidorData } = await supabase
        .from('humidor_items')
        .select('id, quantity, purchase_date, purchase_price, notes, added_at, cigars(id, name, brand_accounts(name))')
        .eq('user_id', profileData.id)
        .order('added_at', { ascending: false })

      humidorItems = (humidorData || []) as unknown as HumidorItem[]
      setHumidor(humidorItems)
    } else {
      setHumidor([])
    }

    if (isOwn) {
      const { data: wishlistData } = await supabase
        .from('wishlist_items')
        .select('id, added_at, cigars(id, name, vitola, strength, msrp, brand_accounts(name))')
        .eq('user_id', profileData.id)
        .order('added_at', { ascending: false })

      setWishlist((wishlistData || []).map(item => ({
        ...item,
        cigars: item.cigars as unknown as WishlistItem['cigars'],
      })))
    } else {
      setWishlist([])
    }

    const typedReviews = (reviewData || []) as unknown as Review[]
    if (typedReviews.length > 0) {
      const rated = typedReviews.filter(review => review.rating !== null)
      const avgRating = rated.length > 0 ? rated.reduce((sum, review) => sum + (review.rating || 0), 0) / rated.length : null
      const brandCounts: Record<string, number> = {}

      typedReviews.forEach(review => {
        const brandName = review.cigars?.brand_accounts?.name
        if (brandName) {
          brandCounts[brandName] = (brandCounts[brandName] || 0) + 1
        }
      })

      const favoriteBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
      const drawRated = typedReviews.filter(review => review.draw_score !== null)
      const avgDrawScore = drawRated.length > 0 ? drawRated.reduce((sum, review) => sum + (review.draw_score || 0), 0) / drawRated.length : null

      setStats({
        totalReviews: typedReviews.length,
        avgRating,
        favoriteBrand,
        totalHumidor: isOwn || normalizedPrivacy.show_humidor ? humidorItems.length : 0,
        avgDrawScore,
      })
    } else {
      setStats({
        totalReviews: 0,
        avgRating: null,
        favoriteBrand: null,
        totalHumidor: isOwn || normalizedPrivacy.show_humidor ? humidorItems.length : 0,
        avgDrawScore: null,
      })
    }

    setEditUsername(profileData.username)
    setEditFirstName(profileData.first_name || '')
    setEditLastName(profileData.last_name || '')
    setEditHomeZip(profileData.home_zip || '')
    setEditExperience(profileData.experience_level || '')
    setEditPrivacy(normalizedPrivacy)
    setLoading(false)
  }

  async function saveProfile() {
    if (!profile) {
      return
    }

    setEditLoading(true)
    setEditMsg('')
    setCopyMsg('')

    const normalizedZip = editHomeZip.trim()
    if (normalizedZip && !/^\d{5}(-\d{4})?$/.test(normalizedZip)) {
      setEditMsg('Home zip must be a valid 5-digit ZIP code or ZIP+4.')
      setEditLoading(false)
      return
    }

    const normalizedPrivacy: ProfilePrivacy = {
      ...editPrivacy,
      wishlistShareToken: editPrivacy.wishlistShareLinkEnabled
        ? (editPrivacy.wishlistShareToken || createWishlistShareToken())
        : null,
      wishlistShowRealNameOnLink: editPrivacy.wishlistShareLinkEnabled
        ? editPrivacy.wishlistShowRealNameOnLink
        : false,
    }

    const updates: Record<string, unknown> = {
      first_name: editFirstName.trim() || null,
      last_name: editLastName.trim() || null,
      home_zip: normalizedZip || null,
      experience_level: editExperience || null,
      privacy: normalizedPrivacy,
    }
    const usernameChanged = editUsername !== profile.username

    if (usernameChanged) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', editUsername)
        .maybeSingle()

      if (existing) {
        setEditMsg('That username is already taken')
        setEditLoading(false)
        return
      }

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
    if (error) {
      setEditMsg(
        error.message.includes('privacy')
          ? 'Wishlist sharing needs a users.privacy column in Supabase before it can be saved.'
          : error.message
      )
      setEditLoading(false)
      return
    }

    if (usernameChanged) {
      const reviewCount = reviews.length
      await supabase.from('username_history').insert({
        user_id: profile.id,
        old_username: profile.username,
        new_username: editUsername,
        review_count_at_change: reviewCount,
      })
      router.push(`/profile/${editUsername}`)
      return
    }

    setEditPrivacy(normalizedPrivacy)
    setEditMsg('Profile saved!')
    setProfile(prev => (prev ? { ...prev, ...updates, privacy: normalizedPrivacy } as UserProfile : prev))
    setEditLoading(false)
  }

  async function copyWishlistLink() {
    if (!profilePrivacy.wishlistShareLinkEnabled || !profilePrivacy.wishlistShareToken) {
      return
    }

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const link = `${baseUrl}/wishlist/shared/${profilePrivacy.wishlistShareToken}`

    try {
      await navigator.clipboard.writeText(link)
      setCopyMsg('Wishlist link copied.')
    } catch {
      setCopyMsg(link)
    }
  }

  function scoreBar(label: string, value: number | null) {
    if (value === null) {
      return null
    }

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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
        <p style={{ color: '#8b5e2a' }}>Loading profile...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
        <p style={{ color: '#8b5e2a' }}>User not found.</p>
      </div>
    )
  }

  const profilePrivacy = normalizePrivacy(profile.privacy)
  const canViewHumidor = isOwnProfile || profilePrivacy.show_humidor
  const canViewStats = isOwnProfile || profilePrivacy.show_stats
  const canViewActivity = isOwnProfile || profilePrivacy.show_activity

  const navItems: { key: ProfileSection; label: string; ownerOnly?: boolean; hidden?: boolean }[] = [
    { key: 'reviews', label: 'Reviews' },
    { key: 'humidor', label: 'Humidor', hidden: !canViewHumidor },
    { key: 'wishlist', label: 'Wishlist', ownerOnly: true },
    { key: 'stats', label: 'Stats', hidden: !canViewStats },
    { key: 'activity', label: 'Activity', hidden: !canViewActivity },
    { key: 'edit', label: 'Edit Profile', ownerOnly: true },
  ]

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'Georgia, serif' }}>
      <header style={{ background: '#1a0a00', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/" style={{ color: '#f5e6c8', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>CigarDex</a>
        </div>
        <nav style={{ display: 'flex', gap: 24 }}>
          <a href="/" style={{ color: '#c4a96a', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Browse</a>
        </nav>
      </header>

      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '32px 32px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#c4a96a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#1a0a00', flexShrink: 0 }}>
              {profile.username[0].toUpperCase()}
            </div>
            <div>
              <h1 style={{ color: '#f5e6c8', fontSize: 26, fontWeight: 700, margin: '0 0 4px' }}>{profile.username}</h1>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {profile.experience_level && <span style={{ color: '#c4a96a', fontSize: 13 }}>{profile.experience_level}</span>}
                <span style={{ color: '#8b6a4a', fontSize: 13 }}>Member since {joinDate}</span>
                {profile.role === 'super_admin' && <span style={{ background: '#c4a96a', color: '#1a0a00', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>ADMIN</span>}
                {stats && <span style={{ color: '#c4a96a', fontSize: 13 }}>{stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(196,169,106,0.2)' }}>
            {navItems.filter(item => (!item.ownerOnly || isOwnProfile) && !item.hidden).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                style={{
                  padding: '12px 20px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeSection === key ? '3px solid #c4a96a' : '3px solid transparent',
                  color: activeSection === key ? '#f5e6c8' : '#8b6a4a',
                  fontSize: 14,
                  fontWeight: activeSection === key ? 600 : 400,
                  cursor: 'pointer',
                  marginBottom: -1,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 48px' }}>
        {activeSection === 'reviews' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>
              Reviews <span style={{ fontSize: 14, color: '#8b5e2a', fontWeight: 400 }}>({reviews.length})</span>
            </h2>
            {reviews.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                <p style={{ fontSize: 16, marginBottom: 8 }}>No reviews yet</p>
                {isOwnProfile && <p style={{ fontSize: 13 }}>Find a cigar and share your thoughts.</p>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {reviews.map(review => (
                  <div key={review.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <a href={`/cigar/${review.cigars?.id}`} style={{ textDecoration: 'none' }}>
                          <p style={{ color: '#c4a96a', fontSize: 12, fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{review.cigars?.brand_accounts?.name}</p>
                          <h3 style={{ color: '#1a0a00', fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>{review.cigars?.name}</h3>
                        </a>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#8b5e2a', flexWrap: 'wrap' }}>
                          {review.smoked_at && <span>{new Date(review.smoked_at).toLocaleDateString()}</span>}
                          {review.smoke_duration_minutes && <span>{DURATION_LABELS[review.smoke_duration_minutes] || `${review.smoke_duration_minutes} min`}</span>}
                          {review.where_smoked && <span>{review.where_smoked}</span>}
                          {review.occasion && <span>{review.occasion}</span>}
                        </div>
                      </div>
                      {review.rating !== null && (
                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: 30, fontWeight: 700, color: '#1a0a00', lineHeight: 1 }}>{review.rating.toFixed(1)}</div>
                          <div style={{ fontSize: 11, color: '#aaa' }}>/10</div>
                        </div>
                      )}
                    </div>
                    {review.notes && <p style={{ color: '#444', fontSize: 14, lineHeight: 1.7, margin: '0 0 14px' }}>{review.notes}</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                      {scoreBar('Draw', review.draw_score)}
                      {scoreBar('Burn', review.burn_score)}
                      {scoreBar('Construction', review.construction_score)}
                      {scoreBar('Value', review.value_score)}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {review.strength_impression && <span style={{ fontSize: 11, background: '#f5f0e8', color: '#5a3a1a', padding: '2px 8px', borderRadius: 4 }}>Strength: {review.strength_impression}</span>}
                      {review.body && <span style={{ fontSize: 11, background: '#f5f0e8', color: '#5a3a1a', padding: '2px 8px', borderRadius: 4 }}>Body: {review.body}</span>}
                      {review.finish && review.finish.split(',').map(item => (
                        <span key={item} style={{ fontSize: 11, background: '#f0f4f8', color: '#3a5a7a', padding: '2px 8px', borderRadius: 4 }}>
                          {item.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'humidor' && canViewHumidor && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>
              Humidor <span style={{ fontSize: 14, color: '#8b5e2a', fontWeight: 400 }}>({humidor.length} cigars)</span>
            </h2>
            {humidor.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                <p style={{ fontSize: 16, marginBottom: 8 }}>Humidor is empty</p>
                {isOwnProfile && <p style={{ fontSize: 13 }}>Add cigars to track your collection.</p>}
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
                      {item.purchase_price !== null && item.purchase_price !== undefined && <span>Paid: <strong>${item.purchase_price.toFixed(2)}</strong></span>}
                    </div>
                    {item.purchase_date && <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 6px' }}>Purchased {new Date(item.purchase_date).toLocaleDateString()}</p>}
                    {item.notes && <p style={{ fontSize: 13, color: '#666', margin: 0, fontStyle: 'italic' }}>{item.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'wishlist' && isOwnProfile && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>
              Wishlist <span style={{ fontSize: 14, color: '#8b5e2a', fontWeight: 400 }}>({wishlist.length} cigars)</span>
            </h2>
            {wishlist.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                <p style={{ fontSize: 16, marginBottom: 8 }}>Your wishlist is empty</p>
                <p style={{ fontSize: 13 }}>Add cigars from any cigar detail page.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {wishlist.map(item => (
                  <div key={item.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20 }}>
                    <a href={`/cigar/${item.cigars?.id}`} style={{ textDecoration: 'none' }}>
                      <p style={{ color: '#c4a96a', fontSize: 11, fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.cigars?.brand_accounts?.name}</p>
                      <h3 style={{ color: '#1a0a00', fontSize: 15, fontWeight: 700, margin: '0 0 10px' }}>{item.cigars?.name}</h3>
                    </a>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#5a3a1a', marginBottom: 8, flexWrap: 'wrap' }}>
                      {item.cigars?.vitola && <span>{item.cigars.vitola}</span>}
                      {item.cigars?.strength && <span>{item.cigars.strength}</span>}
                      {item.cigars?.msrp !== null && item.cigars?.msrp !== undefined && <span>${item.cigars.msrp.toFixed(2)}</span>}
                    </div>
                    <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>Added {new Date(item.added_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'stats' && canViewStats && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>Stats</h2>
            {!stats || stats.totalReviews === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                <p style={{ fontSize: 16 }}>No stats yet. Write some reviews first.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Total Reviews', value: stats.totalReviews.toString() },
                  { label: 'Average Rating Given', value: stats.avgRating ? `${stats.avgRating.toFixed(1)} / 10` : '-' },
                  { label: 'Favorite Brand', value: stats.favoriteBrand || '-' },
                  { label: 'Cigars in Humidor', value: stats.totalHumidor.toString() },
                  { label: 'Avg Draw Score', value: stats.avgDrawScore ? stats.avgDrawScore.toFixed(1) : '-' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 24, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', marginBottom: 4 }}>{value}</div>
                    <div style={{ fontSize: 12, color: '#8b5e2a', fontWeight: 500 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'activity' && canViewActivity && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>Recent Activity</h2>
            {reviews.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                <p style={{ fontSize: 16 }}>No activity yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reviews.slice(0, 20).map(review => (
                  <div key={review.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, color: '#1a0a00' }}>
                        Reviewed <a href={`/cigar/${review.cigars?.id}`} style={{ color: '#1a0a00', fontWeight: 600, textDecoration: 'none' }}>{review.cigars?.name}</a>
                        {review.rating !== null && <span style={{ color: '#c4a96a', marginLeft: 8 }}>{review.rating.toFixed(1)}</span>}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: '#aaa' }}>{new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'edit' && isOwnProfile && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', margin: '0 0 24px' }}>Edit Profile</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 14px' }}>Username</h3>
                <input
                  value={editUsername}
                  onChange={event => setEditUsername(event.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const }}
                />
                <p style={{ fontSize: 12, color: '#aaa', margin: '6px 0 0' }}>
                  Your public profile URL will be /profile/{editUsername}
                  {editUsername !== profile.username && <span style={{ color: '#c4a96a', marginLeft: 8 }}>old URL will redirect here automatically</span>}
                </p>
              </div>

              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 14px' }}>Personal Details</h3>
                <p style={{ fontSize: 12, color: '#8b5e2a', margin: '0 0 12px', lineHeight: 1.6 }}>
                  Your name and ZIP code stay private by default. Your name is only shared if you opt into store wishlist lookup, so shops can search by customer name.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <input
                    value={editFirstName}
                    onChange={event => setEditFirstName(event.target.value)}
                    placeholder="First name"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const }}
                  />
                  <input
                    value={editLastName}
                    onChange={event => setEditLastName(event.target.value)}
                    placeholder="Last name"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const }}
                  />
                </div>
                <input
                  value={editHomeZip}
                  onChange={event => setEditHomeZip(event.target.value)}
                  placeholder="Home ZIP code"
                  maxLength={10}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const }}
                />
                <p style={{ fontSize: 12, color: '#aaa', margin: '8px 0 0' }}>
                  Your ZIP code is saved to your account and is never shown publicly on your profile or in store wishlist search.
                </p>
              </div>

              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 14px' }}>Experience Level</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {EXPERIENCE_LEVELS.map(level => (
                    <button
                      key={level}
                      onClick={() => setEditExperience(editExperience === level ? '' : level)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 20,
                        fontSize: 13,
                        background: editExperience === level ? '#1a0a00' : '#f5f0e8',
                        color: editExperience === level ? '#f5e6c8' : '#5a3a1a',
                        border: editExperience === level ? '1px solid #1a0a00' : '1px solid #d4b896',
                        fontWeight: editExperience === level ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <CountryPreferences userId={profile.id} />

              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 14px' }}>Privacy Settings</h3>
                <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 16px' }}>Your reviews always show your username. Everything else is your choice.</p>
                {[
                  { key: 'show_humidor', label: 'Show my humidor publicly' },
                  { key: 'show_stats', label: 'Show my stats publicly' },
                  { key: 'show_activity', label: 'Show my activity feed publicly' },
                  { key: 'show_online', label: 'Show when I was last active' },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, cursor: 'pointer' }}>
                    <div
                      onClick={() => setEditPrivacy(prev => ({ ...prev, [key]: !prev[key as keyof ProfilePrivacy] }))}
                      style={{
                        width: 40,
                        height: 22,
                        borderRadius: 11,
                        position: 'relative',
                        flexShrink: 0,
                        background: editPrivacy[key as keyof ProfilePrivacy] ? '#1a0a00' : '#d4b896',
                        transition: 'background 0.2s',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 3,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#fff',
                          transition: 'left 0.2s',
                          left: editPrivacy[key as keyof ProfilePrivacy] ? 21 : 3,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 14, color: '#1a0a00' }}>{label}</span>
                  </label>
                ))}
              </div>

              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 6px' }}>Wishlist Sharing</h3>

                <div style={{ padding: '14px 0', borderBottom: '1px solid #f0e8dc' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a0a00', margin: '0 0 12px' }}>Private link for friends</p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, cursor: 'pointer' }}>
                    <div
                      onClick={() => setEditPrivacy(prev => {
                        const enabled = !prev.wishlistShareLinkEnabled
                        return {
                          ...prev,
                          wishlistShareLinkEnabled: enabled,
                          wishlistShareToken: enabled ? (prev.wishlistShareToken || createWishlistShareToken()) : null,
                          wishlistShowRealNameOnLink: enabled ? prev.wishlistShowRealNameOnLink : false,
                        }
                      })}
                      style={{
                        width: 40,
                        height: 22,
                        borderRadius: 11,
                        position: 'relative',
                        flexShrink: 0,
                        background: editPrivacy.wishlistShareLinkEnabled ? '#1a0a00' : '#d4b896',
                        transition: 'background 0.2s',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 3,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#fff',
                          transition: 'left 0.2s',
                          left: editPrivacy.wishlistShareLinkEnabled ? 21 : 3,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 14, color: '#1a0a00' }}>Create a private wishlist link I can share with friends</span>
                  </label>
                  <p style={{ fontSize: 12, color: '#8b5e2a', margin: '0 0 12px 52px' }}>
                    Use this link when friends or family want to shop from your wishlist.
                  </p>
                  <button
                    onClick={copyWishlistLink}
                    disabled={!profilePrivacy.wishlistShareLinkEnabled || !profilePrivacy.wishlistShareToken}
                    style={{
                      marginLeft: 52,
                      padding: '10px 16px',
                      borderRadius: 8,
                      border: '1px solid #d4b896',
                      background: profilePrivacy.wishlistShareLinkEnabled ? '#f5f0e8' : '#f5f5f5',
                      color: profilePrivacy.wishlistShareLinkEnabled ? '#5a3a1a' : '#aaa',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: profilePrivacy.wishlistShareLinkEnabled ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Copy wishlist link
                  </button>
                  {copyMsg && <p style={{ fontSize: 12, color: '#8b5e2a', margin: '10px 0 0 52px', wordBreak: 'break-all' }}>{copyMsg}</p>}
                  {editPrivacy.wishlistShareLinkEnabled && !profilePrivacy.wishlistShareLinkEnabled && (
                    <p style={{ fontSize: 12, color: '#8b5e2a', margin: '10px 0 0 52px' }}>
                      Save your profile to activate the private wishlist link.
                    </p>
                  )}

                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, marginLeft: 52, cursor: editPrivacy.wishlistShareLinkEnabled ? 'pointer' : 'not-allowed', opacity: editPrivacy.wishlistShareLinkEnabled ? 1 : 0.6 }}>
                    <div
                      onClick={() => {
                        if (!editPrivacy.wishlistShareLinkEnabled) return
                        setEditPrivacy(prev => ({ ...prev, wishlistShowRealNameOnLink: !prev.wishlistShowRealNameOnLink }))
                      }}
                      style={{
                        width: 40,
                        height: 22,
                        borderRadius: 11,
                        position: 'relative',
                        flexShrink: 0,
                        background: editPrivacy.wishlistShareLinkEnabled && editPrivacy.wishlistShowRealNameOnLink ? '#1a0a00' : '#d4b896',
                        transition: 'background 0.2s',
                        cursor: editPrivacy.wishlistShareLinkEnabled ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 3,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#fff',
                          transition: 'left 0.2s',
                          left: editPrivacy.wishlistShareLinkEnabled && editPrivacy.wishlistShowRealNameOnLink ? 21 : 3,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 14, color: '#1a0a00' }}>Show my real name on my shared wishlist link</span>
                  </label>
                </div>

                <div style={{ paddingTop: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a0a00', margin: '0 0 12px' }}>Store lookup</p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, cursor: 'pointer' }}>
                    <div
                      onClick={() => setEditPrivacy(prev => ({ ...prev, wishlistStoreLookupEnabled: !prev.wishlistStoreLookupEnabled }))}
                      style={{
                        width: 40,
                        height: 22,
                        borderRadius: 11,
                        position: 'relative',
                        flexShrink: 0,
                        background: editPrivacy.wishlistStoreLookupEnabled ? '#1a0a00' : '#d4b896',
                        transition: 'background 0.2s',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 3,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#fff',
                          transition: 'left 0.2s',
                          left: editPrivacy.wishlistStoreLookupEnabled ? 21 : 3,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 14, color: '#1a0a00' }}>Let registered stores look up my wishlist by name</span>
                  </label>
                  <p style={{ fontSize: 12, color: '#8b5e2a', margin: '0 0 0 52px' }}>
                    Stores will only see your wishlist if you turn this on. They may use your real name to find it when someone shops for you in person.
                  </p>
                </div>
              </div>

              {editMsg && (
                <p style={{ color: editMsg === 'Profile saved!' ? '#2e7d32' : '#b71c1c', fontSize: 14, background: editMsg === 'Profile saved!' ? '#e8f5e9' : '#fbe9e7', padding: '10px 14px', borderRadius: 6 }}>
                  {editMsg}
                </p>
              )}

              <button
                onClick={saveProfile}
                disabled={editLoading}
                style={{ background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 8, padding: '13px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: editLoading ? 0.7 : 1 }}
              >
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

