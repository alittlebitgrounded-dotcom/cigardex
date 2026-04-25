'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useCountryFilter } from '@/hooks/useCountryFilter'
import type { User } from '@supabase/supabase-js'

type Cigar = {
  id: string; name: string; line: string | null; vitola: string | null
  strength: string | null; msrp: number | null; status: string
  country_of_origin: string | null
  is_discontinued: boolean; brand_account_id: string | null
  brand_accounts: { id: string; name: string } | null
  review_count: number
  avg_rating: number | null
}

const STRENGTH_LABELS: Record<string, string> = { mild: 'Mild', mild_medium: 'Mild-Medium', medium: 'Medium', medium_full: 'Medium-Full', full: 'Full' }
const STRENGTH_BG: Record<string, string> = { mild: '#e8f5e9', mild_medium: '#c8e6c9', medium: '#fff3e0', medium_full: '#ffe0b2', full: '#fbe9e7' }
const STRENGTH_TEXT: Record<string, string> = { mild: '#2e7d32', mild_medium: '#388e3c', medium: '#e65100', medium_full: '#bf360c', full: '#b71c1c' }

function priceTier(msrp: number | null): string | null {
  if (!msrp) return null
  if (msrp < 5) return '$'; if (msrp < 10) return '$$'; if (msrp < 20) return '$$$'
  if (msrp < 50) return '$$$$'; return '$$$$$'
}

function isCigarDiscontinued(cigar: Cigar, discBrandIds: Set<string>, discLineKeys: Set<string>): boolean {
  if (cigar.is_discontinued) return true
  const brandId = cigar.brand_account_id || cigar.brand_accounts?.id
  if (brandId && discBrandIds.has(brandId)) return true
  if (brandId && cigar.line && discLineKeys.has(`${brandId}::${cigar.line}`)) return true
  return false
}

