'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useCountryFilter } from '@/hooks/useCountryFilter'

type Cigar = {
  id: string
  name: string
  line: string | null
  vitola: string | null
  strength: string | null
  wrapper_origin: string | null
  wrapper_color: string | null
  msrp: number | null
  status: string
  country_of_origin: string | null
  is_discontinued: boolean
  brand_account_id: string | null
  brand_accounts: { id: string; name: string } | null
}

type Brand = { id: string; name: string }

type FeaturedCigar = Cigar & {
  review_count?: number
  avg_rating?: number
}

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

function priceTier(msrp: number | null): string {
  if (!msrp) return 'Price N/A'
  if (msrp < 5) return '$'
  if (msrp < 10) return '$$'
  if (msrp < 20) return '$$$'
  if (msrp < 50) return '$$$$'
  return '$$$$$'
}

function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function isCigarDiscontinued(
  cigar: { is_discontinued?: boolean; brand_account_id?: string | null; line?: string | null; brand_accounts?: { id: string } | null },
  discBrandIds: Set<string>,
  discLineKeys: Set<string>
): boolean {
  if (cigar.is_discontinued) return true
  const brandId = cigar.brand_account_id || cigar.brand_accounts?.id
  if (brandId && discBrandIds.has(brandId)) return true
  if (brandId && cigar.line && discLineKeys.has(`${brandId}::${cigar.line}`)) return true
  return false
}

function DiscontinuedBadge() {
  return (
    <span style={{ background: '#F7C1C1', color: '#791F1F', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 3, letterSpacing: '0.03em' }}>
      Discontinued
    </span>
  )
}

