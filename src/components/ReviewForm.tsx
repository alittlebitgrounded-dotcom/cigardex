'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Characteristic = {
  id: string
  canonical_name: string
  category: string
  vote_count: number
  status: string
}

type PairingCategory = {
  id: string
  name: string
}

type PairingSubcategory = {
  id: string
  name: string
}

type ExistingReview = {
  id: string
  rating: number | null
  notes: string | null
  draw_score: number | null
  burn_score: number | null
  construction_score: number | null
  value_score: number | null
  strength_impression: string | null
  body: string | null
  finish: string | null
  occasion: string | null
  where_smoked: string | null
  smoke_duration_minutes: number | null
  smoked_at: string | null
  revision_notes: string | null
  source_url?: string | null
}

type ReviewFormProps = {
  cigarId: string
  cigarName: string
  userId: string
  userRole?: string
  existingReview?: ExistingReview | null
  onSaved: () => void
  onCancel: () => void
}

const OCCASIONS = ['Morning smoke', 'After dinner', 'Celebratory', 'Relaxing', 'Social', 'Business', 'Special occasion', 'Everyday smoke']
const WHERE_SMOKED = ['Home', 'Lounge', 'Outdoors', 'Patio', 'Golf course', 'Bar', 'Event', 'Other']
const STRENGTH_OPTIONS = ['Mild', 'Mild-Medium', 'Medium', 'Medium-Full', 'Full']
const BODY_OPTIONS = ['One note', 'Multiple notes', 'Complex']
const FINISH_OPTIONS = ['Short', 'Clean', 'Long', 'Bitter', 'Lingering']
const DURATIONS = [
  { label: '< 30 min', value: 25 },
  { label: '30–45 min', value: 38 },
  { label: '45–60 min', value: 53 },
  { label: '1–1.5 hrs', value: 75 },
  { label: '1.5–2 hrs', value: 105 },
  { label: '2+ hrs', value: 135 },
]

function drawLabel(v: number): string {
  if (v <= 2) return 'Rock tight'
  if (v <= 4) return 'Firm'
  if (v <= 6) return 'Milkshake'
  if (v <= 8) return 'Easy'
  return 'Wide open'
}
function drawDescription(v: number): string {
  if (v <= 2) return 'Almost no air getting through'
  if (v <= 4) return 'Requires some effort'
  if (v <= 6) return 'Perfect resistance — effortless and satisfying'
  if (v <= 8) return 'Little resistance, very open'
  return 'Like smoking air — no resistance at all'
}
function drawColor(v: number): string {
  if (v <= 2) return '#b71c1c'
  if (v <= 4) return '#e65100'
  if (v <= 6) return '#2e7d32'
  if (v <= 8) return '#e65100'
  return '#b71c1c'
}
function burnLabel(v: number): string {
  if (v <= 2) return 'Canoes & tunneling'
  if (v <= 4) return 'Significant issues'
  if (v <= 6) return 'Minor touchups needed'
  if (v <= 8) return 'Nearly perfect'
  return 'Laser straight'
}
function burnDescription(v: number): string {
  if (v <= 2) return 'Major burn issues — canoed or tunneled badly'
  if (v <= 4) return 'Required several relights or corrections'
  if (v <= 6) return 'A couple of minor corrections, otherwise fine'
  if (v <= 8) return 'Very consistent with barely any correction'
  return 'Flawless even burn from light to nub'
}
function burnColor(v: number): string {
  if (v <= 3) return '#b71c1c'
  if (v <= 6) return '#e65100'
  return '#2e7d32'
}
function constructionLabel(v: number): string {
  if (v <= 2) return 'Spongy / poor fill'
  if (v <= 4) return 'Inconsistent'
  if (v <= 6) return 'Solid'
  if (v <= 8) return 'Well made'
  return 'Benchmark quality'
}
function constructionDescription(v: number): string {
  if (v <= 2) return 'Underfilled, overfilled, or soft spots throughout'
  if (v <= 4) return 'Some soft spots or inconsistency in the roll'
  if (v <= 6) return 'Firm and even — does what it needs to do'
  if (v <= 8) return 'Excellent construction, very consistent feel'
  return 'Flawless roll — firm, even, and perfectly finished'
}
function constructionColor(v: number): string {
  if (v <= 3) return '#b71c1c'
  if (v <= 6) return '#e65100'
  return '#2e7d32'
}
function valueLabel(v: number): string {
  if (v <= 2) return 'Not worth it'
  if (v <= 4) return 'Overpriced'
  if (v <= 6) return 'Fair'
  if (v <= 8) return 'Good value'
  return 'Exceptional value'
}

