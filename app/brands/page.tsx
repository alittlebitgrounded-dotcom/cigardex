'use client'

import Header from '@/components/Header'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Footer from '@/components/Footer'

type Brand = {
  id: string
  name: string
  country_of_origin: string | null
  logo_url: string | null
  tier: string
  cigar_count: number
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [countries, setCountries] = useState<string[]>([])

  useEffect(() => {
    fetchBrands()
  }, [])

  async function fetchBrands() {
    setLoading(true)
    const { data } = await supabase
      .from('brand_accounts')
      .select('id, name, country_of_origin, logo_url, tier')
      .order('name')

    if (data) {
      // Count cigars per brand using a direct query with group-by via RPC
      const { data: counts } = await supabase
        .rpc('get_live_cigar_counts_by_brand')

      const countMap: Record<string, number> = {}
      counts?.forEach((c: { brand_account_id: string; count: number }) => {
        countMap[c.brand_account_id] = Number(c.count)
      })

      const withCounts = data
        .map(b => ({ ...b, cigar_count: countMap[b.id] || 0 }))
        .filter(b => b.cigar_count > 0)

      setBrands(withCounts)

      const uniqueCountries = [...new Set(
        withCounts.map(b => b.country_of_origin).filter(Boolean) as string[]
      )].sort()
      setCountries(uniqueCountries)
    }
    setLoading(false)
  }

  const filtered = brands.filter(b => {
    const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase())
    const matchCountry = !countryFilter || b.country_of_origin === countryFilter
    return matchSearch && matchCountry
  })

  // Featured (paid tier) first, then rest alphabetically
  const featured = filtered.filter(b => b.tier === 'paid')
  const regular = filtered.filter(b => b.tier !== 'paid')

  // Group regular brands A-Z by first letter
  const grouped: Record<string, Brand[]> = {}
  regular.forEach(b => {
    const letter = b.name[0].toUpperCase()
    if (!grouped[letter]) grouped[letter] = []
    grouped[letter].push(b)
  })
  const letters = Object.keys(grouped).sort()

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#8b5e2a' }}>Loading brands...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif' }}>
<Header />

      {/* Breadcrumb */}
      <div style={{ background: '#f0e8dc', padding: '10px 32px', fontSize: 13, color: '#8b5e2a' }}>
        <a href="/" style={{ color: '#8b5e2a', textDecoration: 'none' }}>Browse</a>
        <span style={{ margin: '0 8px' }}>›</span>
        <span style={{ color: '#1a0a00', fontWeight: 500 }}>Brands</span>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '36px 32px' }}>
        <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '36px 32px' }}>
          <h1 style={{ color: '#f5e6c8', fontSize: 30, fontWeight: 700, margin: '0 0 6px' }}>Cigar Brands</h1>
          <p style={{ color: '#c4a96a', fontSize: 14, margin: '0 0 24px' }}>{brands.length} brands in the database</p>

          {/* Search + filter */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search brands..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '10px 16px', borderRadius: 8, border: 'none', fontSize: 15, outline: 'none', background: '#fff', minWidth: 260, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
            />
            <select
              value={countryFilter}
              onChange={e => setCountryFilter(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 8, border: 'none', fontSize: 14, outline: 'none', background: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
            >
              <option value="">All countries</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {(search || countryFilter) && (
              <button onClick={() => { setSearch(''); setCountryFilter('') }}
                style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#f5e6c8', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                ✕ Clear
              </button>
            )}
          </div>

          {/* A-Z quick jump */}
          {!search && !countryFilter && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 20 }}>
              {letters.map(letter => (
                <a key={letter} href={`#letter-${letter}`}
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: 'rgba(196,169,106,0.2)', color: '#c4a96a', fontSize: 13, fontWeight: 700, textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(196,169,106,0.4)'}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(196,169,106,0.2)'}
                >
                  {letter}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 48px' }}>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>No brands found</p>
            <p style={{ fontSize: 14 }}>Try a different search</p>
          </div>
        ) : (
          <>
            {/* Featured brands */}
            {featured.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a0a00', margin: 0 }}>⭐ Featured Brands</h2>
                  <div style={{ flex: 1, height: 1, background: '#e8ddd0' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                  {featured.map(brand => <BrandCard key={brand.id} brand={brand} featured />)}
                </div>
              </div>
            )}

            {/* A-Z grouped */}
            {letters.map(letter => (
              <div key={letter} id={`letter-${letter}`} style={{ marginBottom: 32, scrollMarginTop: 88 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1a0a00', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4a96a', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                    {letter}
                  </div>
                  <div style={{ flex: 1, height: 1, background: '#e8ddd0' }} />
                  <span style={{ fontSize: 12, color: '#aaa' }}>{grouped[letter].length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {grouped[letter].map(brand => <BrandCard key={brand.id} brand={brand} />)}
                </div>
              </div>
            ))}

            {/* Search results (flat, no grouping) */}
            {(search || countryFilter) && filtered.length > 0 && (
              <div>
                <p style={{ fontSize: 13, color: '#8b5e2a', marginBottom: 16 }}>{filtered.length} brand{filtered.length !== 1 ? 's' : ''} found</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {filtered.map(brand => <BrandCard key={brand.id} brand={brand} />)}
                </div>
              </div>
            )}
          </>
        )}
</div>
      <Footer />
    </div>
  )
}

function BrandCard({ brand, featured }: { brand: Brand; featured?: boolean }) {
  return (
    <a href={`/brand/${brand.id}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: '#fff', borderRadius: 10,
          border: featured ? '2px solid #c4a96a' : '1px solid #e8ddd0',
          padding: 16, cursor: 'pointer',
          boxShadow: featured ? '0 4px 12px rgba(196,169,106,0.15)' : '0 2px 6px rgba(0,0,0,0.04)',
          transition: 'box-shadow 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = featured ? '0 4px 12px rgba(196,169,106,0.15)' : '0 2px 6px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
      >
        {/* Logo */}
        <div style={{ width: '100%', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          {brand.logo_url
            ? <img src={brand.logo_url} alt={brand.name} style={{ maxHeight: 56, maxWidth: '100%', objectFit: 'contain' }}  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}/>
            : <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🍂</div>
          }
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a0a00', margin: '0 0 4px', lineHeight: 1.3 }}>{brand.name}</h3>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#8b5e2a' }}>
            {brand.cigar_count} cigar{brand.cigar_count !== 1 ? 's' : ''}
          </span>
          {brand.country_of_origin && (
            <span style={{ fontSize: 11, color: '#aaa' }}>{brand.country_of_origin}</span>
          )}
        </div>

        {featured && (
          <div style={{ marginTop: 8, padding: '2px 8px', background: '#fff3e0', borderRadius: 4, display: 'inline-block' }}>
            <span style={{ fontSize: 10, color: '#e65100', fontWeight: 700, letterSpacing: '0.04em' }}>FEATURED</span>
          </div>
        )}
      </div>
    </a>
  )
}