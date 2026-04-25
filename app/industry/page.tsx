'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

const STORE_HONORS = [
  'PCA Member',
  'TAA Member',
  'Drew Diplomat',
  'Davidoff Gold Label',
  'Opus X Authorized Retailer',
]

const ROLES = [
  {
    value: 'reviewer',
    icon: '✍️',
    label: 'Reviewer / Content Creator',
    tagline: 'Your reviews, properly credited.',
    description: 'For bloggers, YouTubers, podcasters, and writers covering the cigar world.',
    perks: [
      'Verified badge on your profile and all reviews',
      'Reviews marked as "Industry Review" — distinguished from consumer ratings',
      'Link to your full review, channel, or publication on every review card',
    ],
    cta: 'Reviewers must have an established publication, channel, or blog with a track record of cigar content.',
  },
  {
    value: 'retailer',
    icon: '🏪',
    label: 'Tobacconist / Store Owner',
    tagline: 'Put your shop on the map.',
    description: 'For brick-and-mortar cigar retailers, lounges, and humidor rooms.',
    perks: [
      'Verified store badge and public store profile page',
      'Public contact info — address, phone, hours, website',
      'Inventory listing so enthusiasts can find cigars near them',
      'Industry honor designations (Drew Diplomat, PCA Member, etc.)',
    ],
    cta: 'Must be a licensed retailer with a physical storefront or established online shop.',
  },
  {
    value: 'brand',
    icon: '🍂',
    label: 'Brand Representative',
    tagline: 'Own your presence on CigarDex.',
    description: 'For brand owners, blenders, and authorized brand representatives.',
    perks: [
      'Verified brand badge',
      'Edit your brand\'s About section directly',
      'Submit timeline entries that go live immediately',
      'Add or edit cigars manufactured by your brands.',
    ],
    cta: 'Must be an authorized representative of the brand — owner, employee, or official PR contact.',
  },
]

type Brand = { id: string; name: string; country_of_origin: string | null }

function RoleCard({ role, selected, onSelect }: {
  role: typeof ROLES[0]; selected: boolean; onSelect: () => void
}) {
  return (
    <div onClick={onSelect} style={{
      background: selected ? '#1a0a00' : '#fff',
      border: selected ? '2px solid #c4a96a' : '2px solid #e8ddd0',
      borderRadius: 14, padding: 28, cursor: 'pointer',
      transition: 'all 0.18s ease', position: 'relative', overflow: 'hidden',
    }}>
      {selected && (
        <div style={{ position: 'absolute', top: 14, right: 14, background: '#c4a96a', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#1a0a00', fontWeight: 700 }}>✓</div>
      )}
      <div style={{ fontSize: 32, marginBottom: 10 }}>{role.icon}</div>
      <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px', color: selected ? '#f5e6c8' : '#1a0a00', fontFamily: 'Georgia, serif' }}>{role.label}</h3>
      <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px', color: selected ? '#c4a96a' : '#8b5e2a', fontStyle: 'italic' }}>{role.tagline}</p>
      <p style={{ fontSize: 13, color: selected ? '#c4a96a' : '#5a3a1a', margin: '0 0 16px', lineHeight: 1.6 }}>{role.description}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {role.perks.map(perk => (
          <div key={perk} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: '#c4a96a', fontSize: 12, flexShrink: 0, marginTop: 2 }}>✦</span>
            <span style={{ fontSize: 13, color: selected ? '#e8d5b0' : '#5a3a1a', lineHeight: 1.5 }}>{perk}</span>
          </div>
        ))}
      </div>
      {selected && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(196,169,106,0.3)', fontSize: 12, color: '#a08050', fontStyle: 'italic', lineHeight: 1.6 }}>
          📋 {role.cta}
        </div>
      )}
    </div>
  )
}