function DescriptiveSlider({ label, value, onChange, getLabel, getDescription, getColor, leftNote, rightNote }: {
  label: string; value: number | null; onChange: (v: number) => void
  getLabel: (v: number) => string; getDescription: (v: number) => string; getColor: (v: number) => string
  leftNote?: string; rightNote?: string
}) {
  const active = value !== null
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #e8ddd0', marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: active ? 6 : 12 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00' }}>{label}</span>
        {active ? (
          <span style={{ fontSize: 15, fontWeight: 700, color: getColor(value!) }}>{getLabel(value!)}</span>
        ) : (
          <span style={{ fontSize: 13, color: '#ccc', fontStyle: 'italic' }}>not rated</span>
        )}
      </div>
      {active && <p style={{ fontSize: 12, color: '#8b5e2a', margin: '0 0 12px', fontStyle: 'italic' }}>{getDescription(value!)}</p>}
      <input type="range" min="1" max="10" step="0.5" value={value ?? 5} onChange={e => onChange(parseFloat(e.target.value))}
        onMouseDown={() => { if (value === null) onChange(5) }} onTouchStart={() => { if (value === null) onChange(5) }}
        style={{ width: '100%', accentColor: active ? getColor(value!) : '#ddd' }} />
      {(leftNote || rightNote) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginTop: 4 }}>
          <span>{leftNote}</span><span>{rightNote}</span>
        </div>
      )}
      {!active && <p style={{ fontSize: 11, color: '#bbb', margin: '6px 0 0', textAlign: 'center' }}>Move the slider to rate</p>}
    </div>
  )
}

