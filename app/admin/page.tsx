'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ReportError from '@/components/ReportError'
import CigarTimeline from '@/components/CigarTimeline'
import type { User } from '@supabase/supabase-js'

type Brand = {
  id: string
  name: string
  country_of_origin: string | null
  founded_year: string | null
  description: string | null
  logo_url: string | null
  tier: string
}

type Cigar = {
  id: string
  name: string
  line: string | null
  vitola: string | null
  strength: string | null
  wrapper_origin: string | null
  msrp: number | null
  status: string
  avg_rating?: number
  review_count?: number
}

type Line = { name: string; count: number }
type BrandSection = 'cigars' | 'lines' | 'about' | 'history'

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

function CigarCard({ cigar }: { cigar: Cigar }) {
  return (
    <div
      style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s, transform 0.15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
    >
      <h3 style={{ color: '#1a0a00', fontSize: 16, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.3 }}>{cigar.name}</h3>
      {cigar.line && !cigar.name.toLowerCase().includes(cigar.line.toLowerCase()) && (
        <p style={{ color: '#8b5e2a', fontSize: 13, margin: '0 0 10px' }}>{cigar.line}</p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
        {cigar.vitola && <span style={{ background: '#f5f0e8', color: '#5a3a1a', fontSize: 12, padding: '3px 8px', borderRadius: 4, fontWeight: 500 }}>{cigar.vitola}</span>}
        {cigar.strength && <span style={{ background: STRENGTH_BG[cigar.strength] || '#f5f5f5', color: STRENGTH_TEXT[cigar.strength] || '#555', fontSize: 12, padding: '3px 8px', borderRadius: 4, fontWeight: 500 }}>{STRENGTH_LABELS[cigar.strength]}</span>}
        {cigar.wrapper_origin && <span style={{ background: '#f0f4f8', color: '#3a5a7a', fontSize: 12, padding: '3px 8px', borderRadius: 4, fontWeight: 500 }}>{cigar.wrapper_origin}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f0e8dc', paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#1a0a00', fontSize: 15, fontWeight: 700 }}>{cigar.msrp ? `$${cigar.msrp.toFixed(2)}` : 'Price N/A'}</span>
          {cigar.avg_rating && <span style={{ color: '#c4a96a', fontSize: 13 }}>★ {cigar.avg_rating.toFixed(1)}</span>}
          {(cigar.review_count ?? 0) > 0 && !cigar.avg_rating && <span style={{ color: '#8b5e2a', fontSize: 12 }}>{cigar.review_count} review{cigar.review_count !== 1 ? 's' : ''}</span>}
        </div>
        <a href={`/cigar/${cigar.id}`} style={{ color: '#c4a96a', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>View details →</a>
      </div>
    </div>
  )
}

function ScrollRow({ title, cigars, badge, onShuffle, shuffling }: {
  title: string; cigars: Cigar[]; badge?: string
  onShuffle?: () => void; shuffling?: boolean
}) {
  if (cigars.length === 0) return null
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a0a00', margin: 0 }}>{title}</h2>
        {onShuffle && (
          <button onClick={onShuffle} disabled={shuffling}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 20, border: '1px solid #d4b896', background: '#fff', color: '#5a3a1a', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: shuffling ? 0.6 : 1 }}>
            🔀 Shuffle
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'thin' as const }}>
        {cigars.map(c => (
          <div key={c.id} style={{ width: 260, flexShrink: 0 }}>
            <CigarCard cigar={c} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BrandPage() {
  const params = useParams()
  const brandId = params.id as string

  const [brand, setBrand] = useState<Brand | null>(null)
  const [allCigars, setAllCigars] = useState<Cigar[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<BrandSection>('cigars')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showReportError, setShowReportError] = useState(false)

  const [newestCigars, setNewestCigars] = useState<Cigar[]>([])
  const [highestRated, setHighestRated] = useState<Cigar[]>([])
  const [discoverCigars, setDiscoverCigars] = useState<Cigar[]>([])
  const [discoverLoading, setDiscoverLoading] = useState(false)

  const [showBrowseAll, setShowBrowseAll] = useState(false)
  const [browseSearch, setBrowseSearch] = useState('')
  const [browseStrength, setBrowseStrength] = useState('')
  const [showStrengthDropdown, setShowStrengthDropdown] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (brandId) fetchAll() }, [brandId])

  async function fetchAll() {
    setLoading(true)
    const [brandRes, cigarsRes] = await Promise.all([
      supabase.from('brand_accounts').select('id, name, country_of_origin, founded_year, description, logo_url, tier').eq('id', brandId).single(),
      supabase.from('cigars').select('id, name, line, vitola, strength, wrapper_origin, msrp, status').eq('brand_account_id', brandId).eq('status', 'live').order('name'),
    ])
    if (brandRes.data) setBrand(brandRes.data)
    if (cigarsRes.data) {
      setAllCigars(cigarsRes.data)
      buildLines(cigarsRes.data)
      await buildFeaturedSections(cigarsRes.data)
    }
    setLoading(false)
  }

  function buildLines(cigars: Cigar[]) {
    const counts: Record<string, number> = {}
    cigars.forEach(c => { if (c.line) counts[c.line] = (counts[c.line] || 0) + 1 })
    setLines(Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count))
  }

  async function buildFeaturedSections(cigars: Cigar[]) {
    const { data: newest } = await supabase
      .from('cigars').select('id, name, line, vitola, strength, wrapper_origin, msrp, status')
      .eq('brand_account_id', brandId).eq('status', 'live')
      .order('created_at', { ascending: false }).limit(3)
    if (newest) setNewestCigars(newest)

    const cigarIds = cigars.map(c => c.id)
    if (cigarIds.length > 0) {
      const { data: ratings } = await supabase
        .from('reviews').select('cigar_id, rating').in('cigar_id', cigarIds).not('rating', 'is', null)
      if (ratings && ratings.length > 0) {
        const sums: Record<string, { total: number; count: number }> = {}
        ratings.forEach(r => {
          if (!r.cigar_id || !r.rating) return
          if (!sums[r.cigar_id]) sums[r.cigar_id] = { total: 0, count: 0 }
          sums[r.cigar_id].total += r.rating; sums[r.cigar_id].count += 1
        })
        const top = Object.entries(sums)
          .map(([id, v]) => ({ id, avg: v.total / v.count, count: v.count }))
          .sort((a, b) => b.avg - a.avg).slice(0, 3)
        setHighestRated(top.map(t => ({ ...cigars.find(c => c.id === t.id)!, avg_rating: t.avg, review_count: t.count })).filter(Boolean))
      }
    }
    setDiscoverCigars([...cigars].sort(() => Math.random() - 0.5).slice(0, 3))
  }

  function shuffleDiscover() {
    setDiscoverLoading(true)
    setDiscoverCigars([...allCigars].sort(() => Math.random() - 0.5).slice(0, 3))
    setDiscoverLoading(false)
  }

  const filteredBrowse = allCigars.filter(c => {
    const matchSearch = !browseSearch || c.name.toLowerCase().includes(browseSearch.toLowerCase()) || c.line?.toLowerCase().includes(browseSearch.toLowerCase())
    const matchStrength = !browseStrength || c.strength === browseStrength
    return matchSearch && matchStrength
  })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#8b5e2a' }}>Loading...</p>
    </div>
  )

  if (!brand) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#8b5e2a' }}>Brand not found.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif' }}>
      <Header />

      {/* Breadcrumb */}
      <div style={{ background: '#f0e8dc', padding: '10px 32px', fontSize: 13, color: '#8b5e2a' }}>
        <a href="/" style={{ color: '#8b5e2a', textDecoration: 'none' }}>Browse</a>
        <span style={{ margin: '0 8px' }}>›</span>
        <a href="/brands" style={{ color: '#8b5e2a', textDecoration: 'none' }}>Brands</a>
        <span style={{ margin: '0 8px' }}>›</span>
        <span style={{ color: '#1a0a00', fontWeight: 500 }}>{brand.name}</span>
      </div>

      {/* Brand hero */}
      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '32px 32px 0' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
            <div style={{ width: 80, height: 80, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(196,169,106,0.3)' }}>
              {brand.logo_url
                ? <img src={brand.logo_url} alt={brand.name} style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }} />
                : <span style={{ fontSize: 32 }}>🍂</span>}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ color: '#f5e6c8', fontSize: 28, fontWeight: 700, margin: '0 0 6px' }}>{brand.name}</h1>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {brand.country_of_origin && <span style={{ color: '#c4a96a', fontSize: 13 }}>🌍 {brand.country_of_origin}</span>}
                {brand.founded_year && <span style={{ color: '#c4a96a', fontSize: 13 }}>📅 Est. {brand.founded_year}</span>}
                <span style={{ color: '#c4a96a', fontSize: 13 }}>🍂 {allCigars.length} cigars in database</span>
                {lines.length > 0 && <span style={{ color: '#c4a96a', fontSize: 13 }}>📋 {lines.length} lines</span>}
              </div>
            </div>
            {currentUser && (
              <button
                onClick={() => setShowReportError(true)}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(196,169,106,0.3)', color: '#c4a96a', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0 }}
              >
                Report an Error
              </button>
            )}
          </div>

          {showReportError && currentUser && (
            <div style={{ marginBottom: 20 }}>
              <ReportError
                targetType="brand"
                targetId={brand.id}
                targetName={brand.name}
                userId={currentUser.id}
                onClose={() => setShowReportError(false)}
              />
            </div>
          )}

          {/* Nav tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(196,169,106,0.2)' }}>
            {([
              { key: 'cigars', label: 'Cigars' },
              { key: 'lines', label: 'Lines' },
              { key: 'about', label: 'About' },
              { key: 'history', label: 'History' },
            ] as { key: BrandSection; label: string }[]).map(({ key, label }) => (
              <button key={key} onClick={() => { setActiveSection(key); setShowBrowseAll(false) }} style={{
                padding: '12px 24px', background: 'none', border: 'none',
                borderBottom: activeSection === key ? '3px solid #c4a96a' : '3px solid transparent',
                color: activeSection === key ? '#f5e6c8' : '#8b6a4a',
                fontSize: 14, fontWeight: activeSection === key ? 600 : 400,
                cursor: 'pointer', marginBottom: -1,
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px 48px' }}>

        {/* ===== CIGARS — highlights ===== */}
        {activeSection === 'cigars' && !showBrowseAll && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, padding: '16px 24px', background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0' }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 2px' }}>Browse the full {brand.name} catalog</p>
                <p style={{ fontSize: 13, color: '#8b5e2a', margin: 0 }}>{allCigars.length} cigars — search, filter by strength, browse A to Z</p>
              </div>
              <button onClick={() => setShowBrowseAll(true)}
                style={{ background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                Browse All →
              </button>
            </div>
            <ScrollRow title="🆕 Newest Additions" cigars={newestCigars} badge="NEW" />
            {highestRated.length > 0 && <ScrollRow title="⭐ Highest Rated" cigars={highestRated} />}
            <ScrollRow title="🎲 Surprise Me" cigars={discoverCigars} onShuffle={shuffleDiscover} shuffling={discoverLoading} />
          </div>
        )}

        {/* ===== BROWSE ALL ===== */}
        {activeSection === 'cigars' && showBrowseAll && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              <button onClick={() => setShowBrowseAll(false)}
                style={{ background: 'none', border: 'none', color: '#c4a96a', fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: 0 }}>
                ← Back to highlights
              </button>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', margin: 0 }}>All {brand.name} Cigars — A to Z</h1>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="text" placeholder="Search within brand..." value={browseSearch} onChange={e => setBrowseSearch(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 14, outline: 'none', minWidth: 220 }} />
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowStrengthDropdown(!showStrengthDropdown)}
                  style={{ padding: '9px 14px', borderRadius: 6, border: browseStrength ? '2px solid #8b5e2a' : '1px solid #d4b896', background: browseStrength ? STRENGTH_BG[browseStrength] : '#fff', color: browseStrength ? STRENGTH_TEXT[browseStrength] : '#888', fontSize: 14, cursor: 'pointer', fontWeight: browseStrength ? 600 : 400 }}>
                  {browseStrength ? STRENGTH_LABELS[browseStrength] : 'Strength'} ▾
                </button>
                {showStrengthDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff', border: '1px solid #e8ddd0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 50, minWidth: 160, overflow: 'hidden' }}>
                    <button onClick={() => { setBrowseStrength(''); setShowStrengthDropdown(false) }}
                      style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', color: '#888', border: 'none', fontSize: 14, cursor: 'pointer' }}>All strengths</button>
                    {Object.entries(STRENGTH_LABELS).map(([value, label]) => (
                      <button key={value} onClick={() => { setBrowseStrength(value); setShowStrengthDropdown(false) }}
                        style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: browseStrength === value ? STRENGTH_BG[value] : 'none', color: browseStrength === value ? STRENGTH_TEXT[value] : '#333', border: 'none', fontSize: 14, fontWeight: browseStrength === value ? 600 : 400, cursor: 'pointer' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 13, color: '#8b5e2a', marginLeft: 'auto' }}>{filteredBrowse.length} of {allCigars.length} cigars</span>
            </div>
            {filteredBrowse.length === 0 ? (
              <p style={{ color: '#aaa', textAlign: 'center', padding: '40px 0' }}>No cigars match your filters</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
                {filteredBrowse.map(c => <CigarCard key={c.id} cigar={c} />)}
              </div>
            )}
          </div>
        )}

        {/* ===== LINES ===== */}
        {activeSection === 'lines' && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: '0 0 24px' }}>Lines & Collections</h1>
            {lines.length === 0 ? (
              <p style={{ color: '#aaa' }}>No lines recorded yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {lines.map(line => (
                  <div key={line.name}
                    style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}
                    onClick={() => { setBrowseSearch(line.name); setActiveSection('cigars'); setShowBrowseAll(true) }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 6px' }}>{line.name}</h3>
                    <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 10px' }}>{line.count} vitola{line.count !== 1 ? 's' : ''}</p>
                    <span style={{ fontSize: 12, color: '#c4a96a', fontWeight: 500 }}>Browse line →</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== ABOUT ===== */}
        {activeSection === 'about' && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: '0 0 24px' }}>About {brand.name}</h1>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 32 }}>
              {brand.description
                ? <p style={{ fontSize: 15, color: '#333', lineHeight: 1.8, margin: 0 }}>{brand.description}</p>
                : <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>
                    <p style={{ fontSize: 16, marginBottom: 8 }}>No description yet</p>
                    <p style={{ fontSize: 13 }}>Brand owners can add their story here</p>
                  </div>
              }
              <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid #f0e8dc', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                {brand.country_of_origin && (
                  <div>
                    <p style={{ fontSize: 12, color: '#8b5e2a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Country</p>
                    <p style={{ fontSize: 15, color: '#1a0a00', fontWeight: 500, margin: 0 }}>{brand.country_of_origin}</p>
                  </div>
                )}
                {brand.founded_year && (
                  <div>
                    <p style={{ fontSize: 12, color: '#8b5e2a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Founded</p>
                    <p style={{ fontSize: 15, color: '#1a0a00', fontWeight: 500, margin: 0 }}>{brand.founded_year}</p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: 12, color: '#8b5e2a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Cigars in Database</p>
                  <p style={{ fontSize: 15, color: '#1a0a00', fontWeight: 500, margin: 0 }}>{allCigars.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== HISTORY ===== */}
        {activeSection === 'history' && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: '0 0 24px' }}>Brand History</h1>
            <CigarTimeline targetType="brand" targetId={brandId} currentUser={currentUser} />
          </div>
        )}

      </div>
      <Footer />
    </div>
  )
}
