'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

type StoreData = {
  id: string
  name: string
  type: string
  address: string | null
  city: string | null
  state: string | null
  phone: string | null
  website_url: string | null
  description: string | null
  hours: Record<string, string> | null
  active: boolean
}

type StoreDesignation = {
  id: string
  custom_name: string | null
  verified: boolean
  status: string | null
  retailer_designations: { name: string; description: string | null } | null
}

type GlobalDesignation = {
  id: string
  name: string
  description: string | null
}

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

const STORE_TYPES = [
  { value: 'brick_and_mortar', label: '🏪 Brick & Mortar' },
  { value: 'online', label: '🌐 Online Only' },
  { value: 'both', label: '🏪🌐 Both' },
]

export default function StoreSetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [store, setStore] = useState<StoreData | null>(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    type: 'brick_and_mortar',
    address: '',
    city: '',
    state: '',
    phone: '',
    website_url: '',
    description: '',
  })

  const [hours, setHours] = useState<Record<string, string>>({
    mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '',
  })

  // Designations
  const [designations, setDesignations] = useState<StoreDesignation[]>([])
  const [globalDesignations, setGlobalDesignations] = useState<GlobalDesignation[]>([])
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [designationMsg, setDesignationMsg] = useState('')
  const [designationSaving, setDesignationSaving] = useState(false)

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/?signin=true'); return }
    const { data: profile } = await supabase.from('users').select('id, role').eq('id', session.user.id).maybeSingle()
    if (!profile || profile.role !== 'store') { router.push('/'); return }
    await fetchStore(profile.id)
    setLoading(false)
  }

  async function fetchStore(userId: string) {
    const { data: account } = await supabase
      .from('store_accounts').select('id').eq('user_id', userId).maybeSingle()
    if (!account) return
    const { data: storeData } = await supabase
      .from('stores').select('id, name, type, address, city, state, phone, website_url, description, hours, active')
      .eq('store_account_id', account.id).maybeSingle()
    if (!storeData) return
    setStore(storeData)
    setForm({
      name: storeData.name || '',
      type: storeData.type || 'brick_and_mortar',
      address: storeData.address || '',
      city: storeData.city || '',
      state: storeData.state || '',
      phone: storeData.phone || '',
      website_url: storeData.website_url || '',
      description: storeData.description || '',
    })
    if (storeData.hours) {
      setHours({ mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '', ...storeData.hours })
    }
    await Promise.all([
      loadDesignations(storeData.id),
      fetchGlobalDesignations(),
    ])
  }

  async function loadDesignations(storeId: string) {
    const { data } = await supabase
      .from('store_designations')
      .select('id, custom_name, verified, status, retailer_designations(name, description)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: true })
    if (data) setDesignations(data as unknown as StoreDesignation[])
  }

  async function fetchGlobalDesignations() {
    const { data } = await supabase.from('retailer_designations').select('id, name, description').order('name')
    if (data) setGlobalDesignations(data)
  }

  async function addStandardDesignation(designationId: string, name: string) {
    if (!store) return
    const already = designations.find(d => d.retailer_designations?.name === name)
    if (already) { setDesignationMsg('Already on your list.'); return }
    setDesignationSaving(true)
    const { error } = await supabase.from('store_designations').insert({
      store_id: store.id, designation_id: designationId,
      verified: false, status: 'pending',
    })
    setDesignationSaving(false)
    if (error) { setDesignationMsg(`Error: ${error.message}`); return }
    setDesignationMsg('Request submitted — we\'ll verify and approve it shortly.')
    loadDesignations(store.id)
    setShowAddPanel(false)
  }

  async function requestCustomDesignation() {
    if (!store || !customInput.trim()) return
    setDesignationSaving(true)
    const { error } = await supabase.from('store_designations').insert({
      store_id: store.id, designation_id: null,
      custom_name: customInput.trim(), verified: false, status: 'pending',
    })
    setDesignationSaving(false)
    if (error) { setDesignationMsg(`Error: ${error.message}`); return }
    setCustomInput('')
    setDesignationMsg('Custom designation requested — we\'ll review it shortly.')
    loadDesignations(store.id)
    setShowAddPanel(false)
  }

  async function removeDesignation(id: string) {
    await supabase.from('store_designations').delete().eq('id', id)
    setDesignations(prev => prev.filter(d => d.id !== id))
  }

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  function setHourDay(day: string, value: string) {
    setHours(prev => ({ ...prev, [day]: value }))
  }

  function copyToAll(value: string) {
    setHours({ mon: value, tue: value, wed: value, thu: value, fri: value, sat: value, sun: value })
  }

  async function handleSave() {
    setError(''); setMsg('')
    if (!form.name.trim()) { setError('Store name is required.'); return }
    if (!store) return
    setSaving(true)
    const cleanHours = Object.fromEntries(Object.entries(hours).filter(([, v]) => v.trim()))
    const { error: err } = await supabase.from('stores').update({
      name: form.name.trim(),
      type: form.type,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      phone: form.phone.trim() || null,
      website_url: form.website_url.trim() || null,
      description: form.description.trim() || null,
      hours: Object.keys(cleanHours).length > 0 ? cleanHours : null,
    }).eq('id', store.id)
    setSaving(false)
    if (err) { setError(`Save failed: ${err.message}`); return }
    setMsg('Store profile saved.')
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

  const approvedDesignations = designations.filter(d => d.status === 'approved' || d.verified)
  const pendingDesignations = designations.filter(d => d.status === 'pending' && !d.verified)
  const addedNames = designations.map(d => d.retailer_designations?.name).filter(Boolean)
  const availableToRequest = globalDesignations.filter(d => !addedNames.includes(d.name))

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif' }}>
      <Header />

      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '36px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: '#f5e6c8', fontSize: 24, fontWeight: 700, margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              Store Profile Setup
            </h1>
            <p style={{ color: '#c4a96a', fontSize: 14, margin: 0 }}>
              Manage your public store page, hours, and designations.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {store && (
              <a href={`/store/${store.id}`} target="_blank" rel="noopener noreferrer"
                style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid rgba(196,169,106,0.4)', color: '#c4a96a', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                View Public Page ↗
              </a>
            )}
            <a href="/pro" style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid rgba(196,169,106,0.4)', color: '#c4a96a', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              ← Dashboard
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 64px' }}>

        {msg && (
          <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 14, color: '#2e7d32', fontWeight: 600 }}>
            ✓ {msg}
          </div>
        )}
        {error && (
          <div style={{ background: '#fbe9e7', border: '1px solid #f5c6c6', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 14, color: '#b71c1c' }}>
            {error}
          </div>
        )}

        {/* Basic info */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28, marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>Basic Information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Store Name *</label>
                <input value={form.name} onChange={field('name')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Store Type</label>
                <select value={form.type} onChange={field('type')} style={inputStyle}>
                  {STORE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
              <textarea value={form.description} onChange={field('description')} rows={3}
                placeholder="Tell customers about your store — what makes it special, your specialty brands, your lounge..."
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28, marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>Contact & Location</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Street Address</label>
              <input value={form.address} onChange={field('address')} placeholder="123 Main St" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>City</label>
                <input value={form.city} onChange={field('city')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>State / Province</label>
                <input value={form.state} onChange={field('state')} placeholder="MO" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Phone</label>
                <input value={form.phone} onChange={field('phone')} placeholder="(555) 555-5555" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Website</label>
                <input value={form.website_url} onChange={field('website_url')} placeholder="https://..." style={inputStyle} />
              </div>
            </div>
          </div>
        </div>

        {/* Hours */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: 0, fontFamily: 'Georgia, serif' }}>Hours</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#8b5e2a' }}>Copy Monday to all:</span>
              <button onClick={() => copyToAll(hours.mon)}
                style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #d4b896', background: '#fff', color: '#5a3a1a', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                Apply
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DAYS.map(day => (
              <div key={day.key} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 14, alignItems: 'center' }}>
                <label style={{ fontSize: 13, color: '#1a0a00', fontWeight: 600 }}>{day.label}</label>
                <input
                  value={hours[day.key] || ''}
                  onChange={e => setHourDay(day.key, e.target.value)}
                  placeholder='e.g. "10 AM – 6 PM" or "Closed"'
                  style={{ ...inputStyle, fontSize: 13 }}
                />
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#aaa', margin: '12px 0 0', fontStyle: 'italic' }}>
            Leave a day blank to hide it. Type "Closed" to show it as closed.
          </p>
        </div>

        {/* Save button */}
        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', padding: '14px 0', background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, marginBottom: 28 }}>
          {saving ? 'Saving...' : 'Save Store Profile'}
        </button>

        {/* Designations */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: 0, fontFamily: 'Georgia, serif' }}>
              Industry Designations
            </h2>
            <button onClick={() => { setShowAddPanel(!showAddPanel); setDesignationMsg('') }}
              style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid #d4b896', background: showAddPanel ? '#1a0a00' : '#fff', color: showAddPanel ? '#f5e6c8' : '#5a3a1a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {showAddPanel ? '× Close' : '+ Add'}
            </button>
          </div>
          <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 16px' }}>
            Your honors and certifications — shown on your public store profile.
            New requests are reviewed within 1–2 business days.
          </p>

          {designationMsg && (
            <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#2e7d32', display: 'flex', justifyContent: 'space-between' }}>
              <span>✓ {designationMsg}</span>
              <button onClick={() => setDesignationMsg('')} style={{ background: 'none', border: 'none', color: '#2e7d32', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
          )}

          {/* Pending */}
          {pendingDesignations.length > 0 && (
            <div style={{ background: '#fff3e0', borderRadius: 8, padding: '12px 16px', marginBottom: 14, border: '1px solid #ffe0b2' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#e65100', margin: '0 0 8px' }}>⏳ Pending review</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {pendingDesignations.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #ffe0b2', borderRadius: 6, padding: '5px 10px' }}>
                    <span style={{ fontSize: 13, color: '#5a3a1a' }}>{d.retailer_designations?.name || d.custom_name}</span>
                    <button onClick={() => removeDesignation(d.id)} style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved */}
          {approvedDesignations.length === 0 && pendingDesignations.length === 0 ? (
            <div style={{ background: '#f5f0e8', borderRadius: 8, padding: '16px 20px', marginBottom: showAddPanel ? 20 : 0 }}>
              <p style={{ fontSize: 13, color: '#8b5e2a', margin: 0 }}>
                No designations yet. Use the Add button to request your honors.
              </p>
            </div>
          ) : approvedDesignations.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: showAddPanel ? 20 : 0 }}>
              {approvedDesignations.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f0e8', border: '1px solid #d4b896', borderRadius: 8, padding: '7px 12px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a0a00' }}>
                    {d.retailer_designations?.name || d.custom_name}
                    {!d.retailer_designations && <span style={{ fontSize: 11, color: '#8b5e2a', marginLeft: 6, fontStyle: 'italic' }}>custom</span>}
                  </span>
                  <button onClick={() => removeDesignation(d.id)} style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          ) : null}

          {/* Add panel */}
          {showAddPanel && (
            <div style={{ borderTop: '1px solid #f0e8dc', paddingTop: 20, marginTop: approvedDesignations.length > 0 || pendingDesignations.length > 0 ? 4 : 0 }}>
              {availableToRequest.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1a0a00', margin: '0 0 10px' }}>Standard designations</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {availableToRequest.map(d => (
                      <button key={d.id} onClick={() => addStandardDesignation(d.id, d.name)}
                        disabled={designationSaving}
                        title={d.description || ''}
                        style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #d4b896', background: '#fff', color: '#5a3a1a', fontSize: 13, cursor: 'pointer', fontWeight: 500, opacity: designationSaving ? 0.6 : 1 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5f0e8' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}>
                        + {d.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1a0a00', margin: '0 0 4px' }}>Don't see yours? Request a custom designation</p>
                <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 10px', fontStyle: 'italic' }}>
                  e.g. "Business of the Year — Springfield 2024" or any honor not on the standard list
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input value={customInput} onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') requestCustomDesignation() }}
                    placeholder='e.g. "Best Cigar Shop — Springfield 2024"'
                    style={{ flex: 1, padding: '10px 12px', borderRadius: 7, border: '1px solid #d4b896', fontSize: 13, outline: 'none', fontFamily: 'system-ui' }} />
                  <button onClick={requestCustomDesignation} disabled={designationSaving}
                    style={{ padding: '10px 18px', borderRadius: 7, border: 'none', background: '#1a0a00', color: '#f5e6c8', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: designationSaving ? 0.6 : 1 }}>
                    Request
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
      <Footer />
    </div>
  )
}