export default function BrowseMostReviewed() {
  const [user, setUser] = useState<User | null>(null)
  const [cigars, setCigars] = useState<Cigar[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hideDiscontinued, setHideDiscontinued] = useState(false)
  const [discBrandIds, setDiscBrandIds] = useState<Set<string>>(new Set())
  const [discLineKeys, setDiscLineKeys] = useState<Set<string>>(new Set())
  const PER_PAGE = 48

  const { filterCigars } = useCountryFilter({ userId: user?.id ?? null })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    fetchCigars()
    fetchDiscontinuedData()
  }, [])

  async function fetchDiscontinuedData() {
    const [brandsRes, linesRes] = await Promise.all([
      supabase.from('brand_accounts').select('id').eq('is_discontinued', true),
      supabase.from('discontinued_lines').select('brand_account_id, line_name'),
    ])
    if (brandsRes.data) setDiscBrandIds(new Set(brandsRes.data.map((b: any) => b.id)))
    if (linesRes.data) setDiscLineKeys(new Set(linesRes.data.map((l: any) => `${l.brand_account_id}::${l.line_name}`)))
  }

  async function fetchCigars() {
    setLoading(true)
    const { data: reviewData } = await supabase.from('reviews').select('cigar_id, rating')
    if (!reviewData) { setLoading(false); return }

    const counts: Record<string, number> = {}
    const sums: Record<string, { total: number; count: number }> = {}
    reviewData.forEach(r => {
      if (!r.cigar_id) return
      counts[r.cigar_id] = (counts[r.cigar_id] || 0) + 1
      if (r.rating) {
        if (!sums[r.cigar_id]) sums[r.cigar_id] = { total: 0, count: 0 }
        sums[r.cigar_id].total += r.rating
        sums[r.cigar_id].count++
      }
    })

    const topIds = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 200).map(([id]) => id)
    if (topIds.length === 0) { setLoading(false); return }

    const { data } = await supabase
      .from('cigars')
      .select('id, name, line, vitola, strength, msrp, status, country_of_origin, is_discontinued, brand_account_id, brand_accounts!left(id, name)')
      .in('id', topIds)
      .eq('status', 'live')

    if (data) {
      const withCounts = topIds
        .map(id => data.find(c => c.id === id))
        .filter(Boolean)
        .map(c => ({
          ...c,
          review_count: counts[c!.id] || 0,
          avg_rating: sums[c!.id] ? sums[c!.id].total / sums[c!.id].count : null,
        })) as unknown as Cigar[]
      setCigars(withCounts)
    }
    setLoading(false)
  }

  const filtered = (filterCigars(cigars) as Cigar[])
    .filter(c => !hideDiscontinued || !isCigarDiscontinued(c, discBrandIds, discLineKeys))
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'Georgia, serif' }}>
      <Header />
      <div style={{ background: '#f0e8dc', padding: '10px 32px', fontSize: 13, color: '#8b5e2a' }}>
        <a href="/" style={{ color: '#8b5e2a', textDecoration: 'none' }}>Home</a>
        <span style={{ margin: '0 8px' }}>›</span>
        <span style={{ color: '#1a0a00', fontWeight: 500 }}>Most Reviewed</span>
      </div>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a0a00', margin: '0 0 6px' }}>💬 Most Reviewed</h1>
            <p style={{ fontSize: 14, color: '#8b5e2a', margin: 0 }}>
              {loading ? 'Loading...' : `${filtered.length} cigars with community reviews`}
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 14px', borderRadius: 6, border: hideDiscontinued ? '2px solid #791F1F' : '1px solid #d4b896', background: hideDiscontinued ? '#F7C1C1' : '#fff', fontSize: 14, color: hideDiscontinued ? '#791F1F' : '#888', fontWeight: hideDiscontinued ? 600 : 400 }}>
            <input type="checkbox" checked={hideDiscontinued} onChange={e => { setHideDiscontinued(e.target.checked); setPage(1) }} style={{ display: 'none' }} />
            Hide Discontinued
          </label>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#8b5e2a' }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
              {paged.map((cigar, i) => {
                const disc = isCigarDiscontinued(cigar, discBrandIds, discLineKeys)
                return (
                  <a key={cigar.id} href={`/cigar/${cigar.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20, height: '100%', boxSizing: 'border-box', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s, transform 0.15s', cursor: 'pointer', position: 'relative', opacity: disc ? 0.85 : 1 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
                    >
                      {(page - 1) * PER_PAGE + i < 3 && (
                        <div style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: '50%', background: '#c4a96a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#1a0a00' }}>
                          {(page - 1) * PER_PAGE + i + 1}
                        </div>
                      )}
                      {disc && <div style={{ marginBottom: 8 }}><span style={{ background: '#F7C1C1', color: '#791F1F', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 3 }}>Discontinued</span></div>}
                      <p style={{ color: '#c4a96a', fontSize: 11, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cigar.brand_accounts?.name}</p>
                      <h3 style={{ color: '#1a0a00', fontSize: 15, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.3 }}>{cigar.name}</h3>
                      {cigar.line && !cigar.name?.toLowerCase().includes(cigar.line?.toLowerCase()) && (
                        <p style={{ color: '#8b5e2a', fontSize: 12, margin: '0 0 8px' }}>{cigar.line}</p>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                        {cigar.vitola && <span style={{ background: '#f5f0e8', color: '#5a3a1a', fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 500 }}>{cigar.vitola}</span>}
                        {cigar.strength && <span style={{ background: STRENGTH_BG[cigar.strength] || '#f5f5f5', color: STRENGTH_TEXT[cigar.strength] || '#555', fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 500 }}>{STRENGTH_LABELS[cigar.strength]}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f0e8dc', paddingTop: 10 }}>
                        <div>
                          {priceTier(cigar.msrp) && <span style={{ color: '#1a0a00', fontSize: 13, fontWeight: 700 }}>{priceTier(cigar.msrp)}</span>}
                          {cigar.avg_rating && <span style={{ color: '#c4a96a', fontSize: 12, marginLeft: 8 }}>★ {cigar.avg_rating.toFixed(1)}</span>}
                        </div>
                        <span style={{ fontSize: 12, color: '#8b5e2a', fontWeight: 600 }}>{cigar.review_count} review{cigar.review_count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
                <button onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0 }) }} disabled={page === 1}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #d4b896', background: page === 1 ? '#f5f5f5' : '#fff', color: page === 1 ? '#ccc' : '#5a3a1a', fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>← Prev</button>
                <span style={{ fontSize: 13, color: '#8b5e2a' }}>Page {page} of {totalPages}</span>
                <button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0 }) }} disabled={page === totalPages}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #d4b896', background: page === totalPages ? '#f5f5f5' : '#fff', color: page === totalPages ? '#ccc' : '#5a3a1a', fontSize: 13, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}