export default function IndustryPage() {
  const [selectedRole, setSelectedRole] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedHonors, setSelectedHonors] = useState<string[]>([])
  const [selectedBrandIds, setSelectedBrandIds] = useState<Set<string>>(new Set())
  const [allBrands, setAllBrands] = useState<Brand[]>([])
  const [brandFilter, setBrandFilter] = useState('')
  const [notListedBrand, setNotListedBrand] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', company: '', website: '',
    instagram: '', youtube: '', podcast: '', other_social: '', message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchBrands() }, [])

  async function fetchBrands() {
    const { data } = await supabase
      .from('brand_accounts')
      .select('id, name, country_of_origin')
      .eq('suspended', false)
      .order('name')
    if (data) setAllBrands(data)
  }

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  function toggleHonor(h: string) {
    setSelectedHonors(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h])
  }

  function toggleBrandId(id: string) {
    setSelectedBrandIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function isPersonalEmail(email: string) {
    const personal = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'protonmail.com', 'me.com']
    return personal.includes(email.split('@')[1]?.toLowerCase())
  }

  async function handleSubmit() {
    setError('')
    if (!form.name || !form.email || !selectedRole) {
      setError('Please fill in all required fields and select a role.')
      return
    }
    if (selectedRole === 'brand' && selectedBrandIds.size === 0 && !notListedBrand.trim()) {
      setError('Please select at least one brand you represent, or enter one in the "not listed" field.')
      return
    }
    if (selectedRole !== 'brand' && !form.company) {
      setError('Please fill in all required fields.')
      return
    }
    if (!form.email.includes('@')) { setError('Please enter a valid email address.'); return }
    if (isPersonalEmail(form.email)) {
      setError('Please use a professional or company email — Gmail, Yahoo, and similar personal addresses are not accepted.')
      return
    }
    setSubmitting(true)

    const selectedBrandNames = allBrands
      .filter(b => selectedBrandIds.has(b.id))
      .map(b => b.name)
    if (notListedBrand.trim()) selectedBrandNames.push(notListedBrand.trim())

    const { error: err } = await supabase.from('industry_applications').insert({
      name: form.name,
      email: form.email,
      company: selectedRole === 'brand' ? (form.company || 'Brand Representative') : form.company,
      role_type: selectedRole,
      website: form.website || null,
      publication_url: form.website || null,
      instagram: form.instagram || null,
      youtube: form.youtube || null,
      podcast: form.podcast || null,
      designations: selectedRole === 'retailer' && selectedHonors.length > 0
        ? selectedHonors
        : selectedRole === 'brand' && selectedBrandNames.length > 0
          ? selectedBrandNames
          : null,
      message: form.message || null,
      status: 'pending',
    })
    if (err) { setError('Something went wrong — please try again or email us directly.'); setSubmitting(false); return }
    setSubmitted(true)
    setSubmitting(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 13px', borderRadius: 7,
    border: '1px solid #d4b896', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', background: '#fff', color: '#1a0a00',
    fontFamily: 'Georgia, serif',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 5, fontWeight: 600,
  }

  const visibleBrands = brandFilter
    ? allBrands.filter(b => b.name.toLowerCase().includes(brandFilter.toLowerCase()))
    : allBrands

  // Group by first letter
  const grouped: Record<string, Brand[]> = {}
  visibleBrands.forEach(b => {
    const letter = b.name[0].toUpperCase()
    if (!grouped[letter]) grouped[letter] = []
    grouped[letter].push(b)
  })
  const letters = Object.keys(grouped).sort()

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'Georgia, serif', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '56px 32px 48px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: '#c4a96a', textTransform: 'uppercase', marginBottom: 14 }}>Industry Membership — Free</div>
        <h1 style={{ color: '#f5e6c8', fontSize: 36, fontWeight: 700, margin: '0 0 14px', fontFamily: 'Georgia, serif', lineHeight: 1.2 }}>
          You work in cigars.<br />CigarDex should work for you.
        </h1>
        <p style={{ color: '#c4a96a', fontSize: 16, margin: '0 auto 28px', maxWidth: 540, lineHeight: 1.7 }}>
          We're building the most complete cigar database on the internet. Industry members get verified status, direct platform access, and tools built around how you actually work.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Verified badge', 'Role-specific tools', 'Direct platform access'].map(tag => (
            <span key={tag} style={{ background: 'rgba(196,169,106,0.15)', border: '1px solid rgba(196,169,106,0.4)', color: '#c4a96a', fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 20, letterSpacing: '0.04em' }}>{tag}</span>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: 860, margin: '0 auto', padding: '48px 24px 64px', width: '100%' }}>
        {submitted ? (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ddd0', padding: '56px 48px', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 20 }}>🍂</div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: '#1a0a00', margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>Application received</h2>
            <p style={{ color: '#8b5e2a', fontSize: 15, lineHeight: 1.8, margin: '0 0 8px', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
              Thanks for reaching out. We review every application personally and will be in touch within a few business days.
            </p>
            <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 32px' }}>In the meantime, your existing account works normally.</p>
            <a href="/" style={{ display: 'inline-block', background: '#1a0a00', color: '#f5e6c8', padding: '13px 32px', borderRadius: 9, textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>Back to CigarDex</a>
          </div>
        ) : (
          <div>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: '20px 24px', marginBottom: 32, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>💡</span>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#1a0a00' }}>Not sure if this is for you?</p>
                <p style={{ margin: 0, fontSize: 13, color: '#5a3a1a', lineHeight: 1.7 }}>
                  Industry accounts are for people who work in the cigar trade — reviewers, retailers, and brand reps. If you're a cigar enthusiast,{' '}
                  <Link href="/" style={{ color: '#8b5e2a', fontWeight: 600, textDecoration: 'underline' }}>a regular account is all you need</Link>.
                  Industry accounts are publicly visible and verified — they're not a premium tier, they're a different tool.
                </p>
              </div>
            </div>

            {/* Step 1 */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a0a00', color: '#c4a96a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>1</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', margin: 0, fontFamily: 'Georgia, serif' }}>Which role fits you?</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                {ROLES.map(role => (
                  <RoleCard key={role.value} role={role} selected={selectedRole === role.value}
                    onSelect={() => { setSelectedRole(role.value); setShowForm(true); setSelectedHonors([]); setSelectedBrandIds(new Set()); setBrandFilter('') }} />
                ))}
              </div>
            </div>

            {/* Step 2 */}
            {showForm && selectedRole && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a0a00', color: '#c4a96a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>2</div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a0a00', margin: 0, fontFamily: 'Georgia, serif' }}>Tell us about yourself</h2>
                </div>

                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8ddd0', padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {/* Name + Email — all roles */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={labelStyle}>Your Name *</label>
                        <input value={form.name} onChange={field('name')} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Professional Email *</label>
                        <input type="email" value={form.email} onChange={field('email')} placeholder="you@yourcompany.com" style={inputStyle} />
                        <p style={{ fontSize: 11, color: '#b71c1c', margin: '6px 0 0', lineHeight: 1.5, fontWeight: 500 }}>
                          ⚠️ Use the professional email you want on your CigarDex account. This cannot be changed afterwards.
                        </p>
                      </div>
                    </div>

                    {/* REVIEWER */}
                    {selectedRole === 'reviewer' && (
                      <>
                        <div>
                          <label style={labelStyle}>Publication / Channel Name *</label>
                          <input value={form.company} onChange={field('company')} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Main Website or Channel URL <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
                          <input value={form.website} onChange={field('website')} placeholder="https://..." style={inputStyle} />
                        </div>
                        <div style={{ background: '#faf8f5', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20 }}>
                          <label style={{ ...labelStyle, marginBottom: 4 }}>Your channels & socials <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
                            {[
                              { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourchannel' },
                              { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel' },
                              { key: 'podcast', label: 'Podcast', placeholder: 'https://...' },
                              { key: 'other_social', label: 'Other', placeholder: 'Any other link...' },
                            ].map(({ key, label, placeholder }) => (
                              <div key={key}>
                                <label style={{ ...labelStyle, fontWeight: 400 }}>{label}</label>
                                <input value={form[key as keyof typeof form]} onChange={field(key as keyof typeof form)} placeholder={placeholder} style={inputStyle} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* RETAILER */}
                    {selectedRole === 'retailer' && (
                      <>
                        <div>
                          <label style={labelStyle}>Store Name *</label>
                          <input value={form.company} onChange={field('company')} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Website <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
                          <input value={form.website} onChange={field('website')} placeholder="https://..." style={inputStyle} />
                        </div>
                        <div style={{ background: '#faf8f5', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20 }}>
                          <label style={{ ...labelStyle, marginBottom: 10 }}>Social media <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                              <label style={{ ...labelStyle, fontWeight: 400 }}>Instagram</label>
                              <input value={form.instagram} onChange={field('instagram')} placeholder="https://instagram.com/yourstore" style={inputStyle} />
                            </div>
                            <div>
                              <label style={{ ...labelStyle, fontWeight: 400 }}>Facebook / Other</label>
                              <input value={form.other_social} onChange={field('other_social')} placeholder="https://..." style={inputStyle} />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label style={{ ...labelStyle, marginBottom: 4 }}>Industry Honors & Designations <span style={{ color: '#bbb', fontWeight: 400 }}>(select all that apply)</span></label>
                          <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 10px', fontStyle: 'italic' }}>These will be shown on your store profile after verification.</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {STORE_HONORS.map(honor => {
                              const active = selectedHonors.includes(honor)
                              return (
                                <button key={honor} onClick={() => toggleHonor(honor)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: active ? 700 : 400, border: active ? '2px solid #1a0a00' : '1px solid #d4b896', background: active ? '#f5f0e8' : '#fff', color: active ? '#1a0a00' : '#5a3a1a' }}>
                                  {active ? '✓ ' : ''}{honor}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    {/* BRAND REP */}
                    {selectedRole === 'brand' && (
                      <>
                        <div>
                          <label style={labelStyle}>Your Role at the Brand(s) <span style={{ color: '#bbb', fontWeight: 400 }}>(e.g. Owner, Sales Rep, PR Contact)</span></label>
                          <input value={form.company} onChange={field('company')} placeholder="e.g. Owner, National Sales Manager..." style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Website <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
                          <input value={form.website} onChange={field('website')} placeholder="https://..." style={inputStyle} />
                        </div>

                        {/* Brand checklist */}
                        <div>
                          <label style={{ ...labelStyle, marginBottom: 4 }}>
                            Brands You Represent *
                            {selectedBrandIds.size > 0 && (
                              <span style={{ marginLeft: 8, fontWeight: 400, color: '#2e7d32' }}>— {selectedBrandIds.size} selected</span>
                            )}
                          </label>
                          <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 10px', fontStyle: 'italic' }}>
                            Check all brands you represent. Each will be verified before you get edit access.
                          </p>

                          {/* Filter */}
                          <input
                            value={brandFilter}
                            onChange={e => setBrandFilter(e.target.value)}
                            placeholder="Filter brands..."
                            style={{ ...inputStyle, marginBottom: 8 }}
                          />

                          {/* Scrollable checklist */}
                          <div style={{ border: '1px solid #d4b896', borderRadius: 8, maxHeight: 300, overflowY: 'auto', background: '#fff' }}>
                            {letters.length === 0 ? (
                              <p style={{ padding: '16px', fontSize: 13, color: '#aaa', margin: 0 }}>No brands match your filter</p>
                            ) : (
                              letters.map(letter => (
                                <div key={letter}>
                                  <div style={{ padding: '6px 14px', background: '#f5f0e8', fontSize: 11, fontWeight: 700, color: '#8b5e2a', letterSpacing: '0.08em', borderBottom: '1px solid #e8ddd0' }}>
                                    {letter}
                                  </div>
                                  {grouped[letter].map(b => {
                                    const checked = selectedBrandIds.has(b.id)
                                    return (
                                      <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderBottom: '1px solid #f5f0e8', cursor: 'pointer', background: checked ? '#f5f0e8' : '#fff', transition: 'background 0.1s' }}>
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => toggleBrandId(b.id)}
                                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1a0a00', flexShrink: 0 }}
                                        />
                                        <span style={{ fontSize: 14, fontWeight: checked ? 600 : 400, color: '#1a0a00', flex: 1 }}>{b.name}</span>
                                        {b.country_of_origin && (
                                          <span style={{ fontSize: 12, color: '#8b5e2a', flexShrink: 0 }}>{b.country_of_origin}</span>
                                        )}
                                      </label>
                                    )
                                  })}
                                </div>
                              ))
                            )}
                          </div>

                          {/* Not listed */}
                          <div style={{ marginTop: 12 }}>
                            <label style={{ ...labelStyle, fontWeight: 400 }}>Brand not listed? Enter the name here:</label>
                            <input
                              value={notListedBrand}
                              onChange={e => setNotListedBrand(e.target.value)}
                              placeholder="Brand name — we'll add it to the database"
                              style={inputStyle}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Message — all roles */}
                    <div>
                      <label style={labelStyle}>Anything else you'd like us to know <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
                      <textarea
                        value={form.message} onChange={field('message')} rows={3}
                        placeholder={
                          selectedRole === 'retailer'
                            ? 'Store location, how long you\'ve been in business, brands you carry...'
                            : selectedRole === 'brand'
                            ? 'Your background, how long you\'ve been with the brand...'
                            : 'How long you\'ve been reviewing, your focus area, approximate audience size...'
                        }
                        style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                      />
                    </div>

                    <div style={{ background: '#f5f0e8', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#8b5e2a', lineHeight: 1.6 }}>
                      📋 A professional or company email is required. Personal addresses (Gmail, Yahoo, etc.) are not accepted.
                    </div>

                    {error && (
                      <div style={{ background: '#fbe9e7', border: '1px solid #f5c6c6', borderRadius: 7, padding: '11px 14px', fontSize: 13, color: '#b71c1c' }}>{error}</div>
                    )}

                    <button onClick={handleSubmit} disabled={submitting} style={{ background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 9, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                      {submitting ? 'Submitting...' : 'Submit Application'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

