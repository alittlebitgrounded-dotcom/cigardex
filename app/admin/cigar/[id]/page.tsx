'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ReportError from '@/components/ReportError'
import Footer from '@/components/Footer'

type CigarDetail = {
  id: string
  name: string
  line: string | null
  vitola: string | null
  strength: string | null
  wrapper_origin: string | null
  binder_origin: string | null
  filler_origins: string | null
  msrp: number | null
  upc: string | null
  status: string
  is_limited: boolean
  notes: string | null
  description: string | null
  country_of_origin: string | null
  brand_account_id: string
  created_at: string

  brand_accounts: { id: string; name: string } | null
}

type Brand = { id: string; name: string }

const STRENGTHS = ['mild', 'mild_medium', 'medium', 'medium_full', 'full']
const STRENGTH_LABELS: Record<string, string> = {
  mild: 'Mild', mild_medium: 'Mild-Medium', medium: 'Medium',
  medium_full: 'Medium-Full', full: 'Full',
}
const STATUSES = ['sandbox', 'live', 'rejected', 'suspended']
const STATUS_COLORS: Record<string, string> = {
  sandbox: '#fff3e0', live: '#e8f5e9', rejected: '#fbe9e7', suspended: '#fbe9e7',
}
const STATUS_TEXT: Record<string, string> = {
  sandbox: '#e65100', live: '#2e7d32', rejected: '#b71c1c', suspended: '#b71c1c',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 6,
  border: '1px solid #d4b896', fontSize: 14, outline: 'none',
  boxSizing: 'border-box', background: '#fff',
}

