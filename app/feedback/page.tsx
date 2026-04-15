'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ReviewForm from '@/components/ReviewForm'

const STRENGTHS = ['mild', 'mild_medium', 'medium', 'medium_full', 'full']
const STRENGTH_LABELS: Record<string, string> = {
  mild: 'Mild', mild_medium: 'Mild-Medium', medium: 'Medium',
  medium_full: 'Medium-Full', full: 'Full',
}

const FEEDBACK_TYPES = [
  { value: 'bug', label: '🐛 Bug report', description: 'Something is broken or not working right' },
  { value: 'suggestion', label: '💡 Feature suggestion', description: 'Something you\'d like to see added' },
  { value: 'add_cigar', label: '🍂 Add a cigar', description: 'Submit a cigar that\'s missing from our catalog' },
  { value: 'compliment', label: '🍂 Compliment', description: 'Something you love about CigarDex' },
  { value: 'other', label: '💬 Other', description: 'Anything else on your mind' },
]

type Brand = { id: string; name: string }

export default function FeedbackPage() {
  const [form, setForm] = useState({ type: '', message: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Auth
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Brands for dropdown
  const [brands, setBrands] = useState<Brand[]>([])
  const [brandsLoaded, setBrandsLoaded] = useState(false)

  // Cigar form state
  const [cigarForm, setCigarForm] = useState({
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
    brand_account_id: '',
    brand_other: '',
  })

  // Post-submit cigar state
  const [savedCigarId, setSavedCigarId] = useState<string | null>(null)
  const [savedCigarName, setSavedCigarName] = useState('')
  const [showReviewPrompt, setShowReviewPrompt] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setUserId(session.user.id)
      const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).maybeSingle()
      if (profile) setUserRole(profile.role)
    }
    setAuthLoading(false)
  }

  async function loadBrands() {
    if (brandsLoaded) return
    const { data } = await supabase.from('brand_accounts').select('id, name').order('name')
    if (data) setBrands(data)
    setBrandsLoaded(true)
  }

  // Load brands when add_cigar is selected
  function handleTypeSelect(type: string) {
    setForm(prev => ({ ...prev, type }))
    if (type === 'add_cigar') loadBrands()
  }

  function cigarField(key: keyof typeof cigarForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setCigarForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit() {
    if (!form.type) { setError('Please select a feedback type'); return }

    if (form.type === 'add_cigar') {
      await handleCigarSubmit()
      return
    }

    if (!form.message.trim()) { setError('Please write your feedback'); return }
    setError('')
    setSubmitting(true)
    await supabase.from('feedback').insert({
      type: form.type,
      message: form.message,
      email: form.email || null,
      status: 'pending',
    })
    setSubmitted(true)
    setSubmitting(false)
  }

  async function handleCigarSubmit() {
    setError('')
    if (!cigarForm.name.trim()) { setError('Cigar name is required.'); return }

    const brandId = cigarForm.brand_account_id === 'other' ? null : cigarForm.brand_account_id || null
    if (!brandId && !cigarForm.brand_other.trim()) {
      setError('Please select a brand or enter the brand name.')
      return
    }

    setSubmitting(true)

    const payload: Record<string, any> = {
      name: cigarForm.name.trim(),
      line: cigarForm.line.trim() || null,
      vitola: cigarForm.vitola.trim() || null,
      strength: cigarForm.strength || null,
      wrapper_origin: cigarForm.wrapper_origin.trim() || null,
      wrapper_color: cigarForm.wrapper_color.trim() || null,
      binder_origin: cigarForm.binder_origin.trim() || null,
      filler_origins: cigarForm.filler_origins.trim() || null,
      country_of_origin: cigarForm.country_of_origin.trim() || null,
      msrp: cigarForm.msrp ? parseFloat(cigarForm.msrp) : null,
      upc: cigarForm.upc.trim() || null,
      length_inches: cigarForm.length_inches ? parseFloat(cigarForm.length_inches) : null,
      ring_gauge: cigarForm.ring_gauge ? parseInt(cigarForm.ring_gauge) : null,
      sold_as: cigarForm.sold_as.trim() || null,
      description: cigarForm.description.trim() || null,
      is_limited: cigarForm.is_limited,
      brand_account_id: brandId,
      submitted_by: userId,
      submitted_by_role: userRole || 'registered',
      status: 'pending',
    }

    // If brand is "other", stash the freeform name in the description note
    if (!brandId && cigarForm.brand_other.trim()) {
      payload.description = [
        payload.description,
        `[Brand not in system: ${cigarForm.brand_other.trim()}]`
      ].filter(Boolean).join('\n\n')
    }

    const { data, error: err } = await supabase.from('cigars').insert(payload).select('id').single()
    setSubmitting(false)

    if (err) { setError(`Submission failed: ${err.message}`); return }

    setSavedCigarId(data.id)
    setSavedCigarName(cigarForm.name.trim())
    setShowReviewPrompt(true)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 7,
    border: '1px solid #d4b896', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', background: '#fff', color: '#1a0a00',
    fontFamily: 'system-ui, sans-serif',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 5, fontWeight: 600,
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#8b5e2a' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '48px 32px', textAlign: 'center' }}>
        <h1 style={{ color: '#f5e6c8', fontSize: 30, fontWeight: 700, margin: '0 0 10px' }}>Share Your Feedback</h1>
        <p style={{ color: '#c4a96a', fontSize: 15, margin: 0 }}>We read everything. No ticket system, no auto-replies.</p>
      </div>

      <div style={{ flex: 1, maxWidth: 700, margin: '0 auto', padding: '48px 24px', width: '100%' }}>

        {/* ── Post-cigar-submit success + review prompt ── */}
        {showReviewPrompt && savedCigarId && (
          <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 12, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 28 }}>✓</span>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 4px' }}>{savedCigarName} has been submitted!</p>
                <p style={{ fontSize: 13, color: '#2e7d32', margin: 0 }}>Our team will review it and add it to the catalog shortly.</p>
              </div>
            </div>

            {!showReviewForm ? (
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #c8e6c9', padding: 20 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#1a0a00', margin: '0 0 6px' }}>Want to add a review while you're here?</p>
                <p style={{ fontSize: 13, color: '#5a3a1a', margin: '0 0 16px', lineHeight: 1.6 }}>
                  Your review will be saved and will go live once the cigar is approved. It's a great way to log the smoke while it's fresh.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => setShowReviewForm(true)}
                    style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1a0a00', color: '#f5e6c8', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Yes, add my review →
                  </button>
                  <a href="/"
                    style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d4b896', background: '#fff', color: '#5a3a1a', fontSize: 14, fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                    Back to CigarDex
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                <ReviewForm
                  cigarId={savedCigarId}
                  cigarName={savedCigarName}
                  userId={userId!}
                  userRole={userRole ?? undefined}
                  onSaved={() => { setShowReviewForm(false); window.location.href = '/' }}
                  onCancel={() => setShowReviewForm(false)}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Standard submitted thank-you ── */}
        {submitted && !showReviewPrompt && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: '0 0 10px' }}>Thank you!</h2>
            <p style={{ color: '#8b5e2a', fontSize: 15, margin: '0 0 24px' }}>Your feedback helps make CigarDex better for everyone.</p>
            <a href="/" style={{ background: '#1a0a00', color: '#f5e6c8', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>Back to CigarDex</a>
          </div>
        )}

        {/* ── Main form ── */}
        {!submitted && !showReviewPrompt && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Type selector */}
              <div>
                <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 8, fontWeight: 600 }}>What kind of feedback? *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {FEEDBACK_TYPES.map(t => (
                    <button key={t.value} onClick={() => handleTypeSelect(t.value)} style={{
                      padding: '11px 16px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                      border: form.type === t.value ? '2px solid #1a0a00' : '1px solid #d4b896',
                      background: form.type === t.value ? '#f5f0e8' : '#fff',
                    }}>
                      <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: '#1a0a00' }}>{t.label}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#8b5e2a' }}>{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Add a Cigar form ── */}
              {form.type === 'add_cigar' && (
                <>
                  {/* Login gate */}
                  {!userId ? (
                    <div style={{ background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: 10, padding: 24, textAlign: 'center' }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#e65100', margin: '0 0 8px' }}>Sign in to submit a cigar</p>
                      <p style={{ fontSize: 13, color: '#5a3a1a', margin: '0 0 16px', lineHeight: 1.6 }}>
                        You need a CigarDex account to submit missing cigars. It's free and takes 30 seconds.
                      </p>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a href="/?signin=true" style={{ padding: '10px 20px', borderRadius: 8, background: '#1a0a00', color: '#f5e6c8', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Sign in</a>
                        <a href="/?signup=true" style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d4b896', color: '#5a3a1a', textDecoration: 'none', fontSize: 14 }}>Create account</a>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ background: '#f5f0e8', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#5a3a1a', lineHeight: 1.6 }}>
                        📋 Fill in as much as you know. Our team will review and approve your submission. The more detail you provide, the faster it goes live.
                      </div>

                      {/* Brand */}
                      <div style={{ background: '#faf8f5', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a0a00', margin: '0 0 14px', fontFamily: 'Georgia, serif' }}>Brand</h3>
                        <div>
                          <label style={labelStyle}>Brand *</label>
                          <select
                            value={cigarForm.brand_account_id}
                            onChange={e => setCigarForm(prev => ({ ...prev, brand_account_id: e.target.value, brand_other: '' }))}
                            style={inputStyle}
                          >
                            <option value="">Select a brand...</option>
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            <option value="other">Other / not listed</option>
                          </select>
                        </div>
                        {cigarForm.brand_account_id === 'other' && (
                          <div style={{ marginTop: 12 }}>
                            <label style={labelStyle}>Brand name <span style={{ color: '#bbb', fontWeight: 400 }}>(type it in)</span></label>
                            <input
                              value={cigarForm.brand_other}
                              onChange={cigarField('brand_other')}
                              placeholder="e.g. My Local Shop Exclusive"
                              style={inputStyle}
                            />
                          </div>
                        )}
                      </div>

                      {/* Cigar details */}
                      <div style={{ background: '#faf8f5', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a0a00', margin: '0 0 16px', fontFamily: 'Georgia, serif' }}>Cigar Details</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div>
                            <label style={labelStyle}>Cigar Name *</label>
                            <input value={cigarForm.name} onChange={cigarField('name')} placeholder="e.g. Perdomo Reserve Champagne" style={inputStyle} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                              <label style={labelStyle}>Line <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
                              <input value={cigarForm.line} onChange={cigarField('line')} placeholder="e.g. Reserve Champagne" style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>Vitola <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
                              <input value={cigarForm.vitola} onChange={cigarField('vitola')} placeholder="e.g. Toro, Robusto" style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>Strength</label>
                              <select value={cigarForm.strength} onChange={cigarField('strength')} style={inputStyle}>
                                <option value="">Select...</option>
                                {STRENGTHS.map(s => <option key={s} value={s}>{STRENGTH_LABELS[s]}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={labelStyle}>Country of Origin</label>
                              <input value={cigarForm.country_of_origin} onChange={cigarField('country_of_origin')} placeholder="e.g. Nicaragua" style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>MSRP ($)</label>
                              <input type="number" step="0.01" value={cigarForm.msrp} onChange={cigarField('msrp')} placeholder="e.g. 12.50" style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>UPC</label>
                              <input value={cigarForm.upc} onChange={cigarField('upc')} style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>Length (inches)</label>
                              <input type="number" step="0.25" value={cigarForm.length_inches} onChange={cigarField('length_inches')} placeholder="e.g. 6.0" style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>Ring Gauge</label>
                              <input type="number" value={cigarForm.ring_gauge} onChange={cigarField('ring_gauge')} placeholder="e.g. 52" style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>Sold As</label>
                              <input value={cigarForm.sold_as} onChange={cigarField('sold_as')} placeholder="e.g. Box of 20" style={inputStyle} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input type="checkbox" id="limited" checked={cigarForm.is_limited}
                              onChange={e => setCigarForm(prev => ({ ...prev, is_limited: e.target.checked }))}
                              style={{ cursor: 'pointer', width: 16, height: 16 }} />
                            <label htmlFor="limited" style={{ fontSize: 14, color: '#5a3a1a', cursor: 'pointer' }}>Limited Edition / Discontinued</label>
                          </div>
                        </div>
                      </div>

                      {/* Tobacco */}
                      <div style={{ background: '#faf8f5', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a0a00', margin: '0 0 14px', fontFamily: 'Georgia, serif' }}>Tobacco <span style={{ fontSize: 13, color: '#bbb', fontWeight: 400 }}>(optional)</span></h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label style={labelStyle}>Wrapper Origin</label>
                            <input value={cigarForm.wrapper_origin} onChange={cigarField('wrapper_origin')} placeholder="e.g. Ecuador" style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Wrapper Color</label>
                            <input value={cigarForm.wrapper_color} onChange={cigarField('wrapper_color')} placeholder="e.g. Natural, Maduro" style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Binder Origin</label>
                            <input value={cigarForm.binder_origin} onChange={cigarField('binder_origin')} placeholder="e.g. Nicaragua" style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Filler Origins</label>
                            <input value={cigarForm.filler_origins} onChange={cigarField('filler_origins')} placeholder="e.g. Nicaragua, Dominican Republic" style={inputStyle} />
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div style={{ background: '#faf8f5', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a0a00', margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>Description <span style={{ fontSize: 13, color: '#bbb', fontWeight: 400 }}>(optional)</span></h3>
                        <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 12px' }}>
                          Tasting notes, blend story, where you got it — anything that helps us or other smokers.
                        </p>
                        <textarea value={cigarForm.description} onChange={cigarField('description')} rows={4}
                          placeholder="Tasting notes, blend story, what to expect..."
                          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }} />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── Standard feedback message ── */}
              {form.type && form.type !== 'add_cigar' && (
                <>
                  <div>
                    <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4, fontWeight: 600 }}>Your feedback *</label>
                    <textarea value={form.message} onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))} rows={5}
                      placeholder="Tell us what's on your mind..."
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const, fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4, fontWeight: 600 }}>Your email <span style={{ color: '#bbb', fontWeight: 400 }}>(optional — only if you want a reply)</span></label>
                    <input type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="you@example.com"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
                  </div>
                </>
              )}

              {error && (
                <p style={{ color: '#b71c1c', fontSize: 13, background: '#fbe9e7', padding: '10px 14px', borderRadius: 6, margin: 0 }}>{error}</p>
              )}

              {/* Submit button — show for all types except add_cigar when not logged in */}
              {form.type && !(form.type === 'add_cigar' && !userId) && (
                <button onClick={handleSubmit} disabled={submitting} style={{
                  background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 8,
                  padding: '14px 0', fontSize: 15, fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1,
                }}>
                  {submitting
                    ? (form.type === 'add_cigar' ? 'Submitting cigar...' : 'Sending...')
                    : (form.type === 'add_cigar' ? 'Submit Cigar for Review' : 'Send Feedback')}
                </button>
              )}

            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
