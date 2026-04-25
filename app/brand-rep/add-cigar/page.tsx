'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ReviewForm from '@/components/ReviewForm'

type Brand = { id: string; name: string }

const STRENGTHS = ['mild', 'mild_medium', 'medium', 'medium_full', 'full']
const STRENGTH_LABELS: Record<string, string> = {
  mild: 'Mild', mild_medium: 'Mild-Medium', medium: 'Medium',
  medium_full: 'Medium-Full', full: 'Full',
}

function AddCigarContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const brandIdParam = searchParams.get('brand')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [allBrands, setAllBrands] = useState<Brand[]>([])
  const [savedCigarId, setSavedCigarId] = useState<string | null>(null)
  const [savedCigarName, setSavedCigarName] = useState('')
  const [showReviewPrompt, setShowReviewPrompt] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    line: '',
    vitola: '',
    strength: '',
    wrapper_origin: '',
    wrapper_color: '',
    binder_origin: '',
    filler_origins: '',
    country_of_origin: '',
    msrp: '',
    upc: '',
    length_inches: '',
    ring_gauge: '',
    sold_as: '',
    description: '',
    is_limited: false,
    brand_account_id: brandIdParam || '',
  })

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/?signin=true'); return }
    const { data: profile } = await supabase.from('users').select('id, role').eq('id', session.user.id).maybeSingle()

    const { data: assocs } = await supabase
      .from('brand_rep_brands')
      .select('brand_accounts(id, name)')
      .eq('user_id', session.user.id)
      .eq('status', 'approved')

    const brands = (assocs || []).map((a: any) => a.brand_accounts).filter(Boolean) as Brand[]
    if (brands.length === 0) { router.push('/pro'); return }

    setUserId(session.user.id)
    setUserRole(profile?.role || 'brand')
    setAllBrands(brands)

    if (brandIdParam) {
      const found = brands.find(b => b.id === brandIdParam)
      if (found) setBrand(found)
    } else if (brands.length === 1) {
      setBrand(brands[0])
      setForm(prev => ({ ...prev, brand_account_id: brands[0].id }))
    }
    setLoading(false)
  }

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSave() {
    setError('')
    if (!form.name.trim()) { setError('Cigar name is required.'); return }
    if (!form.brand_account_id) { setError('Please select a brand.'); return }
    setSaving(true)

    const payload: Record<string, any> = {
      name: form.name.trim(),
      line: form.line.trim() || null,
      vitola: form.vitola.trim() || null,
      strength: form.strength || null,
      wrapper_origin: form.wrapper_origin.trim() || null,
      wrapper_color: form.wrapper_color.trim() || null,
      binder_origin: form.binder_origin.trim() || null,
      filler_origins: form.filler_origins.trim() || null,
      country_of_origin: form.country_of_origin.trim() || null,
      msrp: form.msrp ? parseFloat(form.msrp) : null,
      upc: form.upc.trim() || null,
      length_inches: form.length_inches ? parseFloat(form.length_inches) : null,
      ring_gauge: form.ring_gauge ? parseInt(form.ring_gauge) : null,
      sold_as: form.sold_as.trim() || null,
      description: form.description.trim() || null,
      is_limited: form.is_limited,
      brand_account_id: form.brand_account_id,
      submitted_by: userId,
      submitted_by_role: 'brand',
      status: 'live',
    }

    const { data, error: err } = await supabase.from('cigars').insert(payload).select('id').single()
    setSaving(false)
    if (err) { setError(`Save failed: ${err.message}`); return }

    setSavedCigarId(data.id)
    setSavedCigarName(form.name.trim())
    setShowReviewPrompt(true)
    setMsg(`${form.name.trim()} has been added to the catalog and is now live.`)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#8b5e2a' }}>Loading...</p>
    </div>
  )

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 7,
    border: '1px solid #d4b896', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', background: '#fff', color: '#1a0a00',
    fontFamily: 'system-ui, sans-serif',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 5, fontWeight: 600,
  }
  const selectedBrand = allBrands.find(b => b.id === form.brand_account_id) || brand

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif' }}>
      <Header />

      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '32px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ color: '#f5e6c8', fontSize: 24, fontWeight: 700, margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
                Add a Cigar
              </h1>
              <p style={{ color: '#c4a96a', fontSize: 14, margin: '0 0 12px' }}>
                {selectedBrand ? `${selectedBrand.name} · ` : ''}Submitted cigars go live immediately.
              </p>
              {/* Bulk insert note */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(196,169,106,0.12)', border: '1px solid rgba(196,169,106,0.3)', borderRadius: 7, padding: '8px 14px' }}>
                <span style={{ fontSize: 16 }}>📋</span>
                <p style={{ fontSize: 13, color: '#e8d5a3', margin: 0, lineHeight: 1.5 }}>
                  Adding multiple cigars at once? Ask your CigarDex contact about bulk SQL inserts — it's much faster for large catalogs.
                </p>
              </div>
            </div>
            <a href="/pro" style={{ flexShrink: 0, padding: '8px 18px', borderRadius: 7, border: '1px solid rgba(196,169,106,0.4)', color: '#c4a96a', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
              ← Dashboard
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 64px' }}>

        {/* Success state */}
        {showReviewPrompt && savedCigarId && (
          <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 12, padding: 28, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 28 }}>✓</span>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 4px' }}>{savedCigarName} is now live!</p>
                <p style={{ fontSize: 13, color: '#2e7d32', margin: 0 }}>It's been added to the catalog and is visible to all users.</p>
              </div>
            </div>

            {!showReviewForm ? (
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #c8e6c9', padding: 20 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#1a0a00', margin: '0 0 6px' }}>Want to add the first review?</p>
                <p style={{ fontSize: 13, color: '#5a3a1a', margin: '0 0 16px', lineHeight: 1.6 }}>
                  Give this cigar a boost — as a brand rep your review will show alongside community reviews.
                  It's a great way to share tasting notes and set expectations for new customers.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowReviewForm(true)}
                    style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1a0a00', color: '#f5e6c8', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Yes, add my first review →
                  </button>
                  <a href={`/cigar/${savedCigarId}`}
                    style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d4b896', background: '#fff', color: '#5a3a1a', fontSize: 14, fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                    View cigar page →
                  </a>
                  <button onClick={() => { setSavedCigarId(null); setShowReviewPrompt(false); setMsg(''); setForm(prev => ({ ...prev, name: '', line: '', vitola: '', description: '', msrp: '', upc: '' })) }}
                    style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d4b896', background: '#fff', color: '#5a3a1a', fontSize: 14, cursor: 'pointer' }}>
                    Add another cigar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                <ReviewForm
                  cigarId={savedCigarId}
                  cigarName={savedCigarName}
                  userId={userId!}
                  userRole={userRole ?? undefined}
                  onSaved={() => { setShowReviewForm(false); router.push(`/cigar/${savedCigarId}`) }}
                  onCancel={() => setShowReviewForm(false)}
                />
              </div>
            )}
          </div>
        )}

        {!showReviewPrompt && (
          <>
            {error && (
              <div style={{ background: '#fbe9e7', border: '1px solid #f5c6c6', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#b71c1c' }}>
                {error}
              </div>
            )}

            {allBrands.length > 1 && (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 24, marginBottom: 20 }}>
                <label style={labelStyle}>Brand *</label>
                <select value={form.brand_account_id} onChange={field('brand_account_id')} style={inputStyle}>
                  <option value="">Select brand...</option>
                  {allBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>Cigar Details</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Cigar Name *</label>
                  <input value={form.name} onChange={field('name')} placeholder="e.g. Perdomo Reserve Champagne" style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Line <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
                    <input value={form.line} onChange={field('line')} placeholder="e.g. Reserve Champagne" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Vitola <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
                    <input value={form.vitola} onChange={field('vitola')} placeholder="e.g. Toro, Robusto, Churchill" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Strength</label>
                    <select value={form.strength} onChange={field('strength')} style={inputStyle}>
                      <option value="">Select...</option>
                      {STRENGTHS.map(s => <option key={s} value={s}>{STRENGTH_LABELS[s]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Country of Origin</label>
                    <input value={form.country_of_origin} onChange={field('country_of_origin')} placeholder="e.g. Nicaragua" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>MSRP ($)</label>
                    <input type="number" step="0.01" value={form.msrp} onChange={field('msrp')} placeholder="e.g. 12.50" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>UPC</label>
                    <input value={form.upc} onChange={field('upc')} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Length (inches)</label>
                    <input type="number" step="0.25" value={form.length_inches} onChange={field('length_inches')} placeholder="e.g. 6.0" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Ring Gauge</label>
                    <input type="number" value={form.ring_gauge} onChange={field('ring_gauge')} placeholder="e.g. 52" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Sold As</label>
                    <input value={form.sold_as} onChange={field('sold_as')} placeholder="e.g. Box of 20, Bundle of 25" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="limited" checked={form.is_limited}
                    onChange={e => setForm(prev => ({ ...prev, is_limited: e.target.checked }))}
                    style={{ cursor: 'pointer', width: 16, height: 16 }} />
                  <label htmlFor="limited" style={{ fontSize: 14, color: '#5a3a1a', cursor: 'pointer' }}>Limited Edition / Discontinued</label>
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>Tobacco</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Wrapper Origin</label>
                  <input value={form.wrapper_origin} onChange={field('wrapper_origin')} placeholder="e.g. Ecuador" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Wrapper Color</label>
                  <input value={form.wrapper_color} onChange={field('wrapper_color')} placeholder="e.g. Natural, Maduro, Colorado" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Binder Origin</label>
                  <input value={form.binder_origin} onChange={field('binder_origin')} placeholder="e.g. Nicaragua" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Filler Origins</label>
                  <input value={form.filler_origins} onChange={field('filler_origins')} placeholder="e.g. Nicaragua, Dominican Republic" style={inputStyle} />
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28, marginBottom: 28 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>Description</h2>
              <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 14px' }}>
                Shown publicly on the cigar detail page. Tell the community what makes this cigar special.
              </p>
              <textarea value={form.description} onChange={field('description')} rows={4}
                placeholder="Tasting notes, blend story, what to expect..."
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }} />
            </div>

            <button onClick={handleSave} disabled={saving}
              style={{ width: '100%', padding: '14px 0', background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Add Cigar to Catalog'}
            </button>
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default function AddCigarPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ color: '#8b5e2a' }}>Loading...</p>
      </div>
    }>
      <AddCigarContent />
    </Suspense>
  )
}