function CigarCard({ cigar, badge, discBrandIds, discLineKeys }: {
  cigar: FeaturedCigar; badge?: string
  discBrandIds: Set<string>; discLineKeys: Set<string>
}) {
  const disc = isCigarDiscontinued(cigar, discBrandIds, discLineKeys)
  return (
    <div style={{
      background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0',
      padding: 18, width: 240, flexShrink: 0,
      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.15s, transform 0.15s',
      opacity: disc ? 0.85 : 1,
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: badge || disc ? 8 : 0, flexWrap: 'wrap' }}>
        {badge && <div style={{ background: '#1a0a00', color: '#c4a96a', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.06em' }}>{badge}</div>}
        {disc && <DiscontinuedBadge />}
      </div>
      <p style={{ color: '#c4a96a', fontSize: 11, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {cigar.brand_accounts?.name || 'Unknown Brand'}
      </p>
      <h3 style={{ color: '#1a0a00', fontSize: 15, fontWeight: 700, margin: '0 0 8px', lineHeight: 1.3 }}>{cigar.name}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {cigar.vitola && <span style={{ background: '#f5f0e8', color: '#5a3a1a', fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 500 }}>{cigar.vitola}</span>}
        {cigar.strength && <span style={{ background: STRENGTH_BG[cigar.strength] || '#f5f5f5', color: STRENGTH_TEXT[cigar.strength] || '#555', fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 500 }}>{STRENGTH_LABELS[cigar.strength]}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f0e8dc', paddingTop: 10 }}>
        <div>
          <span style={{ color: '#1a0a00', fontSize: 14, fontWeight: 700 }}>{priceTier(cigar.msrp)}</span>
          {cigar.avg_rating && <span style={{ color: '#c4a96a', fontSize: 12, marginLeft: 8 }}>★ {cigar.avg_rating.toFixed(1)}</span>}
          {(cigar.review_count ?? 0) > 0 && !cigar.avg_rating && (
            <span style={{ color: '#8b5e2a', fontSize: 11, display: 'block' }}>{cigar.review_count} review{cigar.review_count !== 1 ? 's' : ''}</span>
          )}
        </div>
        <a href={`/cigar/${cigar.id}`} style={{ color: '#c4a96a', fontSize: 12, fontWeight: 500, textDecoration: 'none' }}>View →</a>
      </div>
    </div>
  )
}

function ScrollRow({ title, cigars, badge, viewMoreHref, discBrandIds, discLineKeys }: {
  title: string; cigars: FeaturedCigar[]; badge?: string; viewMoreHref: string
  discBrandIds: Set<string>; discLineKeys: Set<string>
}) {
  if (cigars.length === 0) return null
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a0a00', margin: 0 }}>{title}</h2>
        <a href={viewMoreHref} style={{ fontSize: 13, color: '#c4a96a', fontWeight: 500, textDecoration: 'none' }}>View more →</a>
      </div>
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'thin' }}>
        {cigars.map(c => <CigarCard key={c.id} cigar={c} badge={badge} discBrandIds={discBrandIds} discLineKeys={discLineKeys} />)}
      </div>
    </div>
  )
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [lines, setLines] = useState<string[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [showStrengthDropdown, setShowStrengthDropdown] = useState(false)
  const [availableCountries, setAvailableCountries] = useState<string[]>([])
  const [discBrandIds, setDiscBrandIds] = useState<Set<string>>(new Set())
  const [discLineKeys, setDiscLineKeys] = useState<Set<string>>(new Set())

  const [newestCigars, setNewestCigars] = useState<FeaturedCigar[]>([])
  const [mostReviewedCigars, setMostReviewedCigars] = useState<FeaturedCigar[]>([])
  const [highestRatedCigars, setHighestRatedCigars] = useState<FeaturedCigar[]>([])
  const [discoverCigars, setDiscoverCigars] = useState<FeaturedCigar[]>([])
  const [discoverLoading, setDiscoverLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedLine, setSelectedLine] = useState('')
  const [selectedStrength, setSelectedStrength] = useState('')
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [hideDiscontinued, setHideDiscontinued] = useState(false)
  const [searchResults, setSearchResults] = useState<Cigar[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [paramsRead, setParamsRead] = useState(false)

  const { filterCigars, excludedCountries } = useCountryFilter({ userId: user?.id ?? null })

  const isSearching = !!(search || selectedBrand || selectedLine || selectedStrength || selectedCountries.length || hideDiscontinued)

  const cigarSelect = 'id, name, line, vitola, strength, wrapper_origin, wrapper_color, msrp, status, country_of_origin, is_discontinued, brand_account_id, brand_accounts!left(id, name)'

  useEffect(() => {
    if (brands.length === 0 || paramsRead) return
    const params = new URLSearchParams(window.location.search)
    const brandParam = params.get('brand')
    if (brandParam) setSelectedBrand(brandParam)
    setParamsRead(true)
  }, [brands, paramsRead])

  useEffect(() => {
    fetchBrands()
    fetchTotalCount()
    fetchFeaturedSections()
    fetchDiscover()
    fetchAvailableCountries()
    fetchDiscontinuedData()
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (isSearching) fetchSearchResults()
    else setSearchResults([])
  }, [search, selectedBrand, selectedLine, selectedStrength, selectedCountries, hideDiscontinued])

  useEffect(() => {
    if (selectedBrand) fetchLines(selectedBrand)
    else { setLines([]); setSelectedLine('') }
  }, [selectedBrand])

  async function fetchDiscontinuedData() {
    const [brandsRes, linesRes] = await Promise.all([
      supabase.from('brand_accounts').select('id').eq('is_discontinued', true),
      supabase.from('discontinued_lines').select('brand_account_id, line_name'),
    ])
    if (brandsRes.data) setDiscBrandIds(new Set(brandsRes.data.map((b: any) => b.id)))
    if (linesRes.data) setDiscLineKeys(new Set(linesRes.data.map((l: any) => `${l.brand_account_id}::${l.line_name}`)))
  }

  async function fetchAvailableCountries() {
    const { data } = await supabase.from('cigars').select('country_of_origin').eq('status', 'live').not('country_of_origin', 'is', null)
    if (data) {
      const unique = [...new Set(data.map(c => c.country_of_origin).filter(Boolean))].sort() as string[]
      setAvailableCountries(unique)
    }
  }

  async function fetchTotalCount() {
    const { count } = await supabase.from('cigars').select('*', { count: 'exact', head: true }).eq('status', 'live')
    if (count !== null) setTotalCount(count)
  }

  async function fetchBrands() {
    const { data } = await supabase.from('brand_accounts').select('id, name').order('name')
    if (data) setBrands(data)
  }

  async function fetchLines(brandId: string) {
    const { data } = await supabase.from('cigars').select('line').eq('brand_account_id', brandId).not('line', 'is', null).order('line')
    if (data) setLines([...new Set(data.map(c => c.line).filter(Boolean))] as string[])
  }

  async function fetchFeaturedSections() {
    const { data: newest } = await supabase.from('cigars').select(cigarSelect).eq('status', 'live').order('created_at', { ascending: false }).limit(50)
    if (newest) setNewestCigars(newest as unknown as FeaturedCigar[])

    const { data: reviewCounts } = await supabase.from('reviews').select('cigar_id')
    if (reviewCounts) {
      const counts: Record<string, number> = {}
      reviewCounts.forEach(r => { if (r.cigar_id) counts[r.cigar_id] = (counts[r.cigar_id] || 0) + 1 })
      const topIds = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([id]) => id)
      if (topIds.length > 0) {
        const { data: top } = await supabase.from('cigars').select(cigarSelect).in('id', topIds).eq('status', 'live')
        if (top) {
          const sorted = topIds.map(id => top.find(c => c.id === id)).filter(Boolean)
          setMostReviewedCigars(sorted.map(c => ({ ...c, review_count: counts[c!.id] || 0 })) as unknown as FeaturedCigar[])
        }
      }
    }

    const { data: ratings } = await supabase.from('reviews').select('cigar_id, rating').not('rating', 'is', null)
    if (ratings) {
      const sums: Record<string, { total: number; count: number }> = {}
      ratings.forEach(r => {
        if (r.cigar_id && r.rating) {
          if (!sums[r.cigar_id]) sums[r.cigar_id] = { total: 0, count: 0 }
          sums[r.cigar_id].total += r.rating; sums[r.cigar_id].count += 1
        }
      })
      const topRated = Object.entries(sums)
        .filter(([, v]) => v.count >= 2)
        .map(([id, v]) => ({ id, avg: v.total / v.count, count: v.count }))
        .sort((a, b) => b.avg - a.avg).slice(0, 50)
      if (topRated.length > 0) {
        const { data: top } = await supabase.from('cigars').select(cigarSelect).in('id', topRated.map(r => r.id)).eq('status', 'live')
        if (top) {
          const sorted = topRated.map(r => top.find(c => c.id === r.id)).filter(Boolean)
          setHighestRatedCigars(sorted.map(c => ({ ...c, avg_rating: topRated.find(r => r.id === c!.id)?.avg, review_count: topRated.find(r => r.id === c!.id)?.count })) as unknown as FeaturedCigar[])
        }
      }
    }
  }

  async function fetchDiscover() {
    setDiscoverLoading(true)
    const { count } = await supabase.from('cigars').select('*', { count: 'exact', head: true }).eq('status', 'live')
    if (!count) { setDiscoverLoading(false); return }
    const offset = Math.floor(Math.random() * Math.max(1, count - 24))
    const { data } = await supabase.from('cigars').select(cigarSelect).eq('status', 'live').range(offset, offset + 23)
    if (data) setDiscoverCigars(data as unknown as FeaturedCigar[])
    setDiscoverLoading(false)
  }

 async function fetchSearchResults() {
    setSearchLoading(true)
    const words = search.trim().split(/\s+/).filter(Boolean).map(normalize)

    let cigarQuery = supabase.from('cigars').select(cigarSelect).eq('status', 'live').order('name').limit(200)
    if (selectedBrand) cigarQuery = cigarQuery.eq('brand_account_id', selectedBrand)
    if (selectedLine) cigarQuery = cigarQuery.eq('line', selectedLine)
    if (selectedStrength) cigarQuery = cigarQuery.eq('strength', selectedStrength)
    if (selectedCountries.length === 1) cigarQuery = cigarQuery.eq('country_of_origin', selectedCountries[0])
    if (selectedCountries.length > 1) cigarQuery = cigarQuery.in('country_of_origin', selectedCountries)
    if (search.trim()) {
      const first = normalize(search.trim().split(/\s+/)[0])
      cigarQuery = cigarQuery.or(`name.ilike.%${first}%,line.ilike.%${first}%,vitola.ilike.%${first}%`)
    }

    // Second query: find matching brand IDs, then fetch their cigars
    let brandResults: any[] = []
    if (search.trim() && !selectedBrand) {
      const first = normalize(search.trim().split(/\s+/)[0])
      const { data: matchingBrands } = await supabase
        .from('brand_accounts')
        .select('id')
        .ilike('name', `%${first}%`)
      if (matchingBrands && matchingBrands.length > 0) {
        const brandIds = matchingBrands.map((b: any) => b.id)
        let bQuery = supabase.from('cigars').select(cigarSelect).eq('status', 'live').in('brand_account_id', brandIds).order('name').limit(200)
        if (selectedLine) bQuery = bQuery.eq('line', selectedLine)
        if (selectedStrength) bQuery = bQuery.eq('strength', selectedStrength)
        if (selectedCountries.length === 1) bQuery = bQuery.eq('country_of_origin', selectedCountries[0])
        if (selectedCountries.length > 1) bQuery = bQuery.in('country_of_origin', selectedCountries)
        const { data: bData } = await bQuery
        if (bData) brandResults = bData as any
      }
    }

    const { data: cigarData } = await cigarQuery
    if (cigarData || brandResults.length > 0) {
      const combined = [...(cigarData ?? []), ...brandResults]
      const seen = new Set<string>()
      const deduped = combined.filter((c: any) => {
        if (seen.has(c.id)) return false
        seen.add(c.id); return true
      })
      let filtered = deduped.filter((c: any) => {
        const haystack = normalize([c.name, c.line, c.vitola, (c.brand_accounts as any)?.name].filter(Boolean).join(' '))
        return words.length === 0 || words.every(w => haystack.includes(w))
      })
      if (hideDiscontinued) {
        filtered = filtered.filter((c: any) => !isCigarDiscontinued(c as any, discBrandIds, discLineKeys))
      }
      setSearchResults(filtered as unknown as Cigar[])
    }
    setSearchLoading(false)
  }
  function toggleCountry(country: string) {
    setSelectedCountries(prev => prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country])
  }

  function clearFilters() {
    setSearch(''); setSelectedBrand(''); setSelectedLine('')
    setSelectedStrength(''); setSelectedCountries([]); setHideDiscontinued(false)
  }

  const activeFilterCount = [selectedBrand, selectedLine, selectedStrength, hideDiscontinued ? 'x' : '', ...selectedCountries].filter(Boolean).length
  const filteredNewest = filterCigars(newestCigars)
  const filteredMostReviewed = filterCigars(mostReviewedCigars)
  const filteredHighestRated = filterCigars(highestRatedCigars)
  const filteredDiscover = filterCigars(discoverCigars)

  const Filters = () => (
    <div style={{ background: '#fff', borderBottom: '1px solid #e8ddd0', padding: '12px 32px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: selectedBrand ? '2px solid #8b5e2a' : '1px solid #d4b896', background: selectedBrand ? '#f5f0e8' : '#fff', fontSize: 14, color: selectedBrand ? '#5a3a1a' : '#888', cursor: 'pointer', minWidth: 150 }}>
            <option value="">All brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          {lines.length > 0 && (
            <select value={selectedLine} onChange={e => setSelectedLine(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 6, border: selectedLine ? '2px solid #8b5e2a' : '1px solid #d4b896', background: selectedLine ? '#f5f0e8' : '#fff', fontSize: 14, color: selectedLine ? '#5a3a1a' : '#888', cursor: 'pointer', minWidth: 130 }}>
              <option value="">All lines</option>
              {lines.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          )}

          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowStrengthDropdown(!showStrengthDropdown)}
              style={{ padding: '8px 14px', borderRadius: 6, border: selectedStrength ? '2px solid #8b5e2a' : '1px solid #d4b896', background: selectedStrength ? STRENGTH_BG[selectedStrength] : '#fff', color: selectedStrength ? STRENGTH_TEXT[selectedStrength] : '#888', fontSize: 14, cursor: 'pointer', fontWeight: selectedStrength ? 600 : 400 }}>
              {selectedStrength ? STRENGTH_LABELS[selectedStrength] : 'Strength'} ▾
            </button>
            {showStrengthDropdown && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff', border: '1px solid #e8ddd0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 50, minWidth: 160, overflow: 'hidden' }}>
                {Object.entries(STRENGTH_LABELS).map(([value, label]) => (
                  <button key={value} onClick={() => { setSelectedStrength(selectedStrength === value ? '' : value); setShowStrengthDropdown(false) }}
                    style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: selectedStrength === value ? STRENGTH_BG[value] : 'none', color: selectedStrength === value ? STRENGTH_TEXT[value] : '#333', border: 'none', fontSize: 14, fontWeight: selectedStrength === value ? 600 : 400, cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ✅ Hide Discontinued toggle — replaces New & Evolving */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 14px', borderRadius: 6, border: hideDiscontinued ? '2px solid #791F1F' : '1px solid #d4b896', background: hideDiscontinued ? '#F7C1C1' : '#fff', fontSize: 14, color: hideDiscontinued ? '#791F1F' : '#888', fontWeight: hideDiscontinued ? 600 : 400 }}>
            <input type="checkbox" checked={hideDiscontinued} onChange={e => setHideDiscontinued(e.target.checked)} style={{ display: 'none' }} />
            Hide Discontinued
          </label>

          {isSearching && (
            <button onClick={clearFilters} style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: '#1a0a00', color: '#f5e6c8', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
              ✕ Clear {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </button>
          )}
          {isSearching && (
            <span style={{ marginLeft: 'auto', fontSize: 13, color: '#8b5e2a' }}>
              {searchLoading ? 'Searching...' : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}
            </span>
          )}
          {!isSearching && excludedCountries.length > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8b5e2a' }}>
              Showing your country preferences — <a href="/profile" style={{ color: '#c4a96a', textDecoration: 'underline' }}>manage</a>
            </span>
          )}
        </div>

        {availableCountries.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#aaa', marginRight: 4, whiteSpace: 'nowrap' }}>Country:</span>
            {availableCountries.map(country => {
              const selected = selectedCountries.includes(country)
              return (
                <button key={country} onClick={() => toggleCountry(country)} style={{ padding: '5px 12px', borderRadius: 20, border: selected ? '2px solid #1a0a00' : '1px solid #d4b896', background: selected ? '#1a0a00' : '#fff', color: selected ? '#f5e6c8' : '#5a3a1a', fontSize: 13, fontWeight: selected ? 600 : 400, cursor: 'pointer', transition: 'all 0.1s', whiteSpace: 'nowrap' }}>
                  {selected && '✓ '}{country}
                </button>
              )
            })}
            {selectedCountries.length > 0 && (
              <button onClick={() => setSelectedCountries([])} style={{ padding: '5px 10px', borderRadius: 20, border: 'none', background: 'none', color: '#aaa', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>clear</button>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif' }}>
      <Header />
      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '48px 32px', textAlign: 'center' }}>
        <h1 style={{ color: '#f5e6c8', fontSize: 34, fontWeight: 700, margin: '0 0 8px' }}>Find Your Perfect Cigar</h1>
        <p style={{ color: '#c4a96a', fontSize: 16, margin: '0 0 4px' }}>Browse, review, and discover cigars recommended by the community</p>
        {totalCount > 0 && <p style={{ color: '#8b5e2a', fontSize: 13, margin: '0 0 28px' }}>{totalCount.toLocaleString()} cigars in the database</p>}
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <input type="text" placeholder="Search by name, brand, line, or vitola..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '15px 20px', fontSize: 16, border: 'none', borderRadius: 8, outline: 'none', boxSizing: 'border-box', background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }} />
        </div>
      </div>

      <Filters />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px 48px' }}>
        {isSearching ? (
          <div>
            {searchLoading ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#8b5e2a' }}>Searching...</div>
            ) : searchResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <p style={{ color: '#8b5e2a', fontSize: 18 }}>No cigars found</p>
                <p style={{ color: '#aaa', fontSize: 14 }}>Try adjusting your filters</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
                {searchResults.map(cigar => {
                  const disc = isCigarDiscontinued(cigar as any, discBrandIds, discLineKeys)
                  return (
                    <div key={cigar.id}
                      style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s, transform 0.15s', opacity: disc ? 0.85 : 1 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
                    >
                      {disc && <div style={{ marginBottom: 8 }}><DiscontinuedBadge /></div>}
                      <p style={{ color: '#c4a96a', fontSize: 12, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cigar.brand_accounts?.name}</p>
                      <h3 style={{ color: '#1a0a00', fontSize: 17, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.3 }}>{cigar.name}</h3>
                      {cigar.line && !cigar.name?.toLowerCase().includes(cigar.line?.toLowerCase()) && (
                        <p style={{ color: '#8b5e2a', fontSize: 13, margin: '0 0 12px' }}>{cigar.line}</p>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                        {cigar.vitola && <span style={{ background: '#f5f0e8', color: '#5a3a1a', fontSize: 12, padding: '3px 8px', borderRadius: 4, fontWeight: 500 }}>{cigar.vitola}</span>}
                        {cigar.strength && <span style={{ background: STRENGTH_BG[cigar.strength] || '#f5f5f5', color: STRENGTH_TEXT[cigar.strength] || '#555', fontSize: 12, padding: '3px 8px', borderRadius: 4, fontWeight: 500 }}>{STRENGTH_LABELS[cigar.strength] || cigar.strength}</span>}
                        {cigar.country_of_origin && <span style={{ background: '#f0f4f8', color: '#3a5a7a', fontSize: 12, padding: '3px 8px', borderRadius: 4, fontWeight: 500 }}>🌍 {cigar.country_of_origin}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f0e8dc', paddingTop: 12 }}>
                        <span style={{ color: '#1a0a00', fontSize: 15, fontWeight: 700 }}>{priceTier(cigar.msrp)}</span>
                        <a href={`/cigar/${cigar.id}`} style={{ color: '#c4a96a', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>View details →</a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <ScrollRow title="🆕 Newest Additions" cigars={filteredNewest.slice(0, 3)} badge="NEW" viewMoreHref="/browse/newest" discBrandIds={discBrandIds} discLineKeys={discLineKeys} />
            <ScrollRow title="💬 Most Reviewed" cigars={filteredMostReviewed.slice(0, 3)} viewMoreHref="/browse/most-reviewed" discBrandIds={discBrandIds} discLineKeys={discLineKeys} />
            <ScrollRow title="⭐ Highest Rated" cigars={filteredHighestRated.slice(0, 3)} viewMoreHref="/browse/highest-rated" discBrandIds={discBrandIds} discLineKeys={discLineKeys} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a0a00', margin: 0 }}>🎲 Discover Something New</h2>
                <button onClick={fetchDiscover} disabled={discoverLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 20, border: '1px solid #d4b896', background: '#fff', color: '#5a3a1a', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: discoverLoading ? 0.6 : 1 }}>
                  {discoverLoading ? 'Shuffling...' : '🔀 Shuffle'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
                {filteredDiscover.map(cigar => {
                  const disc = isCigarDiscontinued(cigar as any, discBrandIds, discLineKeys)
                  return (
                    <div key={cigar.id}
                      style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s, transform 0.15s', opacity: disc ? 0.85 : 1 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
                    >
                      {disc && <div style={{ marginBottom: 8 }}><DiscontinuedBadge /></div>}
                      <p style={{ color: '#c4a96a', fontSize: 12, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cigar.brand_accounts?.name}</p>
                      <h3 style={{ color: '#1a0a00', fontSize: 17, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.3 }}>{cigar.name}</h3>
                      {cigar.line && !cigar.name?.toLowerCase().includes(cigar.line?.toLowerCase()) && (
                        <p style={{ color: '#8b5e2a', fontSize: 13, margin: '0 0 12px' }}>{cigar.line}</p>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                        {cigar.vitola && <span style={{ background: '#f5f0e8', color: '#5a3a1a', fontSize: 12, padding: '3px 8px', borderRadius: 4, fontWeight: 500 }}>{cigar.vitola}</span>}
                        {cigar.strength && <span style={{ background: STRENGTH_BG[cigar.strength] || '#f5f5f5', color: STRENGTH_TEXT[cigar.strength] || '#555', fontSize: 12, padding: '3px 8px', borderRadius: 4, fontWeight: 500 }}>{STRENGTH_LABELS[cigar.strength] || cigar.strength}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f0e8dc', paddingTop: 12 }}>
                        <span style={{ color: '#1a0a00', fontSize: 15, fontWeight: 700 }}>{priceTier(cigar.msrp)}</span>
                        <a href={`/cigar/${cigar.id}`} style={{ color: '#c4a96a', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>View details →</a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