export default function AdminCigarPage() {
  const params = useParams()
  const router = useRouter()
  const cigarId = params.id as string
const [showReportError, setShowReportError] = useState(false)
  const [cigar, setCigar] = useState<CigarDetail | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const [form, setForm] = useState({
    name: '', line: '', vitola: '', strength: '',
    wrapper_origin: '', binder_origin: '', filler_origins: '',
    msrp: '', upc: '', country_of_origin: '',
    status: 'live', is_limited: false,
    description: '', notes: '',
    brand_account_id: '',
  })

  useEffect(() => {
    checkAuth()
    fetchBrands()
    if (cigarId !== 'new') fetchCigar()
    else setLoading(false)
  }, [cigarId])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single()
    if (!data || !['super_admin', 'moderator'].includes(data.role)) router.push('/')
  }

  async function fetchBrands() {
    const { data } = await supabase.from('brand_accounts').select('id, name').order('name')
    if (data) setBrands(data)
  }

  async function fetchCigar() {
    setLoading(true)
    const { data } = await supabase
      .from('cigars')
      .select('id, name, line, vitola, strength, wrapper_origin, binder_origin, filler_origins, msrp, upc, status, is_limited, notes, description, country_of_origin, brand_account_id, created_at, brand_accounts(id, name)')
      .eq('id', cigarId)
      .single()

    if (data) {
      setCigar(data as unknown as CigarDetail)
      setForm({
        name: data.name || '',
        line: data.line || '',
        vitola: data.vitola || '',
        strength: data.strength || '',
        wrapper_origin: data.wrapper_origin || '',
        binder_origin: data.binder_origin || '',
        filler_origins: data.filler_origins || '',
        msrp: data.msrp?.toString() || '',
        upc: data.upc || '',
        country_of_origin: (data as any).country_of_origin || '',
        status: data.status || 'live',
        is_limited: data.is_limited || false,
        description: (data as any).description || '',
        notes: data.notes || '',
        brand_account_id: data.brand_account_id || '',
      })
    }
    setLoading(false)
  }

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }))
    }
  }

  async function save() {
    if (!form.name.trim()) { setMsg('Name is required'); return }
    if (!form.brand_account_id) { setMsg('Brand is required'); return }
    setSaving(true)
    setMsg('')

    const payload = {
      name: form.name.trim(),
      line: form.line.trim() || null,
      vitola: form.vitola.trim() || null,
      strength: form.strength || null,
      wrapper_origin: form.wrapper_origin.trim() || null,
      binder_origin: form.binder_origin.trim() || null,
      filler_origins: form.filler_origins.trim() || null,
      msrp: form.msrp ? parseFloat(form.msrp) : null,
      upc: form.upc.trim() || null,
      country_of_origin: form.country_of_origin.trim() || null,
      status: form.status,
      is_limited: form.is_limited,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
      brand_account_id: form.brand_account_id,
    }

    if (cigarId === 'new') {
      const { data, error } = await supabase.from('cigars').insert(payload).select('id').single()
      if (error) { setMsg(error.message); setSaving(false); return }
      setMsg('Cigar created!')
      setTimeout(() => router.push(`/admin/cigar/${data.id}`), 1000)
    } else {
      const { error } = await supabase.from('cigars').update(payload).eq('id', cigarId)
      if (error) { setMsg(error.message); setSaving(false); return }
      setMsg('Saved!')
      fetchCigar()
    }
    setSaving(false)
  }

  async function deleteCigar() {
    await supabase.from('cigars').delete().eq('id', cigarId)
    router.push('/admin')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#8b5e2a' }}>Loading...</p>
    </div>
  )

  const isNew = cigarId === 'new'

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{ background: '#1a0a00', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ color: '#f5e6c8', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>🍂 CigarLog</a>
          <span style={{ color: '#c4a96a', fontSize: 13, background: '#2c1206', padding: '3px 10px', borderRadius: 4, fontWeight: 600 }}>ADMIN</span>
        </div>
        <a href="/admin" style={{ color: '#c4a96a', fontSize: 14, textDecoration: 'none' }}>← Back to Admin</a>
      </header>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '28px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: '#f5e6c8', fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>
              {isNew ? 'Add New Cigar' : form.name || 'Edit Cigar'}
            </h1>
            {!isNew && cigar && (
              <p style={{ color: '#8b6a4a', fontSize: 13, margin: 0 }}>
                {cigar.brand_accounts?.name} · Added {new Date(cigar.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {!isNew && (
              <a href={`/cigar/${cigarId}`} target="_blank" rel="noopener noreferrer"
                style={{ padding: '8px 16px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#c4a96a', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
                View Public Page ↗
              </a>
            )}
            {!isNew && !deleteConfirm && (
              <button onClick={() => setDeleteConfirm(true)}
                style={{ padding: '8px 16px', borderRadius: 6, background: '#fbe9e7', color: '#b71c1c', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Delete
              </button>
            )}
            {deleteConfirm && (
              <button onClick={deleteCigar}
                style={{ padding: '8px 16px', borderRadius: 6, background: '#b71c1c', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Confirm Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Status */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 16px' }}>Status</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {STATUSES.map(s => (
                <button key={s} onClick={() => setForm(prev => ({ ...prev, status: s }))} style={{
                  padding: '8px 18px', borderRadius: 20,
                  border: form.status === s ? '2px solid #1a0a00' : '1px solid #d4b896',
                  background: form.status === s ? STATUS_COLORS[s] : '#fff',
                  color: form.status === s ? STATUS_TEXT[s] : '#888',
                  fontSize: 14, fontWeight: form.status === s ? 700 : 400, cursor: 'pointer',
                }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Core info */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 16px' }}>Core Info</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Brand *</label>
                <select value={form.brand_account_id} onChange={field('brand_account_id')} style={inputStyle}>
                  <option value="">Select brand...</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Cigar Name *</label>
                <input value={form.name} onChange={field('name')} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Line</label>
                <input value={form.line} onChange={field('line')} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Vitola</label>
                <input value={form.vitola} onChange={field('vitola')} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Strength</label>
                <select value={form.strength} onChange={field('strength')} style={inputStyle}>
                  <option value="">Select...</option>
                  {STRENGTHS.map(s => <option key={s} value={s}>{STRENGTH_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>MSRP ($)</label>
                <input type="number" step="0.01" value={form.msrp} onChange={field('msrp')} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>UPC</label>
                <input value={form.upc} onChange={field('upc')} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Country of Origin</label>
                <input value={form.country_of_origin} onChange={field('country_of_origin')} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
                <input type="checkbox" id="limited" checked={form.is_limited}
                  onChange={e => setForm(prev => ({ ...prev, is_limited: e.target.checked }))}
                  style={{ cursor: 'pointer', width: 16, height: 16 }} />
                <label htmlFor="limited" style={{ fontSize: 14, color: '#5a3a1a', cursor: 'pointer' }}>Limited Edition</label>
              </div>
            </div>
          </div>

          {/* Tobacco */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 16px' }}>Tobacco</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Wrapper</label>
                <input value={form.wrapper_origin} onChange={field('wrapper_origin')} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Binder</label>
                <input value={form.binder_origin} onChange={field('binder_origin')} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Filler</label>
                <input value={form.filler_origins} onChange={field('filler_origins')} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Description — public facing */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 4px' }}>Description</h3>
            <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 12px' }}>Public-facing — story, background, or notes about this cigar shown on the detail page</p>
            <textarea value={form.description} onChange={field('description')} rows={4}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }} />
          </div>

          {/* Admin notes — internal only */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 4px' }}>Admin Notes</h3>
            <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 12px' }}>Internal only — data source, verification status, issues</p>
            <textarea value={form.notes} onChange={field('notes')} rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }} />
          </div>

          {/* Save */}
          {msg && (
            <div style={{ background: msg === 'Saved!' || msg.includes('created') ? '#e8f5e9' : '#fbe9e7', color: msg === 'Saved!' || msg.includes('created') ? '#2e7d32' : '#b71c1c', padding: '12px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
              {msg}
            </div>
          )}
          <button onClick={save} disabled={saving} style={{
            background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 8,
            padding: '14px 0', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving...' : isNew ? 'Create Cigar' : 'Save Changes'}
          </button>

        </div>
      </div>
      <Footer />
    </div>
  )
}
