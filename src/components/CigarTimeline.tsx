'use client'

// src/components/CigarTimeline.tsx
// Full redesign — rich event cards, proper date display,
// better empty state, cleaner form, pending badge for submitters.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type EventType =
  | 'release' | 'discontinued' | 'blend_change'
  | 'name_change' | 'size_change' | 'award'
  | 'price_change' | 'note'

interface TimelineEntry {
  id: string
  event_type: EventType
  event_date: string | null
  date_precision: 'day' | 'month' | 'year'
  title: string
  body: string | null
  source: string | null
  submitted_by_username: string | null
  submitted_by_role: string | null
}

interface SubmitForm {
  event_type: EventType | ''
  year: string
  month: string
  day: string
  title: string
  body: string
  source: string
}

const EVENT_META: Record<EventType, { label: string; icon: string; color: string; bg: string }> = {
  release:      { label: 'Initial Release', icon: '🌱', color: '#2e7d32', bg: '#e8f5e9' },
  discontinued: { label: 'Discontinued',    icon: '🪦', color: '#616161', bg: '#f5f5f5' },
  blend_change: { label: 'Blend Change',    icon: '🔄', color: '#7b3f00', bg: '#fff3e0' },
  name_change:  { label: 'Renamed',         icon: '✏️', color: '#1565c0', bg: '#e3f2fd' },
  size_change:  { label: 'Size Change',     icon: '📐', color: '#6a1b9a', bg: '#f3e5f5' },
  award:        { label: 'Award',           icon: '🏆', color: '#b8860b', bg: '#fffde7' },
  price_change: { label: 'Price Change',    icon: '💰', color: '#00695c', bg: '#e0f2f1' },
  note:         { label: 'Historical Note', icon: '📝', color: '#4a4a4a', bg: '#f5f0e8' },
}

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'release',      label: '🌱 Initial Release' },
  { value: 'award',        label: '🏆 Award Won' },
  { value: 'blend_change', label: '🔄 Blend Change' },
  { value: 'size_change',  label: '📐 Size / Vitola Change' },
  { value: 'name_change',  label: '✏️ Name Change' },
  { value: 'price_change', label: '💰 Price Change' },
  { value: 'discontinued', label: '🪦 Discontinued' },
  { value: 'note',         label: '📝 Historical Note' },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December']

function formatEventDate(date: string | null, precision: 'day' | 'month' | 'year'): string {
  if (!date) return ''
  const parts = date.split('T')[0].split('-')
  const year = parts[0]
  const month = parts[1]
  const day = parts[2]
  if (precision === 'year' || !month || month === '') return year
  if (precision === 'month' || !day || day === '') return `${MONTHS[parseInt(month) - 1]} ${year}`
  return `${MONTHS_LONG[parseInt(month) - 1]} ${parseInt(day)}, ${year}`
}

function buildDateString(year: string, month: string, day: string): string {
  if (!year) return ''
  const m = month ? month.padStart(2, '0') : ''
  const d = day ? day.padStart(2, '0') : ''
  return [year, m, d].filter(Boolean).join('-')
}

function datePrecision(month: string, day: string): 'day' | 'month' | 'year' {
  if (day) return 'day'
  if (month) return 'month'
  return 'year'
}

interface Props {
  cigarId: string
  userRole?: string | null
  userId?: string | null
}