function ChipSelector({ label, options, value, onChange, multi = false }: {
  label: string; options: string[]; value: string | string[]
  onChange: (v: string | string[]) => void; multi?: boolean
}) {
  function isSelected(opt: string) {
    return multi ? (value as string[]).includes(opt) : value === opt
  }
  function toggle(opt: string) {
    if (multi) {
      const arr = value as string[]
      onChange(arr.includes(opt) ? arr.filter(v => v !== opt) : [...arr, opt])
    } else {
      onChange(value === opt ? '' : opt)
    }
  }
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #e8ddd0', marginBottom: 14 }}>
      <h4 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 12px' }}>{label}</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => {
          const sel = isSelected(opt)
          return (
            <button key={opt} type="button" onClick={() => toggle(opt)} style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: sel ? 600 : 400, background: sel ? '#1a0a00' : '#f5f0e8', color: sel ? '#f5e6c8' : '#5a3a1a', border: sel ? '1px solid #1a0a00' : '1px solid #d4b896', cursor: 'pointer' }}>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ReviewForm({ cigarId, cigarName, userId, userRole, existingReview, onSaved, onCancel }: ReviewFormProps) {
  const isReviewer = userRole === 'reviewer'

  const [rating, setRating] = useState<number | null>(existingReview?.rating ?? null)
  const [notes, setNotes] = useState(existingReview?.notes ?? '')
  const [sourceUrl, setSourceUrl] = useState(existingReview?.source_url ?? '')
  const [drawScore, setDrawScore] = useState<number | null>(existingReview?.draw_score ?? null)
  const [burnScore, setBurnScore] = useState<number | null>(existingReview?.burn_score ?? null)
  const [constructionScore, setConstructionScore] = useState<number | null>(existingReview?.construction_score ?? null)
  const [valueScore, setValueScore] = useState<number | null>(existingReview?.value_score ?? null)
  const [strengthImpression, setStrengthImpression] = useState(existingReview?.strength_impression ?? '')
  const [body, setBody] = useState(existingReview?.body ?? '')
  const [finish, setFinish] = useState<string[]>(existingReview?.finish ? existingReview.finish.split(',') : [])
  const [occasion, setOccasion] = useState(existingReview?.occasion ?? '')
  const [whereSmoked, setWhereSmoked] = useState(existingReview?.where_smoked ?? '')
  const [smokeDuration, setSmokeDuration] = useState<number | null>(existingReview?.smoke_duration_minutes ?? null)
  const [smokedAt, setSmokedAt] = useState(existingReview?.smoked_at ? existingReview.smoked_at.split('T')[0] : new Date().toISOString().split('T')[0])
  const [revisionNotes, setRevisionNotes] = useState('')
  const [selectedChars, setSelectedChars] = useState<string[]>([])
  const [originalSelectedChars, setOriginalSelectedChars] = useState<string[]>([])
  const [freeTextChar, setFreeTextChar] = useState('')
  const [characteristics, setCharacteristics] = useState<Characteristic[]>([])
  const [pairingCategoryId, setPairingCategoryId] = useState('')
  const [pairingSubcategoryId, setPairingSubcategoryId] = useState('')
  const [pairingSpecific, setPairingSpecific] = useState('')
  const [pairingCategories, setPairingCategories] = useState<PairingCategory[]>([])
  const [pairingSubcategories, setPairingSubcategories] = useState<PairingSubcategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [section, setSection] = useState<'scores' | 'flavor' | 'details'>('scores')

  useEffect(() => { void fetchCharacteristics(); void fetchPairingCategories() }, [])
  useEffect(() => {
    if (pairingCategoryId) void fetchPairingSubcategories(pairingCategoryId)
    else { setPairingSubcategories([]); setPairingSubcategoryId('') }
  }, [pairingCategoryId])
  useEffect(() => {
    setRating(existingReview?.rating ?? null)
    setNotes(existingReview?.notes ?? '')
    setSourceUrl(existingReview?.source_url ?? '')
    setDrawScore(existingReview?.draw_score ?? null)
    setBurnScore(existingReview?.burn_score ?? null)
    setConstructionScore(existingReview?.construction_score ?? null)
    setValueScore(existingReview?.value_score ?? null)
    setStrengthImpression(existingReview?.strength_impression ?? '')
    setBody(existingReview?.body ?? '')
    setFinish(existingReview?.finish ? existingReview.finish.split(',') : [])
    setOccasion(existingReview?.occasion ?? '')
    setWhereSmoked(existingReview?.where_smoked ?? '')
    setSmokeDuration(existingReview?.smoke_duration_minutes ?? null)
    setSmokedAt(existingReview?.smoked_at ? existingReview.smoked_at.split('T')[0] : new Date().toISOString().split('T')[0])
    setRevisionNotes('')
    setFreeTextChar('')
  }, [existingReview])

  useEffect(() => {
    if (!existingReview) { setSelectedChars([]); setOriginalSelectedChars([]); setPairingCategoryId(''); setPairingSubcategoryId(''); setPairingSpecific(''); return }
    async function loadExistingExtras() {
      const { data: characteristicRows } = await supabase.from('review_characteristics').select('characteristic_id').eq('review_id', existingReview!.id)
      const loadedCharIds = (characteristicRows ?? []).map((row: any) => row.characteristic_id as string).filter(Boolean)
      setSelectedChars(loadedCharIds); setOriginalSelectedChars(loadedCharIds)
      const { data: pairingRow } = await supabase.from('review_pairings').select('category_id, subcategory_id, free_text').eq('review_id', existingReview!.id).maybeSingle()
      setPairingCategoryId(pairingRow?.category_id ?? ''); setPairingSubcategoryId(pairingRow?.subcategory_id ?? ''); setPairingSpecific(pairingRow?.free_text ?? '')
    }
    loadExistingExtras().catch(err => setError(err instanceof Error ? err.message : 'Could not load existing review details'))
  }, [existingReview])

  async function fetchCharacteristics() {
    const { data } = await supabase.from('characteristics').select('id, canonical_name, category, vote_count, status').eq('status', 'active').order('vote_count', { ascending: false })
    if (data) setCharacteristics(data)
  }
  async function fetchPairingCategories() {
    const { data } = await supabase.from('pairing_categories').select('id, name').order('name')
    if (data) setPairingCategories(data)
  }
  async function fetchPairingSubcategories(categoryId: string) {
    const { data } = await supabase.from('pairing_subcategories').select('id, name').eq('category_id', categoryId).order('name')
    if (data) setPairingSubcategories(data)
  }
  async function upsertCigarCharacteristicVote(characteristicId: string) {
    const { data: existing } = await supabase.from('cigar_characteristics').select('id, vote_count').eq('cigar_id', cigarId).eq('characteristic_id', characteristicId).maybeSingle()
    if (existing) {
      await supabase.from('cigar_characteristics').update({ vote_count: existing.vote_count + 1 }).eq('id', existing.id)
    } else {
      await supabase.from('cigar_characteristics').insert({ cigar_id: cigarId, characteristic_id: characteristicId, user_id: userId, vote_count: 1 })
    }
  }
  async function removeCigarCharacteristicVote(characteristicId: string) {
    const { data: existing } = await supabase.from('cigar_characteristics').select('id, vote_count').eq('cigar_id', cigarId).eq('characteristic_id', characteristicId).maybeSingle()
    if (!existing) return
    if (existing.vote_count > 1) {
      await supabase.from('cigar_characteristics').update({ vote_count: existing.vote_count - 1 }).eq('id', existing.id)
    } else {
      await supabase.from('cigar_characteristics').delete().eq('id', existing.id)
    }
  }
  function toggleChar(id: string) {
    setSelectedChars(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  async function handleSubmit() {
    if (rating === null) { setError('Please set an overall rating before submitting.'); return }
    setLoading(true); setError('')
    try {
      let reviewId = existingReview?.id
      const reviewData: Record<string, any> = {
        cigar_id: cigarId, user_id: userId, rating,
        notes: notes.trim() || null,
        draw_score: drawScore, burn_score: burnScore,
        construction_score: constructionScore, value_score: valueScore,
        strength_impression: strengthImpression || null, body: body || null,
        finish: finish.length ? finish.join(',') : null,
        occasion: occasion || null, where_smoked: whereSmoked || null,
        smoke_duration_minutes: smokeDuration,
        smoked_at: smokedAt ? new Date(smokedAt).toISOString() : null,
        revision_notes: existingReview ? (revisionNotes.trim() || null) : null,
        updated_at: new Date().toISOString(),
      }
      // Only save source_url for reviewer role
      if (isReviewer) reviewData.source_url = sourceUrl.trim() || null

      if (existingReview) {
        const { error: updateErr } = await supabase.from('reviews').update(reviewData).eq('id', existingReview.id)
        if (updateErr) throw updateErr
      } else {
        const { data, error: insertErr } = await supabase.from('reviews').insert(reviewData).select('id').single()
        if (insertErr) throw insertErr
        reviewId = data.id
      }
      if (!reviewId) throw new Error('Review could not be saved.')

      const addedCharIds = selectedChars.filter(id => !originalSelectedChars.includes(id))
      const removedCharIds = originalSelectedChars.filter(id => !selectedChars.includes(id))
      if (existingReview) await supabase.from('review_characteristics').delete().eq('review_id', reviewId)
      if (selectedChars.length > 0) await supabase.from('review_characteristics').insert(selectedChars.map(cid => ({ review_id: reviewId, characteristic_id: cid })))
      for (const cid of addedCharIds) await upsertCigarCharacteristicVote(cid)
      for (const cid of removedCharIds) await removeCigarCharacteristicVote(cid)
      if (!existingReview) for (const cid of selectedChars.filter(id => !addedCharIds.includes(id))) await upsertCigarCharacteristicVote(cid)

      if (freeTextChar.trim()) {
        const { data: newChar } = await supabase.from('characteristics').insert({ raw_name: freeTextChar.trim(), canonical_name: freeTextChar.trim(), category: 'Flavor', status: 'unverified', vote_count: 1 }).select('id').single()
        if (newChar) { await supabase.from('review_characteristics').insert({ review_id: reviewId, characteristic_id: newChar.id }); await upsertCigarCharacteristicVote(newChar.id) }
      }

      if (existingReview) await supabase.from('review_pairings').delete().eq('review_id', reviewId)
      if (pairingCategoryId) await supabase.from('review_pairings').insert({ review_id: reviewId, category_id: pairingCategoryId, subcategory_id: pairingSubcategoryId || null, specific_id: null, free_text: pairingSpecific.trim() || null })

      setOriginalSelectedChars(selectedChars)
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const topChars = characteristics.slice(0, 12)
  const otherChars = characteristics.slice(12)
  const tabStyle = (active: boolean) => ({ flex: 1, padding: '11px 0', fontSize: 14, fontWeight: active ? 600 : 400, color: active ? '#1a0a00' : '#8b5e2a', background: 'none', border: 'none', borderBottom: active ? '2px solid #1a0a00' : '2px solid transparent', cursor: 'pointer' })
  const chipStyle = (selected: boolean) => ({ padding: '5px 12px', borderRadius: 20, fontSize: 13, fontWeight: selected ? 600 : 400, background: selected ? '#1a0a00' : '#f5f0e8', color: selected ? '#f5e6c8' : '#5a3a1a', border: selected ? '1px solid #1a0a00' : '1px solid #d4b896', cursor: 'pointer' })

  return (
    <div style={{ background: '#faf8f5', border: '1px solid #e8ddd0', borderRadius: 12, padding: 28, marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a0a00', margin: 0 }}>
          {existingReview ? 'Edit Your Review' : 'Write a Review'} — {cigarName}
        </h3>
        <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 20, cursor: 'pointer' }}>✕</button>
      </div>

      {/* Reviewer source URL — shown at top, above tabs */}
      {isReviewer && (
        <div style={{ background: '#f5f0e8', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid #d4b896' }}>
          <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ✍️ Full Review URL <span style={{ color: '#bbb', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — links readers to your full write-up)</span>
          </label>
          <input
            type="url"
            value={sourceUrl}
            onChange={e => setSourceUrl(e.target.value)}
            placeholder="https://yourpublication.com/review/cigar-name"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 7, border: '1px solid #d4b896', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'system-ui' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: '1px solid #e8ddd0', marginBottom: 24 }}>
        <button type="button" style={tabStyle(section === 'scores')} onClick={() => setSection('scores')}>Scores</button>
        <button type="button" style={tabStyle(section === 'flavor')} onClick={() => setSection('flavor')}>Flavor & Character</button>
        <button type="button" style={tabStyle(section === 'details')} onClick={() => setSection('details')}>Details</button>
      </div>

      {section === 'scores' && (
        <div>
          <div style={{ background: '#1a0a00', borderRadius: 12, padding: 24, marginBottom: 20, textAlign: 'center' }}>
            <p style={{ color: '#c4a96a', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Your Overall Score</p>
            {rating !== null ? (
              <div style={{ fontSize: 56, fontWeight: 700, color: '#f5e6c8', lineHeight: 1 }}>{rating.toFixed(1)}</div>
            ) : (
              <div style={{ fontSize: 32, color: '#555', lineHeight: 1 }}>—</div>
            )}
            <p style={{ color: '#888', fontSize: 12, margin: '6px 0 16px', fontStyle: 'italic' }}>
              {rating === null ? 'Move the slider to set your score' : rating >= 9 ? 'Exceptional — a benchmark cigar' : rating >= 7 ? 'Very good — would seek it out again' : rating >= 5 ? 'Decent — has its moments' : "Disappointing — wouldn't recommend"}
            </p>
            <input type="range" min="1" max="10" step="0.5" value={rating ?? 5} onChange={e => setRating(parseFloat(e.target.value))}
              onMouseDown={() => { if (rating === null) setRating(5) }} onTouchStart={() => { if (rating === null) setRating(5) }}
              style={{ width: '100%', accentColor: '#c4a96a' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginTop: 4 }}>
              <span>1 — Pass</span><span>5 — Decent</span><span>10 — Benchmark</span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 16px', fontStyle: 'italic' }}>The scores below don&apos;t affect your overall rating — they help the community understand the cigar better.</p>
          <DescriptiveSlider label="Draw" value={drawScore} onChange={setDrawScore} getLabel={drawLabel} getDescription={drawDescription} getColor={drawColor} leftNote="Rock tight" rightNote="Wide open" />
          <DescriptiveSlider label="Burn" value={burnScore} onChange={setBurnScore} getLabel={burnLabel} getDescription={burnDescription} getColor={burnColor} leftNote="Canoes & tunneling" rightNote="Laser straight" />
          <DescriptiveSlider label="Construction" value={constructionScore} onChange={setConstructionScore} getLabel={constructionLabel} getDescription={constructionDescription} getColor={constructionColor} leftNote="Spongy / poor fill" rightNote="Benchmark quality" />
          <DescriptiveSlider label="Value for Money" value={valueScore} onChange={setValueScore} getLabel={valueLabel}
            getDescription={v => v <= 4 ? 'Priced beyond what it delivers' : v <= 6 ? "About what you'd expect for the price" : 'Delivers more than the price suggests'}
            getColor={v => v <= 4 ? '#b71c1c' : v <= 6 ? '#e65100' : '#2e7d32'} leftNote="Not worth it" rightNote="Exceptional value" />
        </div>
      )}

      {section === 'flavor' && (
        <div>
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 14, border: '1px solid #e8ddd0' }}>
            <h4 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 12px' }}>Tasting Notes</h4>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Describe what you tasted — the first third, how it evolved, what hit you on the retrohale..."
              rows={4} style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1px solid #d4b896', borderRadius: 8, outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const, fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }} />
          </div>
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 14, border: '1px solid #e8ddd0' }}>
            <h4 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 4px' }}>Flavor Characteristics</h4>
            <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 14px' }}>Check everything you detected</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {topChars.map(c => (
                <button key={c.id} type="button" onClick={() => toggleChar(c.id)} style={chipStyle(selectedChars.includes(c.id))}>{c.canonical_name}</button>
              ))}
            </div>
            {otherChars.length > 0 && (
              <select onChange={e => { if (e.target.value) { toggleChar(e.target.value); e.target.value = '' } }}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #d4b896', background: '#fff', fontSize: 14, marginBottom: 10 }}>
                <option value="">+ More characteristics...</option>
                {otherChars.map(c => <option key={c.id} value={c.id}>{c.canonical_name} ({c.category})</option>)}
              </select>
            )}
            {selectedChars.filter(id => otherChars.find(c => c.id === id)).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {selectedChars.filter(id => otherChars.find(c => c.id === id)).map(id => {
                  const c = otherChars.find(ch => ch.id === id)!
                  return <button key={id} type="button" onClick={() => toggleChar(id)} style={chipStyle(true)}>{c.canonical_name} ✕</button>
                })}
              </div>
            )}
            <input type="text" placeholder="Add your own characteristic..." value={freeTextChar} onChange={e => setFreeTextChar(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #d4b896', background: '#fff', fontSize: 14, boxSizing: 'border-box' as const }} />
            <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>New characteristics are reviewed by the community and promoted once they get enough votes.</p>
          </div>
          <ChipSelector label="Strength Impression" options={STRENGTH_OPTIONS} value={strengthImpression} onChange={v => setStrengthImpression(v as string)} />
          <ChipSelector label="Body" options={BODY_OPTIONS} value={body} onChange={v => setBody(v as string)} />
          <ChipSelector label="Finish" options={FINISH_OPTIONS} value={finish} onChange={v => setFinish(v as string[])} multi={true} />
        </div>
      )}

      {section === 'details' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 14, border: '1px solid #e8ddd0' }}>
            <h4 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 12px' }}>Date Smoked</h4>
            <input type="date" value={smokedAt} onChange={e => setSmokedAt(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 14, boxSizing: 'border-box' as const }} />
          </div>
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 14, border: '1px solid #e8ddd0' }}>
            <h4 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 12px' }}>How long did it take?</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DURATIONS.map(d => (
                <button key={d.value} type="button" onClick={() => setSmokeDuration(smokeDuration === d.value ? null : d.value)} style={chipStyle(smokeDuration === d.value)}>{d.label}</button>
              ))}
            </div>
          </div>
          <ChipSelector label="Where?" options={WHERE_SMOKED} value={whereSmoked} onChange={v => setWhereSmoked(v as string)} />
          <ChipSelector label="Occasion" options={OCCASIONS} value={occasion} onChange={v => setOccasion(v as string)} />
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 14, border: '1px solid #e8ddd0' }}>
            <h4 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 12px' }}>Pairing</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select value={pairingCategoryId} onChange={e => { setPairingCategoryId(e.target.value); setPairingSubcategoryId(''); setPairingSpecific('') }}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #d4b896', background: '#fff', fontSize: 14 }}>
                <option value="">Select a category...</option>
                {pairingCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {pairingCategoryId && pairingSubcategories.length > 0 && (
                <select value={pairingSubcategoryId} onChange={e => setPairingSubcategoryId(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #d4b896', background: '#fff', fontSize: 14 }}>
                  <option value="">Select a type...</option>
                  {pairingSubcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              {pairingCategoryId && (
                <input type="text" placeholder="Specific (e.g. Yellow Spot 12yr)..." value={pairingSpecific} onChange={e => setPairingSpecific(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 14, boxSizing: 'border-box' as const }} />
              )}
            </div>
          </div>
          {existingReview && (
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 14, border: '1px solid #e8ddd0' }}>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 12px' }}>What changed?</h4>
              <textarea value={revisionNotes} onChange={e => setRevisionNotes(e.target.value)}
                placeholder="e.g. Tried a fresh box, updated my scores accordingly..." rows={3}
                style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1px solid #d4b896', borderRadius: 8, outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const, fontFamily: 'system-ui, sans-serif' }} />
            </div>
          )}
        </div>
      )}

      {error && <div style={{ background: '#fbe9e7', color: '#b71c1c', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginTop: 16 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{ padding: '11px 24px', borderRadius: 8, border: '1px solid #d4b896', background: '#fff', color: '#5a3a1a', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
        <button type="button" onClick={handleSubmit} disabled={loading} style={{ padding: '11px 28px', borderRadius: 8, border: 'none', background: '#1a0a00', color: '#f5e6c8', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Saving...' : existingReview ? 'Update Review' : 'Submit Review'}
        </button>
      </div>
    </div>
  )
}
