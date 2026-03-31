'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type CigarSnapshot = {
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
}

type Props = {
  cigar: CigarSnapshot
  userId: string
  onClose: () => void
}

const STRENGTHS = ['mild', 'mild_medium', 'medium', 'medium_full', 'full']
const STRENGTH_LABELS: Record<string, string> = {
  mild: 'Mild', mild_medium: 'Mild-Medium', medium: 'Medium',
  medium_full: 'Medium-Full', full: 'Full',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 6,
  border: '1px solid #d4b896', fontSize: 14, outline: 'none',
  boxSizing: 'border-box', background: '#fff',
}

export default function SuggestEdit({ cigar, userId, onClose }: Props) {
  const [form, setForm] = useState({
    name: cigar.name || '',
    line: cigar.line || '',
    vitola: cigar.vitola || '',
    strength: cigar.strength || '',
    wrapper_origin: cigar.wrapper_origin || '',
    binder_origin: cigar.binder_origin || '',
    filler_origins: cigar.filler_origins || '',
    msrp: cigar.msrp?.toString() || '',
    upc: cigar.upc || '',
  })
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit() {
    setError('')

    // Build a diff — only include fields that actually changed
    const changes: Record<string, unknown> = {}
    if (form.name !== cigar.name) changes.name = form.name
    if (form.line !== (cigar.line || '')) changes.line = form.line || null
    if (form.vitola !== (cigar.vitola || '')) changes.vitola = form.vitola || null
    if (form.strength !== (cigar.strength || '')) changes.strength = form.strength || null
    if (form.wrapper_origin !== (cigar.wrapper_origin || '')) changes.wrapper_origin = form.wrapper_origin || null
    if (form.binder_origin !== (cigar.binder_origin || '')) changes.binder_origin = form.binder_origin || null
    if (form.filler_origins !== (cigar.filler_origins || '')) changes.filler_origins = form.filler_origins || null
    const msrpNum = form.msrp ? parseFloat(form.msrp) : null
    if (msrpNum !== cigar.msrp) changes.msrp = msrpNum
    if (form.upc !== (cigar.upc || '')) changes.upc = form.upc || null

    if (Object.keys(changes).length === 0) {
      setError("You haven't changed anything yet.")
      return
    }

    if (reason.trim()) changes._reason = reason.trim()

    setSubmitting(true)
    const { error: err } = await supabase.from('cigar_edits').insert({
      cigar_id: cigar.id,
      submitted_by: userId,
      changes,
      status: 'pending',
    })

    if (err) { setError(err.message); setSubmitting(false); return }
    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div style={{ background: '#faf8f5', border: '1px solid #e8ddd0', borderRadius: 12, padding: 32, marginTop: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a0a00', margin: '0 0 8px' }}>Thanks for the suggestion!</h3>
        <p style={{ color: '#8b5e2a', fontSize: 14, margin: '0 0 20px' }}>
          Your edit has been submitted and will be reviewed by our team. Good catches help keep the database accurate for everyone.
        </p>
        <button onClick={onClose} style={{ background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Done
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: '#faf8f5', border: '1px solid #e8ddd0', borderRadius: 12, padding: 28, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a0a00', margin: 0 }}>Suggest an Edit</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
      </div>
      <p style={{ color: '#8b5e2a', fontSize: 13, margin: '0 0 20px' }}>
        Change only the fields that need correcting — we'll show the diff to our moderators for review.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Cigar Name</label>
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
        <div>
          <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>UPC</label>
          <input value={form.upc} onChange={field('upc')} style={inputStyle} />
        </div>
      </div>

      {/* Reason */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>
          Reason / Source <span style={{ color: '#bbb' }}>(optional but helpful)</span>
        </label>
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Official brand website, box says Ecuadorian wrapper..."
          style={inputStyle}
        />
      </div>

      {error && (
        <p style={{ color: '#b71c1c', fontSize: 13, background: '#fbe9e7', padding: '8px 12px', borderRadius: 6, marginBottom: 14 }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d4b896', background: '#fff', color: '#5a3a1a', fontSize: 14, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#1a0a00', color: '#f5e6c8', fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Submitting...' : 'Submit Edit'}
        </button>
      </div>
    </div>
  )
}
