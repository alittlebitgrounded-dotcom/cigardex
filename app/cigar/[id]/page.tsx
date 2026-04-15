'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ReviewForm from '@/components/ReviewForm'
import SuggestEdit from '@/components/SuggestEdit'
import type { User } from '@supabase/supabase-js'
import wishIcon from '../../images/wish.png'
import humidorIcon from '../../images/humidor.png'
import ReportError from '@/components/ReportError'
import CigarTimeline from '@/components/CigarTimeline'
import Footer from '@/components/Footer'
import Header from '@/components/Header'

type Cigar = {
  id: string
  name: string
  line: string | null
  vitola: string | null
  strength: string | null
  wrapper_origin: string | null
  wrapper_color: string | null
  binder_origin: string | null
  filler_origins: string | null
  length_inches: number | null
  ring_gauge: number | null
  msrp: number | null
  upc: string | null
  status: string
  is_limited: boolean
  is_discontinued: boolean
  notes: string | null
  sold_as: string | null
  created_at: string
  brand_accounts: {
    id: string
    name: string
    country_of_origin: string | null
    description: string | null
    logo_url: string | null
  } | null
}

type CigarHistory = {
  id: string
  event_type: string
  description: string
  event_date: string | null
}

type Review = {
  id: string
  user_id: string | null
  cigar_id: string | null
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
  revision_notes: string | null
  smoked_at: string | null
  created_at: string | null
  updated_at: string | null
  source_url?: string | null
  users: { username: string; publication_name: string | null; role: string } | null
  _helpful?: number
  _not_helpful?: number
  _my_vote?: string | null
  _pairing?: { category: string; subcategory: string | null; free_text: string | null } | null
}

type Inventory = {
  id: string
  in_stock: boolean
  price: number | null
  url: string | null
  stores: {
    id: string
    name: string
    type: string
    city: string | null
    state: string | null
    address: string | null
    phone: string | null
    website_url: string | null
    latitude: number | null
    longitude: number | null
    store_designations: {
      retailer_designations: { name: string; description: string | null } | null
    }[]
  } | null
}

type StoreBrand = {
  id: string
  store_id: string
  stores: {
    id: string
    name: string
    type: string
    city: string | null
    state: string | null
    address: string | null
    phone: string | null
    website_url: string | null
    latitude: number | null
    longitude: number | null
    store_designations: {
      retailer_designations: { name: string; description: string | null } | null
    }[]
  } | null
}

type CigarDesignation = {
  id: string
  designation_id: string
  retailer_designations: { name: string; description: string | null } | null
}

type Characteristic = {
  id: string
  vote_count: number
  characteristics: { canonical_name: string; category: string } | null
}

type LocationState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'granted'; lat: number; lng: number }
  | { status: 'denied' }
  | { status: 'zip'; lat: number; lng: number; zip: string }

const STRENGTH_LABELS: Record<string, string> = {
  mild: 'Mild', mild_medium: 'Mild-Medium', medium: 'Medium',
  medium_full: 'Medium-Full', full: 'Full',
}
const STRENGTH_BG: Record<string, string> = {
  mild: '#e8f5e9', mild_medium: '#c8e6c9', medium: '#fff3e0',
  medium_full: '#ffe0b2', full: '#fbe9e7',
}
const STRENGTH_TEXT: Record<string, string> = {
  mild: '#2e7d32', mild_medium: '#388e3c', medium: '#e65100',
  medium_full: '#bf360c', full: '#b71c1c',
}

const DURATION_LABELS: Record<number, string> = {
  25: '< 30 min', 38: '30–45 min', 53: '45–60 min',
  75: '1–1.5 hrs', 105: '1.5–2 hrs', 135: '2+ hrs',
}

const REVIEWS_PER_PAGE = 10

type StoreFilter = 'all' | 'brick' | 'online'
type ContentTab = 'reviews' | 'inventory' | 'history'
type MainTab = 'overview' | 'timeline'
type RadiusOption = 25 | 50 | 100 | 9999

function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function geocodeZip(zip: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=us&format=json&limit=1`,
      { headers: { 'User-Agent': 'CigarDex/1.0' } }
    )
    if (res.ok) {
      const data = await res.json()
      if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
  } catch { }
  try {
    const res = await fetch(
      `https://geocoding.geo.census.gov/geocoder/locations/address?zip=${zip}&benchmark=Public_AR_Current&format=json`
    )
    if (res.ok) {
      const data = await res.json()
      const match = data?.result?.addressMatches?.[0]
      if (match) return { lat: match.coordinates.y, lng: match.coordinates.x }
    }
  } catch { }
  return null
}

function sortReviews(reviews: Review[]): Review[] {
  return [...reviews].sort((a, b) => {
    const aIsPress = a.users?.role === 'reviewer' ? 1 : 0
    const bIsPress = b.users?.role === 'reviewer' ? 1 : 0
    if (bIsPress !== aIsPress) return bIsPress - aIsPress
    const aHelpful = (a._helpful || 0) - (a._not_helpful || 0)
    const bHelpful = (b._helpful || 0) - (b._not_helpful || 0)
    if (bHelpful !== aHelpful) return bHelpful - aHelpful
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  })
}