export default function CigarTimeline({ cigarId, userRole, userId }: Props) {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [submitError, setSubmitError] = useState('')

  const [form, setForm] = useState<SubmitForm>({
    event_type: '', year: '', month: '', day: '',
    title: '', body: '', source: '',
  })

  const canPostDirectly = userRole === 'super_admin' || userRole === 'moderator'

  useEffect(() => { loadTimeline() }, [cigarId])

  async function loadTimeline() {
    setLoading(true)
    const { data } = await supabase
      .from('cigar_timeline_live')
      .select('*')
      .eq('cigar_id', cigarId)
      .order('event_date', { ascending: true })
    setEntries(data ?? [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.event_type) { setSubmitError('Please select an event type.'); return }
    if (!form.title.trim()) { setSubmitError('Please enter a title.'); return }
    if (!form.year) { setSubmitError('Please enter at least a year.'); return }

    setSubmitting(true)
    setSubmitError('')

    const dateString = buildDateString(form.year, form.month, form.day)
    const precision = datePrecision(form.month, form.day)

    const { error } = await supabase.from('cigar_timeline').insert({
      cigar_id:       cigarId,
      event_type:     form.event_type,
      event_date:     dateString ? `${dateString}-01`.slice(0, 10) : null,
      date_precision: precision,
      title:          form.title.trim(),
      body:           form.body.trim() || null,
      source:         form.source.trim() || null,
      submitted_by:   userId,
      status:         canPostDirectly ? 'live' : 'pending',
    })

    if (error) {
      setSubmitError('Something went wrong. Please try again.')
    } else {
      setSubmitSuccess(
        canPostDirectly
          ? 'Entry added to the timeline.'
          : 'Thanks! Your submission will appear after review.'
      )
      setForm({ event_type: '', year: '', month: '', day: '', title: '', body: '', source: '' })
      setShowForm(false)
      if (canPostDirectly) loadTimeline()
    }
    setSubmitting(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 6,
    border: '1px solid #d4b896', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', background: '#fff',
  }

  if (loading) return (
    <div style={{ padding: '48px 0', textAlign: 'center' }}>
      <p style={{ color: '#aaa', fontSize: 14 }}>Loading timeline...</p>
    </div>
  )

  return (
    <div style={{ padding: '4px 0' }}>

      {/* Success banner */}
      {submitSuccess && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 14, color: '#2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>✓ {submitSuccess}</span>
          <button onClick={() => setSubmitSuccess('')} style={{ background: 'none', border: 'none', color: '#2e7d32', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>
      )}

      {/* ── Empty state ── */}
      {entries.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '56px 24px', background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.6 }}>📜</div>
          <h3 style={{ color: '#1a0a00', fontSize: 17, fontWeight: 700, margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
            No history recorded yet
          </h3>
          <p style={{ color: '#8b5e2a', fontSize: 14, margin: '0 0 6px', lineHeight: 1.6 }}>
            Know when this cigar was released, won an award, or changed its blend?
          </p>
          <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 24px' }}>
            Help build the record — your submission will be reviewed before it goes live.
          </p>
          {userId ? (
            <button onClick={() => setShowForm(true)} style={{ background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Add First Entry
            </button>
          ) : (
            <a href="/" style={{ color: '#8b5e2a', fontSize: 14, textDecoration: 'underline' }}>Sign in to add an entry</a>
          )}
        </div>
      )}

      {/* ── Timeline entries ── */}
      {entries.length > 0 && (
        <div style={{ position: 'relative' }}>
          {/* Vertical connector line */}
          <div style={{
            position: 'absolute', left: 20, top: 24, bottom: 24,
            width: 2, background: 'linear-gradient(to bottom, #e8ddd0, #d4b896, #e8ddd0)',
            borderRadius: 2, zIndex: 0,
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {entries.map((entry, i) => {
              const meta = EVENT_META[entry.event_type] || EVENT_META.note
              const dateStr = formatEventDate(entry.event_date, entry.date_precision)
              const isLast = i === entries.length - 1

              return (
                <div key={entry.id} style={{ display: 'flex', gap: 0, position: 'relative', paddingBottom: isLast ? 0 : 24 }}>
                  {/* Left — date + dot */}
                  <div style={{ width: 42, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 18 }}>
                    {/* Dot */}
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      background: meta.color, border: '3px solid #faf8f5',
                      boxShadow: `0 0 0 2px ${meta.color}40`,
                      zIndex: 1, position: 'relative',
                    }} />
                  </div>

                  {/* Right — event card */}
                  <div style={{ flex: 1, paddingTop: 8 }}>
                    <div style={{
                      background: '#fff', borderRadius: 10,
                      border: `1px solid #e8ddd0`,
                      borderLeft: `3px solid ${meta.color}`,
                      padding: '16px 20px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}>
                      {/* Header row: badge + date */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                        {/* Event type badge */}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: meta.bg, color: meta.color,
                          fontSize: 11, fontWeight: 700, padding: '3px 10px',
                          borderRadius: 20, letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}>
                          {meta.icon} {meta.label}
                        </span>
                        {/* Date */}
                        {dateStr && (
                          <span style={{
                            fontSize: 13, fontWeight: 600, color: '#8b5e2a',
                            background: '#f5f0e8', padding: '3px 10px',
                            borderRadius: 20, letterSpacing: '0.02em',
                          }}>
                            {dateStr}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#1a0a00', lineHeight: 1.4, fontFamily: 'Georgia, serif' }}>
                        {entry.title}
                      </p>

                      {/* Body */}
                      {entry.body && (
                        <p style={{ margin: '0 0 10px', fontSize: 13, color: '#5a3a1a', lineHeight: 1.7 }}>
                          {entry.body}
                        </p>
                      )}

                      {/* Source */}
                      {entry.source && (
                        <div style={{ marginTop: entry.body ? 0 : 6 }}>
                          {entry.source.startsWith('http') ? (
                            <a href={entry.source} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 12, color: '#c4a96a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                              <span style={{ fontSize: 10 }}>🔗</span> Source ↗
                            </a>
                          ) : (
                            <span style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>
                              Source: {entry.source}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add entry button below entries */}
          {userId && !showForm && (
            <div style={{ marginTop: 28, paddingLeft: 42 }}>
              <button onClick={() => setShowForm(true)}
                style={{ background: 'none', border: '1px solid #d4b896', borderRadius: 8, padding: '9px 20px', fontSize: 13, color: '#8b5e2a', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add an entry
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Submission form ── */}
      {showForm && (
        <div style={{ marginTop: entries.length > 0 ? 28 : 0, background: '#fff', border: '1px solid #e8ddd0', borderRadius: 12, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

          {/* Form header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
                {canPostDirectly ? 'Add Timeline Entry' : 'Submit a Timeline Entry'}
              </h3>
              {!canPostDirectly && (
                <p style={{ fontSize: 12, color: '#8b5e2a', margin: 0 }}>
                  Your submission will be reviewed before it appears publicly.
                </p>
              )}
            </div>
            <button onClick={() => { setShowForm(false); setSubmitError('') }}
              style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>
              ×
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Event type — chips */}
            <div>
              <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 8, fontWeight: 600 }}>
                Event Type <span style={{ color: '#b71c1c' }}>*</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {EVENT_TYPE_OPTIONS.map(o => {
                  const active = form.event_type === o.value
                  const meta = EVENT_META[o.value]
                  return (
                    <button key={o.value}
                      onClick={() => setForm(p => ({ ...p, event_type: o.value as EventType }))}
                      style={{
                        padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                        border: active ? `2px solid ${meta.color}` : '1px solid #d4b896',
                        background: active ? meta.bg : '#fff',
                        color: active ? meta.color : '#5a3a1a',
                        fontWeight: active ? 700 : 400,
                      }}>
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date fields */}
            <div>
              <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 8, fontWeight: 600 }}>
                Date <span style={{ color: '#b71c1c' }}>*</span>
                <span style={{ color: '#bbb', fontWeight: 400, marginLeft: 8 }}>Year required · month and day optional</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Year *</label>
                  <input
                    type="number" min="1800" max={new Date().getFullYear()}
                    placeholder="e.g. 2014"
                    value={form.year}
                    onChange={e => setForm(p => ({ ...p, year: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Month (optional)</label>
                  <select value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))} style={inputStyle}>
                    <option value="">—</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Day</label>
                  <input
                    type="number" min="1" max="31"
                    placeholder="—"
                    value={form.day}
                    onChange={e => setForm(p => ({ ...p, day: e.target.value }))}
                    style={inputStyle}
                    disabled={!form.month}
                  />
                </div>
              </div>
              {form.year && (
                <p style={{ fontSize: 12, color: '#c4a96a', margin: '6px 0 0', fontStyle: 'italic' }}>
                  Will display as: <strong>{formatEventDate(buildDateString(form.year, form.month, form.day) + ((!form.month || !form.day) ? '-01' : ''), datePrecision(form.month, form.day))}</strong>
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 6, fontWeight: 600 }}>
                Title <span style={{ color: '#b71c1c' }}>*</span>
              </label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder='e.g. "Won #1 Cigar of the Year — Cigar Aficionado 2014"'
                style={inputStyle}
              />
            </div>

            {/* Details */}
            <div>
              <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 6, fontWeight: 600 }}>
                Details <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                value={form.body}
                onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                rows={3}
                placeholder="Additional context, background, or notes..."
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }}
              />
            </div>

            {/* Source */}
            <div>
              <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 6, fontWeight: 600 }}>
                Source <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                value={form.source}
                onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                placeholder="https://... or 'Cigar Aficionado, Jan 2014'"
                style={inputStyle}
              />
            </div>

            {submitError && (
              <div style={{ background: '#fbe9e7', border: '1px solid #f5c6c6', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#b71c1c' }}>
                {submitError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button onClick={handleSubmit} disabled={submitting} style={{
                background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 8,
                padding: '11px 28px', fontSize: 14, fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1,
              }}>
                {submitting ? 'Submitting...' : canPostDirectly ? 'Add to Timeline' : 'Submit for Review'}
              </button>
              <button onClick={() => { setShowForm(false); setSubmitError('') }} style={{
                background: 'none', border: '1px solid #d4b896', borderRadius: 8,
                padding: '11px 20px', fontSize: 14, color: '#888', cursor: 'pointer',
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign in prompt */}
      {!userId && entries.length > 0 && (
        <p style={{ fontSize: 13, color: '#aaa', marginTop: 24, paddingLeft: 42 }}>
          <a href="/" style={{ color: '#8b5e2a', textDecoration: 'underline' }}>Sign in</a> to submit a timeline entry.
        </p>
      )}
    </div>
  )
}