export default function CigarDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [showReportError, setShowReportError] = useState(false)
  const [showSuggestEdit, setShowSuggestEdit] = useState(false)
  const [cigar, setCigar] = useState<Cigar | null>(null)
  const [history, setHistory] = useState<CigarHistory[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [characteristics, setCharacteristics] = useState<Characteristic[]>([])
  const [storeBrands, setStoreBrands] = useState<StoreBrand[]>([])
  const [cigarDesignations, setCigarDesignations] = useState<CigarDesignation[]>([])
  const [allNearbyStores, setAllNearbyStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mainTab, setMainTab] = useState<MainTab>('overview')
  const [contentTab, setContentTab] = useState<ContentTab>('reviews')
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isInHumidor, setIsInHumidor] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [reviewPage, setReviewPage] = useState(1)
  const [votingId, setVotingId] = useState<string | null>(null)
  const [discLineKeys, setDiscLineKeys] = useState<Set<string>>(new Set())
  const [locationState, setLocationState] = useState<LocationState>({ status: 'idle' })
  const [zipInput, setZipInput] = useState('')
  const [zipError, setZipError] = useState('')
  const [zipLoading, setZipLoading] = useState(false)
  const [radiusFilter, setRadiusFilter] = useState<RadiusOption>(50)
  const [tier3ShowAll, setTier3ShowAll] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null)
      if (session?.user) loadUserRole(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUser(session?.user ?? null)
      if (session?.user) loadUserRole(session.user.id)
      else setCurrentUserRole(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadUserRole(userId: string) {
    const { data } = await supabase.from('users').select('role').eq('id', userId).single()
    setCurrentUserRole(data?.role ?? null)
  }

  useEffect(() => { if (id) fetchAll() }, [id])

  useEffect(() => {
    if (!currentUser || !id) { setIsWishlisted(false); setIsInHumidor(false); return }
    loadUserCigarState(currentUser.id, id)
  }, [currentUser, id])

  function showToast(message: string) {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 2200)
  }

  async function loadUserCigarState(userId: string, cigarId: string) {
    const [{ data: wishlistRow }, { data: humidorRow }] = await Promise.all([
      supabase.from('wishlist_items').select('id').eq('user_id', userId).eq('cigar_id', cigarId).maybeSingle(),
      supabase.from('humidor_items').select('id').eq('user_id', userId).eq('cigar_id', cigarId).maybeSingle(),
    ])
    setIsWishlisted(!!wishlistRow)
    setIsInHumidor(!!humidorRow)
  }

  async function handleWishlistToggle() {
    if (!currentUser || !cigar) return
    if (isWishlisted) {
      await supabase.from('wishlist_items').delete().eq('user_id', currentUser.id).eq('cigar_id', cigar.id)
      setIsWishlisted(false); showToast('Removed from Wishlist')
    } else {
      await supabase.from('wishlist_items').insert({ user_id: currentUser.id, cigar_id: cigar.id })
      setIsWishlisted(true); showToast('Added to Wishlist')
    }
  }

  async function handleHumidorToggle() {
    if (!currentUser || !cigar) return
    if (isInHumidor) {
      await supabase.from('humidor_items').delete().eq('user_id', currentUser.id).eq('cigar_id', cigar.id)
      setIsInHumidor(false); showToast('Removed from Humidor')
    } else {
      await supabase.from('humidor_items').insert({ user_id: currentUser.id, cigar_id: cigar.id, added_at: new Date().toISOString() })
      setIsInHumidor(true); showToast('Added to Humidor')
    }
  }

  async function fetchAll() {
    setLoading(true)
    const [cigarRes, historyRes, reviewRes, inventoryRes, charRes, designationRes] = await Promise.all([
      supabase.from('cigars').select('*, brand_accounts(id, name, country_of_origin, description, logo_url, is_discontinued)').eq('id', id).single(),
      supabase.from('cigar_history').select('id, event_type, description, event_date').eq('cigar_id', id).eq('status', 'approved').order('event_date', { ascending: false }),
      supabase.from('reviews').select('id, user_id, cigar_id, rating, notes, draw_score, burn_score, construction_score, value_score, strength_impression, body, finish, occasion, where_smoked, smoke_duration_minutes, revision_notes, smoked_at, created_at, updated_at, source_url').eq('cigar_id', id).order('created_at', { ascending: false }),
      supabase.from('inventory').select('id, in_stock, price, url, stores(id, name, type, city, state, address, phone, website_url, latitude, longitude, store_designations(retailer_designations(name, description)))').eq('cigar_id', id),
      supabase.from('cigar_characteristics').select('id, vote_count, characteristics(canonical_name, category)').eq('cigar_id', id).order('vote_count', { ascending: false }),
      supabase.from('cigar_designations').select('id, designation_id, retailer_designations:retailer_designations!designation_id(name, description)').eq('cigar_id', id),
    ])

    if (cigarRes.data) setCigar(cigarRes.data as unknown as Cigar)
    if (historyRes.data) setHistory(historyRes.data)

    if (cigarRes.data?.brand_accounts?.id) {
      const [sbRes, discLinesRes] = await Promise.all([
        supabase.from('store_brands')
          .select('id, store_id, stores(id, name, type, city, state, address, phone, website_url, latitude, longitude, store_designations(retailer_designations(name, description)))')
          .eq('brand_account_id', cigarRes.data.brand_accounts.id),
        supabase.from('discontinued_lines')
          .select('line_name')
          .eq('brand_account_id', cigarRes.data.brand_accounts.id),
      ])
      if (sbRes.data) setStoreBrands(sbRes.data as unknown as StoreBrand[])
      if (discLinesRes.data) {
        setDiscLineKeys(new Set(discLinesRes.data.map((l: any) => `${cigarRes.data!.brand_accounts!.id}::${l.line_name}`)))
      }
      const { data: allStoresData } = await supabase
        .from('stores')
        .select('id, name, type, city, state, address, phone, website_url, latitude, longitude, active, store_designations(retailer_designations(name, description))')
        .eq('active', true)
      if (allStoresData) setAllNearbyStores(allStoresData)
    }

    if (reviewRes.data) {
      const rawReviews = reviewRes.data as unknown as Review[]
      const reviewIds = rawReviews.map(r => r.id)
      const userIds = rawReviews.map(r => r.user_id).filter((id): id is string => Boolean(id))

      const userDataMap: Record<string, { username: string; publication_name: string | null; role: string }> = {}
      if (userIds.length > 0) {
        const { data: userRows } = await supabase.from('users').select('id, username, publication_name, role').in('id', userIds)
        if (userRows) userRows.forEach((u: any) => {
          userDataMap[u.id] = { username: u.username, publication_name: u.publication_name || null, role: u.role }
        })
      }

      const voteMap: Record<string, { helpful: number; not_helpful: number }> = {}
      const myVoteMap: Record<string, string> = {}
      if (reviewIds.length > 0) {
        const { data: votes } = await supabase.from('review_votes').select('review_id, vote, user_id').in('review_id', reviewIds)
        if (votes) {
          votes.forEach((v: any) => {
            if (!voteMap[v.review_id]) voteMap[v.review_id] = { helpful: 0, not_helpful: 0 }
            if (v.vote === 'helpful') voteMap[v.review_id].helpful++
            else voteMap[v.review_id].not_helpful++
          })
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            votes.filter((v: any) => v.user_id === session.user.id).forEach((v: any) => {
              myVoteMap[v.review_id] = v.vote
            })
          }
        }
      }

      const pairingMap: Record<string, { category: string; subcategory: string | null; free_text: string | null }> = {}
      if (reviewIds.length > 0) {
        const { data: pairings } = await supabase
          .from('review_pairings')
          .select('review_id, free_text, pairing_categories(name), pairing_subcategories(name)')
          .in('review_id', reviewIds)
        if (pairings) {
          pairings.forEach((p: any) => {
            pairingMap[p.review_id] = {
              category: p.pairing_categories?.name || '',
              subcategory: p.pairing_subcategories?.name || null,
              free_text: p.free_text || null,
            }
          })
        }
      }

      const assembled = rawReviews.map(r => ({
        ...r,
        users: r.user_id && userDataMap[r.user_id] ? userDataMap[r.user_id] : null,
        _helpful: voteMap[r.id]?.helpful || 0,
        _not_helpful: voteMap[r.id]?.not_helpful || 0,
        _my_vote: myVoteMap[r.id] || null,
        _pairing: pairingMap[r.id] || null,
      }))

      setReviews(sortReviews(assembled))
    }

    if (inventoryRes.data) setInventory(inventoryRes.data as unknown as Inventory[])
    if (charRes.data) setCharacteristics(charRes.data as unknown as Characteristic[])
    if (designationRes.data) setCigarDesignations(designationRes.data as unknown as CigarDesignation[])
    setLoading(false)
  }

  async function handleVote(reviewId: string, vote: 'helpful' | 'not_helpful') {
    if (!currentUser || votingId) return
    setVotingId(reviewId)
    const existing = reviews.find(r => r.id === reviewId)?._my_vote
    if (existing === vote) {
      await supabase.from('review_votes').delete().eq('review_id', reviewId).eq('user_id', currentUser.id)
      setReviews(prev => sortReviews(prev.map(r => r.id === reviewId ? {
        ...r, _my_vote: null,
        _helpful: vote === 'helpful' ? (r._helpful || 1) - 1 : r._helpful,
        _not_helpful: vote === 'not_helpful' ? (r._not_helpful || 1) - 1 : r._not_helpful,
      } : r)))
    } else if (existing) {
      await supabase.from('review_votes').update({ vote }).eq('review_id', reviewId).eq('user_id', currentUser.id)
      setReviews(prev => sortReviews(prev.map(r => r.id === reviewId ? {
        ...r, _my_vote: vote,
        _helpful: vote === 'helpful' ? (r._helpful || 0) + 1 : (r._helpful || 1) - 1,
        _not_helpful: vote === 'not_helpful' ? (r._not_helpful || 0) + 1 : (r._not_helpful || 1) - 1,
      } : r)))
    } else {
      await supabase.from('review_votes').insert({ review_id: reviewId, user_id: currentUser.id, vote })
      setReviews(prev => sortReviews(prev.map(r => r.id === reviewId ? {
        ...r, _my_vote: vote,
        _helpful: vote === 'helpful' ? (r._helpful || 0) + 1 : r._helpful,
        _not_helpful: vote === 'not_helpful' ? (r._not_helpful || 0) + 1 : r._not_helpful,
      } : r)))
    }
    setVotingId(null)
  }

  async function requestGeolocation() {
    setLocationState({ status: 'requesting' })
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocationState({ status: 'granted', lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationState({ status: 'denied' })
    )
  }

  async function handleZipSubmit() {
    const zip = zipInput.trim()
    if (!/^\d{5}$/.test(zip)) { setZipError('Enter a valid 5-digit zip code'); return }
    setZipError(''); setZipLoading(true)
    const coords = await geocodeZip(zip)
    setZipLoading(false)
    if (!coords) { setZipError('Could not find that zip code — try another'); return }
    setLocationState({ status: 'zip', lat: coords.lat, lng: coords.lng, zip })
  }

  function clearLocation() {
    setLocationState({ status: 'idle' })
    setZipInput('')
    setZipError('')
  }

  function getInventoryWithDistance() {
    const userLat = locationState.status === 'granted' || locationState.status === 'zip' ? locationState.lat : null
    const userLng = locationState.status === 'granted' || locationState.status === 'zip' ? locationState.lng : null
    return inventory
      .filter(inv => {
        if (storeFilter === 'all') return true
        if (storeFilter === 'brick') return inv.stores?.type === 'brick_and_mortar' || inv.stores?.type === 'both'
        if (storeFilter === 'online') return inv.stores?.type === 'online' || inv.stores?.type === 'both'
        return true
      })
      .map(inv => {
        let distance: number | null = null
        if (userLat !== null && userLng !== null && inv.stores?.latitude && inv.stores?.longitude) {
          distance = distanceMiles(userLat, userLng, inv.stores.latitude, inv.stores.longitude)
        }
        return { ...inv, _distance: distance }
      })
      .sort((a, b) => {
        if (a._distance !== null && b._distance !== null) return a._distance - b._distance
        if (a._distance !== null) return -1
        if (b._distance !== null) return 1
        return 0
      })
  }

  function avgRating() {
    const rated = reviews.filter(r => r.rating !== null)
    if (!rated.length) return null
    return (rated.reduce((sum, r) => sum + (r.rating || 0), 0) / rated.length).toFixed(1)
  }

  function avgScore(field: 'draw_score' | 'burn_score' | 'construction_score' | 'value_score') {
    const scored = reviews.filter(r => r[field] !== null)
    if (scored.length < 10) return null
    return scored.reduce((sum, r) => sum + (r[field] || 0), 0) / scored.length
  }

  function storeIcon(type: string) {
    if (type === 'online') return '🌐'
    if (type === 'brick_and_mortar') return '🏪'
    return '🏪🌐'
  }
  function storeTypeLabel(type: string) {
    if (type === 'online') return 'Online'
    if (type === 'brick_and_mortar') return 'In-Store'
    return 'In-Store & Online'
  }
  function priceTier(msrp: number | null): string | null {
    if (!msrp) return null
    if (msrp < 5) return '$'
    if (msrp < 10) return '$$'
    if (msrp < 20) return '$$$'
    if (msrp < 50) return '$$$$'
    return '$$$$$'
  }
  function formatDistance(miles: number): string {
    if (miles < 1) return '< 1 mi'
    return `${Math.round(miles)} mi`
  }

  function ScoreBar({ label, value, avg }: { label: string; value?: number | null; avg?: number | null }) {
    const v = value ?? avg
    if (!v) return null
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: '#5a3a1a' }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a0a00' }}>{v.toFixed(1)}</span>
        </div>
        <div style={{ background: '#f0e8dc', borderRadius: 4, height: 6 }}>
          <div style={{ background: '#c4a96a', borderRadius: 4, height: 6, width: `${(v / 10) * 100}%` }} />
        </div>
      </div>
    )
  }

  const userReview = currentUser ? reviews.find(r => r.user_id === currentUser.id) || null : null
  const totalPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE)
  const pagedReviews = reviews.slice((reviewPage - 1) * REVIEWS_PER_PAGE, reviewPage * REVIEWS_PER_PAGE)
  const showSummary = reviews.length >= 10

  const pressReviewsOnPage = pagedReviews.filter(r => r.users?.role === 'reviewer')
  const communityReviewsOnPage = pagedReviews.filter(r => r.users?.role !== 'reviewer')
  const showDivider = pressReviewsOnPage.length > 0 && communityReviewsOnPage.length > 0

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#8b5e2a' }}>Loading...</p>
    </div>
  )
  if (!cigar) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#8b5e2a' }}>Cigar not found.</p>
    </div>
  )

  const avg = avgRating()
  const charsByCategory: Record<string, Characteristic[]> = {}
  characteristics.forEach(c => {
    const cat = c.characteristics?.category || 'Other'
    if (!charsByCategory[cat]) charsByCategory[cat] = []
    charsByCategory[cat].push(c)
  })

  const avgDraw = avgScore('draw_score')
  const avgBurn = avgScore('burn_score')
  const avgConstruction = avgScore('construction_score')
  const avgValue = avgScore('value_score')

  const inventoryWithDistance = getInventoryWithDistance()
  const hasLocation = locationState.status === 'granted' || locationState.status === 'zip'
  const userLat = hasLocation ? (locationState as any).lat : null
  const userLng = hasLocation ? (locationState as any).lng : null

  const requiredDesignationNames = cigarDesignations.map(d => d.retailer_designations?.name).filter(Boolean)
  const cigarIsDesignationGated = cigarDesignations.length > 0

  const inventoryStoreIds = new Set(inventory.map(inv => inv.stores?.id).filter(Boolean))
  const brandStoresWithDistance = storeBrands
    .filter(sb => !inventoryStoreIds.has(sb.stores?.id))
    .filter(sb => {
      if (storeFilter === 'all') return true
      if (storeFilter === 'brick') return sb.stores?.type === 'brick_and_mortar' || sb.stores?.type === 'both'
      if (storeFilter === 'online') return sb.stores?.type === 'online' || sb.stores?.type === 'both'
      return true
    })
    .map(sb => {
      let distance: number | null = null
      if (userLat !== null && userLng !== null && sb.stores?.latitude && sb.stores?.longitude) {
        distance = distanceMiles(userLat, userLng, sb.stores.latitude, sb.stores.longitude)
      }
      const storeDesigNames = new Set(
        (sb.stores?.store_designations || []).map((sd: any) => sd.retailer_designations?.name).filter(Boolean)
      )
      const meetsDesignationReq = !cigarIsDesignationGated ||
        requiredDesignationNames.every(name => storeDesigNames.has(name))
      return { ...sb, _distance: distance, _isBrandLevel: true, _meetsDesignationReq: meetsDesignationReq }
    })
    .sort((a, b) => {
      if (a._meetsDesignationReq !== b._meetsDesignationReq) return a._meetsDesignationReq ? -1 : 1
      if (a._distance !== null && b._distance !== null) return a._distance - b._distance
      if (a._distance !== null) return -1
      if (b._distance !== null) return 1
      return 0
    })

  const nearbyInventory = hasLocation
    ? inventoryWithDistance.filter(inv => inv._distance === null || inv._distance <= radiusFilter)
    : inventoryWithDistance
  const farInventory = hasLocation
    ? inventoryWithDistance.filter(inv => inv._distance !== null && inv._distance > radiusFilter)
    : []
  const nearbyBrandStores = hasLocation
    ? brandStoresWithDistance.filter(sb => sb._distance === null || sb._distance <= radiusFilter)
    : brandStoresWithDistance
  const farBrandStores = hasLocation
    ? brandStoresWithDistance.filter(sb => sb._distance !== null && sb._distance > radiusFilter)
    : []

  const hasAnyListings = inventoryWithDistance.length > 0 || brandStoresWithDistance.length > 0
  const hasAnyNearby = nearbyInventory.length > 0 || nearbyBrandStores.length > 0

  const tier1and2StoreIds = new Set([
    ...inventoryWithDistance.map(inv => inv.stores?.id),
    ...brandStoresWithDistance.map(sb => sb.stores?.id),
  ].filter(Boolean))

  const tier3Stores = allNearbyStores
    .filter(s => !tier1and2StoreIds.has(s.id))
    .filter(s => {
      if (storeFilter === 'all') return true
      if (storeFilter === 'brick') return s.type === 'brick_and_mortar' || s.type === 'both'
      if (storeFilter === 'online') return s.type === 'online' || s.type === 'both'
      return true
    })
    .map(s => {
      let distance: number | null = null
      if (userLat !== null && userLng !== null && s.latitude && s.longitude) {
        distance = distanceMiles(userLat, userLng, s.latitude, s.longitude)
      }
      return { ...s, _distance: distance }
    })
    .filter(s => !hasLocation || (s._distance !== null && s._distance <= radiusFilter))
    .sort((a, b) => {
      if (cigarIsDesignationGated) {
        const aDesigNames = new Set((a.store_designations || []).map((sd: any) => sd.retailer_designations?.name).filter(Boolean))
        const bDesigNames = new Set((b.store_designations || []).map((sd: any) => sd.retailer_designations?.name).filter(Boolean))
        const aMeets = requiredDesignationNames.every(name => aDesigNames.has(name))
        const bMeets = requiredDesignationNames.every(name => bDesigNames.has(name))
        if (aMeets !== bMeets) return aMeets ? -1 : 1
      }
      // Stores with coordinates sort before stores without
      if (a._distance !== null && b._distance !== null) return a._distance - b._distance
      if (a._distance !== null) return -1
      if (b._distance !== null) return 1
      return 0
    })

  function ReviewCard({ r, isFirst }: { r: Review; isFirst: boolean }) {
    return (
      <div style={{ borderBottom: '1px solid #f0e8dc', paddingBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
              <span style={{ fontWeight: 700, color: '#1a0a00', fontSize: 15 }}>
                {r.users?.username || 'Anonymous'}
                {r.users?.publication_name && <span style={{ fontWeight: 400, color: '#8b5e2a' }}> — {r.users.publication_name}</span>}
              </span>
              {r.users?.role === 'reviewer' && (
                <span style={{ fontSize: 10, fontWeight: 700, background: '#1a0a00', color: '#c4a96a', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em' }}>PRESS</span>
              )}
              {r.users?.role === 'brand' && (
                <span style={{ fontSize: 10, fontWeight: 700, background: '#f5f0e8', color: '#8b5e2a', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em' }}>BRAND REP</span>
              )}
            </div>
            {r.source_url && (
              <a href={r.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#c4a96a', fontWeight: 600, textDecoration: 'none' }}>Read full review →</a>
            )}
            {r.smoked_at && (
              <p style={{ fontSize: 11, color: '#aaa', margin: '3px 0 0' }}>{new Date(r.smoked_at).toLocaleDateString()}</p>
            )}
          </div>
          {r.rating && <span style={{ fontSize: 28, fontWeight: 700, color: '#1a0a00', flexShrink: 0 }}>{r.rating.toFixed(1)}<span style={{ fontSize: 13, color: '#aaa' }}>/10</span></span>}
        </div>
        {r.notes && <p style={{ color: '#444', fontSize: 14, lineHeight: 1.7, margin: '0 0 14px' }}>{r.notes}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', marginBottom: 12 }}>
          <ScoreBar label="Draw" value={r.draw_score} />
          <ScoreBar label="Burn" value={r.burn_score} />
          <ScoreBar label="Construction" value={r.construction_score} />
          <ScoreBar label="Value" value={r.value_score} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {r.strength_impression && <span style={{ fontSize: 12, background: '#f5f0e8', color: '#5a3a1a', padding: '3px 10px', borderRadius: 4 }}>💪 {r.strength_impression}</span>}
          {r.body && <span style={{ fontSize: 12, background: '#f5f0e8', color: '#5a3a1a', padding: '3px 10px', borderRadius: 4 }}>Body: {r.body}</span>}
          {r.finish && r.finish.split(',').map(f => (
            <span key={f} style={{ fontSize: 12, background: '#f5f0e8', color: '#5a3a1a', padding: '3px 10px', borderRadius: 4 }}>Finish: {f.trim()}</span>
          ))}
          {r.occasion && <span style={{ fontSize: 12, background: '#f5f0e8', color: '#5a3a1a', padding: '3px 10px', borderRadius: 4 }}>{r.occasion}</span>}
          {r.where_smoked && <span style={{ fontSize: 12, background: '#f5f0e8', color: '#5a3a1a', padding: '3px 10px', borderRadius: 4 }}>📍 {r.where_smoked}</span>}
          {r.smoke_duration_minutes && DURATION_LABELS[r.smoke_duration_minutes] && (
            <span style={{ fontSize: 12, background: '#f5f0e8', color: '#5a3a1a', padding: '3px 10px', borderRadius: 4 }}>⏱ {DURATION_LABELS[r.smoke_duration_minutes]}</span>
          )}
          {r._pairing && r._pairing.category && (
            <span style={{ fontSize: 12, background: '#e8f0f5', color: '#3a5a7a', padding: '3px 10px', borderRadius: 4 }}>
              🥃 {r._pairing.category}{r._pairing.subcategory ? ` · ${r._pairing.subcategory}` : ''}{r._pairing.free_text ? ` — ${r._pairing.free_text}` : ''}
            </span>
          )}
        </div>
        {r.revision_notes && <p style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic', margin: '0 0 10px' }}>Updated: {r.revision_notes}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <span style={{ fontSize: 12, color: '#aaa' }}>Helpful?</span>
          <button onClick={() => currentUser ? handleVote(r.id, 'helpful') : showToast('Sign in to vote')} disabled={votingId === r.id}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: `1px solid ${r._my_vote === 'helpful' ? '#2e7d32' : '#e8ddd0'}`, background: r._my_vote === 'helpful' ? '#e8f5e9' : '#fff', color: r._my_vote === 'helpful' ? '#2e7d32' : '#8b5e2a', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            👍 {r._helpful || 0}
          </button>
          <button onClick={() => currentUser ? handleVote(r.id, 'not_helpful') : showToast('Sign in to vote')} disabled={votingId === r.id}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: `1px solid ${r._my_vote === 'not_helpful' ? '#b71c1c' : '#e8ddd0'}`, background: r._my_vote === 'not_helpful' ? '#fbe9e7' : '#fff', color: r._my_vote === 'not_helpful' ? '#b71c1c' : '#8b5e2a', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            👎 {r._not_helpful || 0}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif' }}>
      {toastMessage && (
        <div style={{ position: 'fixed', top: 80, right: 24, background: '#1a0a00', color: '#f5e6c8', padding: '12px 16px', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 1000, fontSize: 14, fontWeight: 600 }}>
          {toastMessage}
        </div>
      )}

      <Header />

      <div style={{ background: '#f0e8dc', padding: '10px 32px', fontSize: 13, color: '#8b5e2a' }}>
        <a href="/" style={{ color: '#8b5e2a', textDecoration: 'none' }}>Browse</a>
        <span style={{ margin: '0 8px' }}>›</span>
        <a href={`/brand/${cigar.brand_accounts?.id}`} style={{ color: '#8b5e2a', textDecoration: 'none' }}>{cigar.brand_accounts?.name}</a>
        <span style={{ margin: '0 8px' }}>›</span>
        <span style={{ color: '#1a0a00', fontWeight: 500 }}>{cigar.name}</span>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}>

          <div>
            <div style={{ display: 'flex', borderBottom: '2px solid #e8ddd0', marginBottom: 24 }}>
              {(['overview', 'timeline'] as const).map(tab => (
                <button key={tab} onClick={() => setMainTab(tab)} style={{
                  background: 'none', border: 'none',
                  borderBottom: mainTab === tab ? '2px solid #1a0a00' : '2px solid transparent',
                  marginBottom: -2, padding: '10px 20px', fontSize: 14,
                  fontWeight: mainTab === tab ? 700 : 400,
                  color: mainTab === tab ? '#1a0a00' : '#8b5e2a',
                  cursor: 'pointer', fontFamily: 'Georgia, serif',
                }}>
                  {tab === 'overview' ? 'Overview' : 'Timeline'}
                </button>
              ))}
            </div>

            {mainTab === 'overview' && (
              <div>
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 32, marginBottom: 24 }}>
                  <div style={{ display: 'flex', gap: 24 }}>
                    <div style={{ width: 160, height: 200, background: '#f5f0e8', borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e8ddd0' }}>
                      {cigar.brand_accounts?.logo_url
                        ? <img src={cigar.brand_accounts.logo_url} alt={cigar.brand_accounts.name} style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} />
                        : <span style={{ fontSize: 40 }}>🍂</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      {(cigar.is_discontinued ||
                        (cigar.brand_accounts as any)?.is_discontinued ||
                        (cigar.brand_accounts?.id && cigar.line && discLineKeys.has(`${cigar.brand_accounts.id}::${cigar.line}`))
                      ) && (
                        <span style={{ background: '#F7C1C1', color: '#791F1F', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4, letterSpacing: '0.04em', marginBottom: 10, display: 'inline-block' }}>Discontinued</span>
                      )}
                      {cigar.is_limited && (
                        <span style={{ background: '#fff3e0', color: '#e65100', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4, letterSpacing: '0.05em', marginBottom: 10, display: 'inline-block' }}>LIMITED / DISCONTINUED</span>
                      )}
                      {cigarDesignations.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                          {cigarDesignations.map(d => (
                            <span key={d.id} style={{ background: '#1a0a00', color: '#c4a96a', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4 }}>★ {d.retailer_designations?.name}</span>
                          ))}
                        </div>
                      )}
                      <p style={{ color: '#c4a96a', fontSize: 13, fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cigar.brand_accounts?.name}</p>
                      <h1 style={{ color: '#1a0a00', fontSize: 28, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.2 }}>{cigar.name}</h1>
                      {cigar.line && !cigar.name.toLowerCase().includes(cigar.line.toLowerCase()) && (
                        <p style={{ color: '#8b5e2a', fontSize: 15, margin: '0 0 16px' }}>{cigar.line}</p>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                        {cigar.vitola && <span style={{ background: '#f5f0e8', color: '#5a3a1a', fontSize: 13, padding: '4px 12px', borderRadius: 6, fontWeight: 500 }}>{cigar.vitola}</span>}
                        {cigar.strength && <span style={{ background: STRENGTH_BG[cigar.strength] || '#f5f5f5', color: STRENGTH_TEXT[cigar.strength] || '#555', fontSize: 13, padding: '4px 12px', borderRadius: 6, fontWeight: 500 }}>{STRENGTH_LABELS[cigar.strength] || cigar.strength}</span>}
                        {cigar.wrapper_origin && <span style={{ background: '#f0f4f8', color: '#3a5a7a', fontSize: 13, padding: '4px 12px', borderRadius: 6, fontWeight: 500 }}>{cigar.wrapper_origin}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                        {avg ? (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 32, fontWeight: 700, color: '#1a0a00', lineHeight: 1 }}>{avg}</div>
                            <div style={{ fontSize: 12, color: '#8b5e2a' }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
                          </div>
                        ) : (
                          <div style={{ color: '#aaa', fontSize: 13 }}>No reviews yet</div>
                        )}
                        {cigar.msrp && (
                          <div>
                            <div style={{ fontSize: 26, fontWeight: 700, color: '#1a0a00', letterSpacing: 2 }}>{priceTier(cigar.msrp)}</div>
                            <div style={{ fontSize: 12, color: '#8b5e2a' }}>Price range</div>
                          </div>
                        )}
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          {currentUser ? (
                            <>
                              <button onClick={() => { setMainTab('overview'); setShowReviewForm(prev => !prev) }}
                                style={{ background: showReviewForm ? '#f5f0e8' : '#1a0a00', color: showReviewForm ? '#5a3a1a' : '#f5e6c8', border: showReviewForm ? '1px solid #d4b896' : 'none', borderRadius: 8, padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                                {showReviewForm ? 'Cancel' : userReview ? 'Edit/Update Review' : 'Write a Review'}
                              </button>
                              <button onClick={() => setShowSuggestEdit(true)}
                                style={{ background: 'none', border: '1px solid #c4a96a', color: '#c4a96a', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                                Suggest an Edit
                              </button>
                            </>
                          ) : (
                            <a href="/" style={{ background: '#f5f0e8', color: '#8b5e2a', border: '1px solid #d4b896', borderRadius: 8, padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Sign in to Review</a>
                          )}
                        </div>
                      </div>
                      {currentUser && (
                        <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <button onClick={handleWishlistToggle} title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                            style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                            <img src={wishIcon.src} alt="Wishlist" style={{ width: 32, height: 32, opacity: isWishlisted ? 1 : 0.5 }} />
                          </button>
                          <button onClick={handleHumidorToggle} title={isInHumidor ? 'Remove from Humidor' : 'Add to Humidor'}
                            style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                            <img src={humidorIcon.src} alt="Humidor" style={{ width: 32, height: 32, opacity: isInHumidor ? 1 : 0.5 }} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {showReviewForm && currentUser && (
                    <ReviewForm cigarId={cigar.id} cigarName={cigar.name} userId={currentUser.id} userRole={currentUserRole ?? undefined}
                      existingReview={userReview as never} onSaved={() => { setShowReviewForm(false); fetchAll() }} onCancel={() => setShowReviewForm(false)} />
                  )}
                  {showSuggestEdit && currentUser && (
                    <SuggestEdit cigar={cigar} userId={currentUser.id} onClose={() => setShowSuggestEdit(false)} />
                  )}
                  {showReportError && currentUser && cigar && (
                    <ReportError targetType="cigar" targetId={cigar.id} targetName={cigar.name} userId={currentUser.id} onClose={() => setShowReportError(false)} />
                  )}
                </div>

                {Object.keys(charsByCategory).length > 0 && (
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 24, marginBottom: 24 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>Community Characteristics</h2>
                    {Object.entries(charsByCategory).map(([cat, chars]) => (
                      <div key={cat} style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#5a3a1a', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>{cat}</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {chars.map(c => (
                            <span key={c.id} style={{ background: '#f5f0e8', color: '#5a3a1a', fontSize: 13, padding: '5px 12px', borderRadius: 20, fontWeight: 500, border: '1px solid #e8ddd0' }}>
                              {c.characteristics?.canonical_name}<span style={{ color: '#c4a96a', marginLeft: 6, fontSize: 11 }}>{c.vote_count}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', borderBottom: '1px solid #e8ddd0' }}>
                    {([['reviews', 'Reviews'], ['inventory', 'Where to Buy'], ['history', 'History']] as const).map(([key, label]) => (
                      <button key={key} onClick={() => setContentTab(key)} style={{
                        flex: 1, padding: '14px 0', fontSize: 14,
                        fontWeight: contentTab === key ? 600 : 400,
                        color: contentTab === key ? '#1a0a00' : '#8b5e2a',
                        background: 'none', border: 'none',
                        borderBottom: contentTab === key ? '2px solid #1a0a00' : '2px solid transparent',
                        cursor: 'pointer',
                      }}>
                        {label}
                        {key === 'reviews' && reviews.length > 0 && ` (${reviews.length})`}
                        {key === 'inventory' && inventory.length > 0 && ` (${inventory.length})`}
                      </button>
                    ))}
                  </div>

                  <div style={{ padding: 24 }}>

                    {contentTab === 'reviews' && (
                      reviews.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>
                          <p style={{ fontSize: 16, marginBottom: 8 }}>No reviews yet</p>
                          <p style={{ fontSize: 13 }}>Be the first to review this cigar</p>
                        </div>
                      ) : (
                        <div>
                          {showSummary && (
                            <div style={{ background: '#f5f0e8', borderRadius: 10, padding: 20, marginBottom: 24, border: '1px solid #e8ddd0' }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5e2a', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>Community Summary</p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 48, fontWeight: 700, color: '#1a0a00', lineHeight: 1 }}>{avg}</div>
                                  <div style={{ fontSize: 12, color: '#8b5e2a', marginTop: 4 }}>{reviews.length} reviews</div>
                                </div>
                                <div style={{ flex: 1 }}>
                                  {avgDraw !== null && <ScoreBar label="Draw" avg={avgDraw} />}
                                  {avgBurn !== null && <ScoreBar label="Burn" avg={avgBurn} />}
                                  {avgConstruction !== null && <ScoreBar label="Construction" avg={avgConstruction} />}
                                  {avgValue !== null && <ScoreBar label="Value" avg={avgValue} />}
                                </div>
                              </div>
                            </div>
                          )}

                          {pressReviewsOnPage.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, background: '#1a0a00', color: '#c4a96a', padding: '3px 10px', borderRadius: 4, letterSpacing: '0.05em' }}>PRESS</span>
                              <span style={{ fontSize: 12, color: '#aaa' }}>Professional reviews</span>
                            </div>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {pagedReviews.map((r, i) => {
                              const isFirstCommunity = showDivider && r.users?.role !== 'reviewer' && pagedReviews[i - 1]?.users?.role === 'reviewer'
                              return (
                                <div key={r.id}>
                                  {isFirstCommunity && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, marginTop: 4 }}>
                                      <div style={{ flex: 1, height: 1, background: '#e8ddd0' }} />
                                      <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5e2a', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Community Reviews</span>
                                      <div style={{ flex: 1, height: 1, background: '#e8ddd0' }} />
                                    </div>
                                  )}
                                  <ReviewCard r={r} isFirst={i === 0} />
                                </div>
                              )
                            })}
                          </div>

                          {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24, alignItems: 'center' }}>
                              <button onClick={() => setReviewPage(p => Math.max(1, p - 1))} disabled={reviewPage === 1}
                                style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #d4b896', background: reviewPage === 1 ? '#f5f5f5' : '#fff', color: reviewPage === 1 ? '#ccc' : '#5a3a1a', fontSize: 13, cursor: reviewPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 500 }}>← Prev</button>
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setReviewPage(p)}
                                  style={{ padding: '7px 12px', borderRadius: 6, border: `1px solid ${p === reviewPage ? '#1a0a00' : '#d4b896'}`, background: p === reviewPage ? '#1a0a00' : '#fff', color: p === reviewPage ? '#f5e6c8' : '#5a3a1a', fontSize: 13, cursor: 'pointer', fontWeight: p === reviewPage ? 700 : 400 }}>{p}</button>
                              ))}
                              <button onClick={() => setReviewPage(p => Math.min(totalPages, p + 1))} disabled={reviewPage === totalPages}
                                style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #d4b896', background: reviewPage === totalPages ? '#f5f5f5' : '#fff', color: reviewPage === totalPages ? '#ccc' : '#5a3a1a', fontSize: 13, cursor: reviewPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 500 }}>Next →</button>
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {contentTab === 'inventory' && (
                      <div>
                        <div style={{ background: '#faf8f5', border: '1px solid #e8ddd0', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                          <p style={{ fontSize: 12, color: '#8b5e2a', margin: 0, lineHeight: 1.6 }}>
                            <strong style={{ color: '#5a3a1a' }}>Availability not guaranteed.</strong> Store information is provided by retailers and may be incomplete or out of date. Always contact the store directly to confirm a cigar is in stock before visiting.
                          </p>
                        </div>

                        <div style={{ background: '#fff', border: '1px solid #e8ddd0', borderRadius: 10, padding: 20, marginBottom: 20 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#1a0a00', margin: '0 0 12px' }}>📍 Find stores near you</p>

                          {locationState.status === 'idle' && (
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                              <button onClick={requestGeolocation}
                                style={{ padding: '9px 18px', borderRadius: 7, background: '#1a0a00', color: '#f5e6c8', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                Use my location
                              </button>
                              <span style={{ fontSize: 13, color: '#aaa', alignSelf: 'center' }}>or</span>
                              <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}>
                                <input value={zipInput} onChange={e => { setZipInput(e.target.value); setZipError('') }}
                                  onKeyDown={e => e.key === 'Enter' && handleZipSubmit()} placeholder="Enter zip code" maxLength={5}
                                  style={{ flex: 1, padding: '9px 12px', borderRadius: 7, border: `1px solid ${zipError ? '#b71c1c' : '#d4b896'}`, fontSize: 13, outline: 'none' }} />
                                <button onClick={handleZipSubmit} disabled={zipLoading}
                                  style={{ padding: '9px 16px', borderRadius: 7, background: '#f5f0e8', color: '#5a3a1a', border: '1px solid #d4b896', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                  {zipLoading ? '...' : 'Search'}
                                </button>
                              </div>
                              {zipError && <p style={{ fontSize: 12, color: '#b71c1c', margin: 0, width: '100%' }}>{zipError}</p>}
                            </div>
                          )}

                          {locationState.status === 'requesting' && (
                            <p style={{ fontSize: 13, color: '#8b5e2a', margin: 0 }}>Requesting location access...</p>
                          )}

                          {locationState.status === 'denied' && (
                            <div>
                              <p style={{ fontSize: 13, color: '#b71c1c', margin: '0 0 10px' }}>Location access denied. Try entering your zip code instead.</p>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <input value={zipInput} onChange={e => { setZipInput(e.target.value); setZipError('') }}
                                  onKeyDown={e => e.key === 'Enter' && handleZipSubmit()} placeholder="Enter zip code" maxLength={5}
                                  style={{ flex: 1, padding: '9px 12px', borderRadius: 7, border: `1px solid ${zipError ? '#b71c1c' : '#d4b896'}`, fontSize: 13, outline: 'none' }} />
                                <button onClick={handleZipSubmit} disabled={zipLoading}
                                  style={{ padding: '9px 16px', borderRadius: 7, background: '#f5f0e8', color: '#5a3a1a', border: '1px solid #d4b896', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                  {zipLoading ? '...' : 'Search'}
                                </button>
                              </div>
                              {zipError && <p style={{ fontSize: 12, color: '#b71c1c', margin: '6px 0 0' }}>{zipError}</p>}
                            </div>
                          )}

                          {(locationState.status === 'granted' || locationState.status === 'zip') && (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
                                    ✓ {locationState.status === 'zip' ? `Showing results near ${locationState.zip}` : 'Using your location'}
                                  </span>
                                  <button onClick={clearLocation} style={{ fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear</button>
                                </div>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <span style={{ fontSize: 12, color: '#8b5e2a' }}>Within:</span>
                                  {([25, 50, 100, 9999] as RadiusOption[]).map(r => (
                                    <button key={r} onClick={() => setRadiusFilter(r)}
                                      style={{ padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: radiusFilter === r ? 700 : 400, background: radiusFilter === r ? '#1a0a00' : '#f5f0e8', color: radiusFilter === r ? '#f5e6c8' : '#5a3a1a', border: radiusFilter === r ? '1px solid #1a0a00' : '1px solid #d4b896', cursor: 'pointer' }}>
                                      {r === 9999 ? 'Any' : `${r} mi`}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                          {([['all', 'All'], ['brick', '🏪 In-Store'], ['online', '🌐 Online']] as const).map(([val, label]) => (
                            <button key={val} onClick={() => setStoreFilter(val)} style={{
                              padding: '7px 16px', borderRadius: 6, fontSize: 13,
                              fontWeight: storeFilter === val ? 600 : 400,
                              background: storeFilter === val ? '#1a0a00' : '#f5f0e8',
                              color: storeFilter === val ? '#f5e6c8' : '#5a3a1a',
                              border: storeFilter === val ? '1px solid #1a0a00' : '1px solid #d4b896',
                              cursor: 'pointer',
                            }}>{label}</button>
                          ))}
                        </div>

                        {cigarDesignations.length > 0 && (
                          <div style={{ background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#e65100' }}>
                            <strong>Note:</strong> This cigar requires a special retailer designation — {cigarDesignations.map(d => d.retailer_designations?.name).join(', ')}.
                          </div>
                        )}

                        {/* ===== TIER 1: Exact inventory ===== */}
                        {!hasAnyListings && tier3Stores.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>
                            <p style={{ fontSize: 16, marginBottom: 8 }}>No store listings yet</p>
                            <p style={{ fontSize: 13 }}>We don't have any retailer data for this cigar yet.</p>
                          </div>
                        )}

                        {nearbyInventory.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                            {nearbyInventory.map(inv => {
                              const storeDesigs = inv.stores?.store_designations?.map(sd => sd.retailer_designations?.name).filter(Boolean) || []
                              return (
                                <div key={inv.id} style={{ padding: '14px 16px', background: '#faf8f5', borderRadius: 8, border: '1px solid #e8ddd0' }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 16 }}>{storeIcon(inv.stores?.type || '')}</span>
                                        <span style={{ fontWeight: 600, color: '#1a0a00', fontSize: 15 }}>{inv.stores?.name}</span>
                                        <span style={{ fontSize: 11, color: '#8b5e2a', background: '#f0e8dc', padding: '2px 8px', borderRadius: 4 }}>{storeTypeLabel(inv.stores?.type || '')}</span>
                                        {inv._distance !== null && (
                                          <span style={{ fontSize: 11, color: '#c4a96a', fontWeight: 600, background: '#faf8f0', border: '1px solid #e8d8b0', padding: '2px 8px', borderRadius: 4 }}>
                                            📍 {formatDistance(inv._distance!)}
                                          </span>
                                        )}
                                      </div>
                                      {(inv.stores?.city || inv.stores?.state) && (
                                        <p style={{ fontSize: 12, color: '#8b5e2a', margin: '0 0 4px', paddingLeft: 24 }}>
                                          {[inv.stores?.address, inv.stores?.city, inv.stores?.state].filter(Boolean).join(', ')}
                                        </p>
                                      )}
                                      {inv.stores?.phone && (
                                        <p style={{ fontSize: 12, color: '#8b5e2a', margin: '0 0 4px', paddingLeft: 24 }}>
                                          <a href={`tel:${inv.stores.phone}`} style={{ color: '#8b5e2a', textDecoration: 'none' }}>{inv.stores.phone}</a>
                                        </p>
                                      )}
                                      {storeDesigs.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 24 }}>
                                          {storeDesigs.map((d, i) => <span key={i} style={{ fontSize: 11, fontWeight: 600, color: '#1a0a00', background: '#c4a96a', padding: '2px 8px', borderRadius: 4 }}>★ {d}</span>)}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' as const }}>
                                      {inv.price && <span style={{ fontWeight: 700, fontSize: 16, color: '#1a0a00' }}>${inv.price.toFixed(2)}</span>}
                                      <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 4, background: inv.in_stock ? '#e8f5e9' : '#fbe9e7', color: inv.in_stock ? '#2e7d32' : '#b71c1c', fontWeight: 600 }}>
                                        {inv.in_stock ? 'In Stock' : 'Out of Stock'}
                                      </span>
                                      <div style={{ display: 'flex', gap: 8 }}>
                                        {inv.url && <a href={inv.url} target="_blank" rel="noopener noreferrer" style={{ color: '#c4a96a', fontSize: 13, fontWeight: 500 }}>Buy →</a>}
                                        {inv.stores?.website_url && <a href={inv.stores.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#8b5e2a', fontSize: 12 }}>Website →</a>}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* ===== TIER 2: Brand stores ===== */}
                        {nearbyBrandStores.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            {nearbyInventory.length === 0 && (
                              <p style={{ fontSize: 12, color: '#8b5e2a', fontWeight: 600, margin: '0 0 10px', background: '#f5f0e8', padding: '8px 12px', borderRadius: 6, border: '1px solid #e8ddd0' }}>
                                🏷 These shops are in your area and carry <strong>{cigar?.brand_accounts?.name}</strong> — they may or may not have this specific cigar in stock. Contact them to confirm.
                              </p>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {nearbyBrandStores.map(sb => {
                                const storeDesigs = sb.stores?.store_designations?.map((sd: any) => sd.retailer_designations?.name).filter(Boolean) || []
                                const qualifies = sb._meetsDesignationReq
                                return (
                                  <div key={sb.id} style={{ padding: '14px 16px', background: '#faf8f5', borderRadius: 8, border: `1px solid ${!qualifies && cigarIsDesignationGated ? '#ffe0b2' : '#e8ddd0'}` }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                          <span style={{ fontSize: 16 }}>{storeIcon(sb.stores?.type || '')}</span>
                                          <span style={{ fontWeight: 600, color: '#1a0a00', fontSize: 15 }}>{sb.stores?.name}</span>
                                          <span style={{ fontSize: 11, color: '#8b5e2a', background: '#f0e8dc', padding: '2px 8px', borderRadius: 4 }}>{storeTypeLabel(sb.stores?.type || '')}</span>
                                          {sb._distance !== null && (
                                            <span style={{ fontSize: 11, color: '#c4a96a', fontWeight: 600, background: '#faf8f0', border: '1px solid #e8d8b0', padding: '2px 8px', borderRadius: 4 }}>
                                              📍 {formatDistance(sb._distance!)}
                                            </span>
                                          )}
                                        </div>
                                        {(sb.stores?.city || sb.stores?.state) && (
                                          <p style={{ fontSize: 12, color: '#8b5e2a', margin: '0 0 4px', paddingLeft: 24 }}>
                                            {[sb.stores?.address, sb.stores?.city, sb.stores?.state].filter(Boolean).join(', ')}
                                          </p>
                                        )}
                                        {sb.stores?.phone && (
                                          <p style={{ fontSize: 12, color: '#8b5e2a', margin: '0 0 4px', paddingLeft: 24 }}>
                                            <a href={`tel:${sb.stores.phone}`} style={{ color: '#8b5e2a', textDecoration: 'none' }}>{sb.stores.phone}</a>
                                          </p>
                                        )}
                                        {storeDesigs.length > 0 && (
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 24 }}>
                                            {storeDesigs.map((d: string, i: number) => <span key={i} style={{ fontSize: 11, fontWeight: 600, color: '#1a0a00', background: '#c4a96a', padding: '2px 8px', borderRadius: 4 }}>★ {d}</span>)}
                                          </div>
                                        )}
                                        {cigarIsDesignationGated && !qualifies && (
                                          <p style={{ fontSize: 11, color: '#e65100', margin: '6px 0 0', paddingLeft: 24, fontStyle: 'italic' }}>
                                            ⚠ Availability unknown — this cigar requires {requiredDesignationNames.join(', ')} status. Contact the store to confirm.
                                          </p>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                                        {sb.stores?.website_url && <a href={sb.stores.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#8b5e2a', fontSize: 12 }}>Website →</a>}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* ===== TIER 3: All other nearby stores ===== */}
                        {tier3Stores.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <p style={{ fontSize: 12, color: '#8b5e2a', fontWeight: 600, margin: '0 0 10px', background: '#f5f0e8', padding: '8px 12px', borderRadius: 6, border: '1px solid #e8ddd0' }}>
                              🏪 Other tobacconists in your area — call ahead to check availability
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
  
{(tier3ShowAll ? tier3Stores : tier3Stores.slice(0, 10)).map(s => {
  const storeDesigs =
    (s.store_designations || [])
      .map((sd: any) => sd.retailer_designations?.name)
      .filter(Boolean)
      .slice(0, 3)

  return (
    <div key={s.id} style={{ padding: '14px 16px', background: '#faf8f5', borderRadius: 8, border: '1px solid #e8ddd0', opacity: 0.8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16 }}>{storeIcon(s.type || '')}</span>
            <span style={{ fontWeight: 600, color: '#1a0a00', fontSize: 15 }}>{s.name}</span>
            <span style={{ fontSize: 11, color: '#8b5e2a', background: '#f0e8dc', padding: '2px 8px', borderRadius: 4 }}>
              {storeTypeLabel(s.type || '')}
            </span>
            {s._distance !== null && (
              <span style={{ fontSize: 11, color: '#c4a96a', fontWeight: 600, background: '#faf8f0', border: '1px solid #e8d8b0', padding: '2px 8px', borderRadius: 4 }}>
                📍 {formatDistance(s._distance)}
              </span>
            )}
          </div>

          {(s.city || s.state) && (
            <p style={{ fontSize: 12, color: '#8b5e2a', margin: '0 0 4px', paddingLeft: 24 }}>
              {[s.address, s.city, s.state].filter(Boolean).join(', ')}
            </p>
          )}

          {s.phone && (
            <p style={{ fontSize: 12, color: '#8b5e2a', margin: '0 0 4px', paddingLeft: 24 }}>
              <a href={`tel:${s.phone}`} style={{ color: '#8b5e2a', textDecoration: 'none' }}>{s.phone}</a>
            </p>
          )}

          {storeDesigs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 24 }}>
              {storeDesigs.map((d: string, i: number) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#1a0a00',
                    background: '#c4a96a',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  ★ {d}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ flexShrink: 0 }}>
          {s.website_url && (
            <a href={s.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#8b5e2a', fontSize: 12 }}>
              Website →
            </a>
          )}
        </div>
      </div>
    </div>
  )
})}

                            </div>
                            {tier3Stores.length > 10 && (
                              <button onClick={() => setTier3ShowAll(prev => !prev)}
                                style={{ marginTop: 10, width: '100%', padding: '8px 0', borderRadius: 6, border: '1px solid #d4b896', background: '#f5f0e8', color: '#5a3a1a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                {tier3ShowAll ? 'Show fewer' : `Show ${tier3Stores.length - 10} more nearby stores`}
                              </button>
                            )}
                          </div>
                        )}

                        {hasLocation && !hasAnyNearby && (farInventory.length > 0 || farBrandStores.length > 0) && (
                          <div style={{ background: '#f5f0e8', border: '1px solid #e8ddd0', borderRadius: 8, padding: '16px 20px', marginBottom: 20, textAlign: 'center' }}>
                            <p style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 6px' }}>No listings within {radiusFilter === 9999 ? 'your area' : `${radiusFilter} miles`}</p>
                            <p style={{ fontSize: 13, color: '#8b5e2a', margin: 0 }}>These stores are further away — contact them to confirm availability before visiting.</p>
                          </div>
                        )}

                        {hasLocation && !hasAnyNearby && farInventory.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: farBrandStores.length > 0 ? 16 : 0 }}>
                            {farInventory.map(inv => (
                              <div key={inv.id} style={{ padding: '14px 16px', background: '#faf8f5', borderRadius: 8, border: '1px solid #e8ddd0', opacity: 0.85 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: 16 }}>{storeIcon(inv.stores?.type || '')}</span>
                                      <span style={{ fontWeight: 600, color: '#1a0a00', fontSize: 15 }}>{inv.stores?.name}</span>
                                      {inv._distance !== null && <span style={{ fontSize: 11, color: '#aaa', background: '#f5f5f5', border: '1px solid #e0e0e0', padding: '2px 8px', borderRadius: 4 }}>📍 {formatDistance(inv._distance!)} away</span>}
                                    </div>
                                    {(inv.stores?.city || inv.stores?.state) && <p style={{ fontSize: 12, color: '#8b5e2a', margin: '0 0 4px', paddingLeft: 24 }}>{[inv.stores?.city, inv.stores?.state].filter(Boolean).join(', ')}</p>}
                                    {inv.stores?.phone && <p style={{ fontSize: 12, color: '#8b5e2a', margin: 0, paddingLeft: 24 }}><a href={`tel:${inv.stores.phone}`} style={{ color: '#8b5e2a', textDecoration: 'none' }}>{inv.stores.phone}</a></p>}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                                    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 4, background: inv.in_stock ? '#e8f5e9' : '#fbe9e7', color: inv.in_stock ? '#2e7d32' : '#b71c1c', fontWeight: 600 }}>{inv.in_stock ? 'In Stock' : 'Out of Stock'}</span>
                                    {inv.stores?.website_url && <a href={inv.stores.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#8b5e2a', fontSize: 12 }}>Website →</a>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {hasLocation && !hasAnyNearby && farBrandStores.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {farBrandStores.map(sb => (
                              <div key={sb.id} style={{ padding: '14px 16px', background: '#faf8f5', borderRadius: 8, border: '1px solid #e8ddd0', opacity: 0.85 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: 16 }}>{storeIcon(sb.stores?.type || '')}</span>
                                      <span style={{ fontWeight: 600, color: '#1a0a00', fontSize: 15 }}>{sb.stores?.name}</span>
                                      {sb._distance !== null && <span style={{ fontSize: 11, color: '#aaa', background: '#f5f5f5', border: '1px solid #e0e0e0', padding: '2px 8px', borderRadius: 4 }}>📍 {formatDistance(sb._distance!)} away</span>}
                                    </div>
                                    {(sb.stores?.city || sb.stores?.state) && <p style={{ fontSize: 12, color: '#8b5e2a', margin: '0 0 4px', paddingLeft: 24 }}>{[sb.stores?.city, sb.stores?.state].filter(Boolean).join(', ')}</p>}
                                    {sb.stores?.phone && <p style={{ fontSize: 12, color: '#8b5e2a', margin: 0, paddingLeft: 24 }}><a href={`tel:${sb.stores.phone}`} style={{ color: '#8b5e2a', textDecoration: 'none' }}>{sb.stores.phone}</a></p>}
                                  </div>
                                  <div style={{ flexShrink: 0 }}>
                                    {sb.stores?.website_url && <a href={sb.stores.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#8b5e2a', fontSize: 12 }}>Website →</a>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {(hasAnyListings || tier3Stores.length > 0) && (
                          <p style={{ fontSize: 11, color: '#bbb', margin: '20px 0 0', lineHeight: 1.5 }}>
                            Store information is self-reported by retailers and may not reflect current inventory. Stock status and pricing may have changed. CigarDex is not responsible for inaccurate listings.
                          </p>
                        )}
                      </div>
                    )}

                    {contentTab === 'history' && (
                      history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}><p>No history recorded yet</p></div>
                      ) : (
                        <div style={{ position: 'relative', paddingLeft: 24 }}>
                          <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: '#e8ddd0' }} />
                          {history.map(h => (
                            <div key={h.id} style={{ position: 'relative', marginBottom: 24 }}>
                              <div style={{ position: 'absolute', left: -20, top: 4, width: 10, height: 10, borderRadius: '50%', background: '#c4a96a', border: '2px solid #fff' }} />
                              <p style={{ fontSize: 12, color: '#8b5e2a', margin: '0 0 4px' }}>{h.event_date || 'Date unknown'} · {h.event_type}</p>
                              <p style={{ fontSize: 14, color: '#1a0a00', margin: 0 }}>{h.description}</p>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                  </div>
                </div>
              </div>
            )}

            {mainTab === 'timeline' && (
              <CigarTimeline cigarId={cigar.id} userRole={currentUserRole} userId={currentUser?.id ?? null} />
            )}
          </div>

          <div>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 24, position: 'sticky', top: 88 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>Specifications</h2>
              {[
                ['Vitola', cigar.vitola],
                ['Length', cigar.length_inches ? `${cigar.length_inches}"` : null],
                ['Ring Gauge', cigar.ring_gauge?.toString()],
                ['Strength', cigar.strength ? STRENGTH_LABELS[cigar.strength] : null],
                ['Wrapper', cigar.wrapper_color ? `${cigar.wrapper_color}${cigar.wrapper_origin ? ` · ${cigar.wrapper_origin}` : ''}` : cigar.wrapper_origin],
                ['Binder', cigar.binder_origin],
                ['Filler', cigar.filler_origins],
                ['UPC', cigar.upc],
                ['Price Range', priceTier(cigar.msrp)],
                ['Sold As', cigar.sold_as],
              ].filter(([, val]) => val).map(([label, val]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0e8dc' }}>
                  <span style={{ fontSize: 13, color: '#8b5e2a' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#1a0a00', textAlign: 'right', maxWidth: '60%' }}>{val}</span>
                </div>
              ))}
              {cigar.brand_accounts && (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e8ddd0' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#5a3a1a', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>About {cigar.brand_accounts.name}</h3>
                  {cigar.brand_accounts.country_of_origin && <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 8px' }}>🌍 {cigar.brand_accounts.country_of_origin}</p>}
                  {cigar.brand_accounts.description && <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, margin: 0 }}>{cigar.brand_accounts.description}</p>}
                </div>
              )}
              {currentUser && (
                <button onClick={handleHumidorToggle}
                  style={{ width: '100%', marginTop: 24, background: isInHumidor ? '#c4a96a' : '#f5f0e8', color: isInHumidor ? '#1a0a00' : '#5a3a1a', border: '1px solid #d4b896', borderRadius: 8, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  {isInHumidor ? 'Remove from Humidor' : '+ Add to Humidor'}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </div>
  )
}
