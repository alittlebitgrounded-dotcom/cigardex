'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Section = 'cigars' | 'brands' | 'users' | 'moderation' | 'characteristics' | 'stores' | 'reviews' | 'applications' | 'feedback' | 'timeline'
type IndustryApplication = {
  id: string; name: string; email: string; company: string; role_type: string
  phone: string | null; website: string | null; message: string | null
  status: string; admin_note: string | null; created_at: string
}

type FeedbackItem = {
  id: string; type: string; message: string; email: string | null
  status: string; admin_note: string | null; created_at: string
}

type AdminReview = {
  id: string; rating: number | null; notes: string | null
  draw_score: number | null; burn_score: number | null
  construction_score: number | null; value_score: number | null
  created_at: string; user_id: string | null; cigar_id: string | null
  _username?: string; _cigar_name?: string; _brand_name?: string
}

type BrandMergePair = {
  brand_a: { id: string; name: string; cigar_count: number }
  brand_b: { id: string; name: string; cigar_count: number }
}

type Cigar = {
  id: string; name: string; line: string | null; vitola: string | null
  strength: string | null; msrp: number | null; status: string
  is_limited: boolean; created_at: string; country_of_origin: string | null
  brand_accounts: { name: string } | null
}

type Brand = {
  id: string; name: string; country_of_origin: string | null
  suspended: boolean; tier: string; created_at: string
}

type UserRow = {
  id: string; username: string; email: string; role: string
  tier: string; suspended: boolean; created_at: string
}

type Characteristic = {
  id: string; raw_name: string; canonical_name: string | null
  category: string; status: string; vote_count: number; created_at: string
}

type Store = {
  id: string; name: string; type: string; city: string | null
  state: string | null; active: boolean
  store_accounts: { company_name: string; tier: string; suspended: boolean } | null
}

type CigarEdit = {
  id: string; status: string; changes: Record<string, unknown>; created_at: string
  cigars: { name: string } | null; users: { username: string } | null
}

const ROLES = ['registered', 'premium', 'brand', 'store', 'moderator', 'super_admin']
const TIERS = ['free', 'paid']
const CIGAR_STATUSES = ['sandbox', 'live', 'rejected', 'suspended']

export default function AdminPage() {
  const router = useRouter()
  const [section, setSection] = useState<Section>('cigars')
  const [authChecked, setAuthChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const [cigars, setCigars] = useState<Cigar[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [characteristics, setCharacteristics] = useState<Characteristic[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [edits, setEdits] = useState<CigarEdit[]>([])

  const [cigarSearch, setCigarSearch] = useState('')
  const [cigarStatusFilter, setCigarStatusFilter] = useState('all')
  const [cigarIncompleteFilter, setCigarIncompleteFilter] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [charStatusFilter, setCharStatusFilter] = useState('unverified')
  const [brandSearch, setBrandSearch] = useState('')

  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserUsername, setNewUserUsername] = useState('')
  const [newUserRole, setNewUserRole] = useState('registered')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserMsg, setNewUserMsg] = useState('')

  const [newBrandName, setNewBrandName] = useState('')
  const [newBrandCountry, setNewBrandCountry] = useState('')
  const [newBrandMsg, setNewBrandMsg] = useState('')

  const [showNewCigar, setShowNewCigar] = useState(false)
  const [newCigar, setNewCigar] = useState({ name: '', line: '', vitola: '', strength: '', wrapper_origin: '', binder_origin: '', filler_origins: '', msrp: '', upc: '', brand_id: '' })
  const [newCigarMsg, setNewCigarMsg] = useState('')

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [mergePairs, setMergePairs] = useState<BrandMergePair[]>([])
  const [mergeKeeper, setMergeKeeper] = useState<Record<string, string>>({})
  const [mergeMsg, setMergeMsg] = useState('')
  const [mergeLoading, setMergeLoading] = useState(false)

  const [applications, setApplications] = useState<IndustryApplication[]>([])
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([])
  const [feedbackNotes, setFeedbackNotes] = useState<Record<string, string>>({})

  const [timelineEntries, setTimelineEntries] = useState<any[]>([])
  const [timelineEditId, setTimelineEditId] = useState<string | null>(null)
  const [timelineEditForm, setTimelineEditForm] = useState<Record<string, string>>({})
  const [timelineMergeId, setTimelineMergeId] = useState<string | null>(null)
  const [timelineMergeTargets, setTimelineMergeTargets] = useState<any[]>([])
  const [timelineMergeTargetId, setTimelineMergeTargetId] = useState<string | null>(null)
  const [timelineMergeFields, setTimelineMergeFields] = useState<Record<string, boolean>>({})
  const [timelineSaving, setTimelineSaving] = useState(false)
  const [timelineLoading, setTimelineLoading] = useState(false)

  const [adminReviews, setAdminReviews] = useState<AdminReview[]>([])
  const [reviewDateFrom, setReviewDateFrom] = useState('')
  const [reviewDateTo, setReviewDateTo] = useState('')
  const [reviewRatingMin, setReviewRatingMin] = useState('')
  const [reviewRatingMax, setReviewRatingMax] = useState('')
  const [reviewUserFilter, setReviewUserFilter] = useState('')
  const [reviewCigarFilter, setReviewCigarFilter] = useState('')
  const [reviewsLoading, setReviewsLoading] = useState(false)

  useEffect(() => { checkAuth() }, [])
  useEffect(() => { if (isAdmin) fetchSection(section) }, [section, isAdmin])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single()
    if (!data || !['super_admin', 'moderator'].includes(data.role)) { router.push('/'); return }
    setIsAdmin(true)
    setAuthChecked(true)
  }

  async function fetchSection(s: Section) {
    setLoading(true)
    if (s === 'cigars') {
      const { data } = await supabase.from('cigars')
        .select('id, name, line, vitola, strength, msrp, status, is_limited, created_at, country_of_origin, brand_accounts(name)')
        .order('created_at', { ascending: false }).limit(200)
      if (data) setCigars(data as unknown as Cigar[])
    }
    if (s === 'brands') {
      const { data } = await supabase.from('brand_accounts').select('id, name, country_of_origin, suspended, tier, created_at').order('name')
      if (data) setBrands(data)
    }
    if (s === 'users') {
      const { data } = await supabase.from('users').select('id, username, email, role, tier, suspended, created_at').order('created_at', { ascending: false })
      if (data) setUsers(data)
    }
    if (s === 'characteristics') {
      const { data } = await supabase.from('characteristics').select('id, raw_name, canonical_name, category, status, vote_count, created_at').order('vote_count', { ascending: false }).limit(300)
      if (data) setCharacteristics(data)
    }
    if (s === 'stores') {
      const { data } = await supabase.from('stores').select('id, name, type, city, state, active, store_accounts(company_name, tier, suspended)').order('name')
      if (data) setStores(data as unknown as Store[])
    }
    if (s === 'moderation') {
      const { data: editData } = await supabase.from('cigar_edits').select('id, status, changes, created_at, submitted_by, cigars(name)').eq('status', 'pending').order('created_at')
      if (editData) {
        const userIds = editData.map((e: any) => e.submitted_by).filter(Boolean)
        let usernameMap: Record<string, string> = {}
        if (userIds.length > 0) {
          const { data: userRows } = await supabase.from('users').select('id, username').in('id', userIds)
          if (userRows) usernameMap = Object.fromEntries(userRows.map((u: any) => [u.id, u.username]))
        }
        setEdits(editData.map((e: any) => ({ ...e, users: e.submitted_by && usernameMap[e.submitted_by] ? { username: usernameMap[e.submitted_by] } : null })) as unknown as CigarEdit[])
      }
    }
    if (s === 'applications') await fetchApplications()
    if (s === 'feedback') await fetchFeedback()
    if (s === 'timeline') await fetchTimeline()
    setLoading(false)
  }

  async function updateCigarStatus(id: string, status: string) {
    await supabase.from('cigars').update({ status }).eq('id', id)
    setCigars(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    logAction('update_cigar_status', 'cigar', id, `Set to ${status}`)
  }
  async function updateUserRole(id: string, role: string) {
    await supabase.from('users').update({ role }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
    logAction('update_user_role', 'user', id, `Set role to ${role}`)
  }
  async function updateUserTier(id: string, tier: string) {
    await supabase.from('users').update({ tier }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, tier } : u))
  }
  async function toggleUserSuspended(id: string, suspended: boolean) {
    await supabase.from('users').update({ suspended: !suspended }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, suspended: !suspended } : u))
    logAction(!suspended ? 'suspend_user' : 'unsuspend_user', 'user', id, '')
  }
  async function toggleBrandSuspended(id: string, suspended: boolean) {
    await supabase.from('brand_accounts').update({ suspended: !suspended }).eq('id', id)
    setBrands(prev => prev.map(b => b.id === id ? { ...b, suspended: !suspended } : b))
    logAction(!suspended ? 'suspend_brand' : 'unsuspend_brand', 'brand_account', id, '')
  }
  async function updateBrandTier(id: string, tier: string) {
    await supabase.from('brand_accounts').update({ tier }).eq('id', id)
    setBrands(prev => prev.map(b => b.id === id ? { ...b, tier } : b))
  }
  async function updateBrandName(id: string, name: string) {
    if (!name.trim()) return
    await supabase.from('brand_accounts').update({ name: name.trim() }).eq('id', id)
    setBrands(prev => prev.map(b => b.id === id ? { ...b, name: name.trim() } : b))
    await logAction('update_brand_name', 'brand_account', id, `Renamed to "${name.trim()}"`)
  }
  async function approveChar(id: string) {
    await supabase.from('characteristics').update({ status: 'active' }).eq('id', id)
    setCharacteristics(prev => prev.map(c => c.id === id ? { ...c, status: 'active' } : c))
  }
  async function rejectChar(id: string) {
    await supabase.from('characteristics').update({ status: 'rejected' }).eq('id', id)
    setCharacteristics(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' } : c))
  }
  async function updateCanonicalName(id: string, name: string) {
    await supabase.from('characteristics').update({ canonical_name: name }).eq('id', id)
    setCharacteristics(prev => prev.map(c => c.id === id ? { ...c, canonical_name: name } : c))
  }
  async function approveEdit(edit: CigarEdit) {
    await supabase.from('cigars').update(edit.changes).eq('id', (edit as unknown as { cigar_id: string }).cigar_id)
    await supabase.from('cigar_edits').update({ status: 'approved' }).eq('id', edit.id)
    setEdits(prev => prev.filter(e => e.id !== edit.id))
  }
  async function rejectEdit(id: string) {
    await supabase.from('cigar_edits').update({ status: 'rejected' }).eq('id', id)
    setEdits(prev => prev.filter(e => e.id !== id))
  }
  async function approveField(edit: CigarEdit, fieldKey: string) {
    const fieldUpdate = { [fieldKey]: edit.changes[fieldKey] }
    await supabase.from('cigars').update(fieldUpdate).eq('id', (edit as unknown as { cigar_id: string }).cigar_id)
    const remainingChanges = { ...edit.changes }
    delete remainingChanges[fieldKey]
    if (Object.keys(remainingChanges).length === 0) {
      await supabase.from('cigar_edits').update({ status: 'approved' }).eq('id', edit.id)
      setEdits(prev => prev.filter(e => e.id !== edit.id))
    } else {
      await supabase.from('cigar_edits').update({ changes: remainingChanges }).eq('id', edit.id)
      setEdits(prev => prev.map(e => e.id === edit.id ? { ...e, changes: remainingChanges } : e))
    }
    await logAction('approve_field', 'cigar', (edit as unknown as { cigar_id: string }).cigar_id, `Approved field: ${fieldKey}`)
  }
  async function rejectField(edit: CigarEdit, fieldKey: string) {
    const remainingChanges = { ...edit.changes }
    delete remainingChanges[fieldKey]
    if (Object.keys(remainingChanges).length === 0) {
      await supabase.from('cigar_edits').update({ status: 'rejected' }).eq('id', edit.id)
      setEdits(prev => prev.filter(e => e.id !== edit.id))
    } else {
      await supabase.from('cigar_edits').update({ changes: remainingChanges }).eq('id', edit.id)
      setEdits(prev => prev.map(e => e.id === edit.id ? { ...e, changes: remainingChanges } : e))
    }
  }
  async function fetchApplications() {
    const { data } = await supabase.from('industry_applications').select('*').order('created_at', { ascending: false })
    if (data) setApplications(data)
  }
  async function approveApplication(app: IndustryApplication) {
    const { data: userRow } = await supabase.from('users').select('id').eq('email', app.email).maybeSingle()
    if (userRow) {
      const newRole = app.role_type === 'retailer' ? 'store' : app.role_type === 'brand' ? 'brand' : 'premium'
      await supabase.from('users').update({ role: newRole }).eq('id', userRow.id)
    }
    await supabase.from('industry_applications').update({ status: 'approved' }).eq('id', app.id)
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved' } : a))
  }
  async function rejectApplication(id: string) {
    await supabase.from('industry_applications').update({ status: 'rejected' }).eq('id', id)
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a))
  }
  async function fetchFeedback() {
    const { data } = await supabase.from('feedback').select('*').order('created_at', { ascending: false })
    if (data) setFeedbackItems(data)
  }
  async function fetchTimeline() {
    setTimelineLoading(true)
    const { data } = await supabase
      .from('cigar_timeline')
      .select('id, cigar_id, event_type, event_date, date_precision, title, body, source, status, created_at, submitted_by, cigars(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    if (data) {
      const userIds = data.map((e: any) => e.submitted_by).filter(Boolean)
      let usernameMap: Record<string, string> = {}
      if (userIds.length > 0) {
        const { data: userRows } = await supabase.from('users').select('id, username').in('id', userIds)
        if (userRows) usernameMap = Object.fromEntries(userRows.map((u: any) => [u.id, u.username]))
      }
      setTimelineEntries(data.map((e: any) => ({ ...e, _username: e.submitted_by ? usernameMap[e.submitted_by] || 'Unknown' : 'Anonymous' })))
    }
    setTimelineLoading(false)
  }
  async function approveTimelineEntry(id: string) {
    await supabase.from('cigar_timeline').update({ status: 'live' }).eq('id', id)
    await logAction('approve_timeline', 'cigar_timeline', id, 'Approved')
    setTimelineEntries(prev => prev.filter(e => e.id !== id))
  }
  async function rejectTimelineEntry(id: string) {
    await supabase.from('cigar_timeline').update({ status: 'rejected' }).eq('id', id)
    await logAction('reject_timeline', 'cigar_timeline', id, 'Rejected')
    setTimelineEntries(prev => prev.filter(e => e.id !== id))
  }
  function buildTimelinePayload() {
    const year = (timelineEditForm.year || '').trim()
    const month = (timelineEditForm.month || '').trim()
    const day = (timelineEditForm.day || '').trim()
    if (!year) throw new Error('Year is required')
    let event_date = `${year}-01-01`
    let date_precision: 'year' | 'month' | 'day' = 'year'
    if (month) { event_date = `${year}-${month}-01`; date_precision = 'month' }
    if (month && day) { event_date = `${year}-${month}-${day.padStart(2, '0')}`; date_precision = 'day' }
    return {
      event_type: timelineEditForm.event_type || 'note',
      event_date, date_precision,
      title: (timelineEditForm.title || '').trim(),
      body: (timelineEditForm.body || '').trim() || null,
      source: (timelineEditForm.source || '').trim() || null,
    }
  }
  async function saveTimelineEdit(id: string) {
    try {
      setTimelineSaving(true)
      const payload = buildTimelinePayload()
      if (!payload.title) { setMsg('Title is required'); return }
      const { error } = await supabase.from('cigar_timeline').update(payload).eq('id', id)
      if (error) { setMsg(`Timeline save failed: ${error.message}`); return }
      setTimelineEntries(prev => prev.map(entry => (entry.id === id ? { ...entry, ...payload } : entry)))
      setTimelineEditId(null); setTimelineEditForm({})
      setMsg('Timeline entry updated')
      await logAction('edit_timeline', 'cigar_timeline', id, 'Edited pending timeline entry')
    } catch (err: any) {
      setMsg(err?.message || 'Could not save timeline entry')
    } finally { setTimelineSaving(false) }
  }
  async function saveAndApproveTimelineEdit(id: string) {
    try {
      setTimelineSaving(true)
      const payload = buildTimelinePayload()
      if (!payload.title) { setMsg('Title is required'); return }
      const { error } = await supabase.from('cigar_timeline').update({ ...payload, status: 'live' }).eq('id', id)
      if (error) { setMsg(`Timeline save/approve failed: ${error.message}`); return }
      setTimelineEntries(prev => prev.filter(entry => entry.id !== id))
      setTimelineEditId(null); setTimelineEditForm({})
      setMsg('Timeline entry saved and approved')
      await logAction('approve_timeline', 'cigar_timeline', id, 'Edited and approved timeline entry')
    } catch (err: any) {
      setMsg(err?.message || 'Could not save and approve timeline entry')
    } finally { setTimelineSaving(false) }
  }
  async function startTimelineMerge(entry: any) {
    setTimelineMergeId(entry.id); setTimelineMergeTargetId(null)
    setTimelineMergeFields({}); setTimelineSaving(false)
    const { data, error } = await supabase.from('cigar_timeline')
      .select('id, cigar_id, event_type, event_date, date_precision, title, body, source, status, created_at')
      .eq('cigar_id', entry.cigar_id).eq('status', 'live').neq('id', entry.id)
      .order('event_date', { ascending: true })
    if (error) { setTimelineMergeTargets([]); setMsg(`Could not load merge targets: ${error.message}`); return }
    setTimelineMergeTargets(data || [])
  }
  async function executeMergeTimeline() {
    if (!timelineMergeId || !timelineMergeTargetId) { setMsg('Pick a target entry first'); return }
    const sourceEntry = timelineEntries.find(e => e.id === timelineMergeId)
    const targetEntry = timelineMergeTargets.find(t => t.id === timelineMergeTargetId)
    if (!sourceEntry || !targetEntry) { setMsg('Merge source or target could not be found'); return }
    const selectedFields = Object.entries(timelineMergeFields).filter(([, checked]) => checked).map(([key]) => key)
    if (selectedFields.length === 0) { setMsg('Choose at least one field to copy'); return }
    try {
      setTimelineSaving(true)
      const updatePayload: Record<string, any> = {}
      for (const field of selectedFields) {
        if (field === 'event_date') { updatePayload.event_date = sourceEntry.event_date; updatePayload.date_precision = sourceEntry.date_precision }
        else { updatePayload[field] = sourceEntry[field] }
      }
      const { error: updateError } = await supabase.from('cigar_timeline').update(updatePayload).eq('id', timelineMergeTargetId)
      if (updateError) { setMsg(`Merge update failed: ${updateError.message}`); return }
      const { error: deleteError } = await supabase.from('cigar_timeline').delete().eq('id', timelineMergeId)
      if (deleteError) { setMsg(`Merged but could not remove pending: ${deleteError.message}`); return }
      setTimelineEntries(prev => prev.filter(e => e.id !== timelineMergeId))
      setTimelineMergeId(null); setTimelineMergeTargets([]); setTimelineMergeTargetId(null); setTimelineMergeFields({})
      setMsg('Timeline entry merged')
      await logAction('merge_timeline', 'cigar_timeline', timelineMergeId, `Merged into ${timelineMergeTargetId}; fields: ${selectedFields.join(', ')}`)
    } catch (err: any) {
      setMsg(err?.message || 'Could not merge timeline entry')
    } finally { setTimelineSaving(false) }
  }
  async function deleteFeedback(id: string) {
    await supabase.from('feedback').delete().eq('id', id)
    setFeedbackItems(prev => prev.filter(f => f.id !== id))
  }
  async function saveFeedbackNote(id: string) {
    const note = feedbackNotes[id] || ''
    await supabase.from('feedback').update({ admin_note: note, status: 'actioned' }).eq('id', id)
    setFeedbackItems(prev => prev.map(f => f.id === id ? { ...f, admin_note: note, status: 'actioned' } : f))
  }
  async function markFeedbackRead(id: string) {
    await supabase.from('feedback').update({ status: 'read' }).eq('id', id)
    setFeedbackItems(prev => prev.map(f => f.id === id ? { ...f, status: 'read' } : f))
  }
  async function fetchReviews() {
    setReviewsLoading(true)
    let query = supabase.from('reviews').select('id, rating, notes, draw_score, burn_score, construction_score, value_score, created_at, user_id, cigar_id').order('created_at', { ascending: false }).limit(500)
    if (reviewDateFrom) query = query.gte('created_at', reviewDateFrom)
    if (reviewDateTo) query = query.lte('created_at', reviewDateTo + 'T23:59:59')
    if (reviewRatingMin) query = query.gte('rating', parseFloat(reviewRatingMin))
    if (reviewRatingMax) query = query.lte('rating', parseFloat(reviewRatingMax))
    const { data } = await query
    if (data) {
      const userIds = [...new Set(data.map(r => r.user_id).filter(Boolean))] as string[]
      const cigarIds = [...new Set(data.map(r => r.cigar_id).filter(Boolean))] as string[]
      let usernameMap: Record<string, string> = {}
      let cigarMap: Record<string, { name: string; brand: string }> = {}
      if (userIds.length > 0) {
        const { data: userRows } = await supabase.from('users').select('id, username').in('id', userIds)
        if (userRows) usernameMap = Object.fromEntries(userRows.map((u: any) => [u.id, u.username]))
      }
      if (cigarIds.length > 0) {
        const { data: cigarRows } = await supabase.from('cigars').select('id, name, brand_accounts(name)').in('id', cigarIds)
        if (cigarRows) cigarRows.forEach((c: any) => { cigarMap[c.id] = { name: c.name, brand: c.brand_accounts?.name || '' } })
      }
      let reviews = data.map(r => ({ ...r, _username: r.user_id ? usernameMap[r.user_id] || 'Unknown' : 'Unknown', _cigar_name: r.cigar_id ? cigarMap[r.cigar_id]?.name || 'Unknown' : 'Unknown', _brand_name: r.cigar_id ? cigarMap[r.cigar_id]?.brand || '' : '' })) as AdminReview[]
      if (reviewUserFilter) reviews = reviews.filter(r => r._username?.toLowerCase().includes(reviewUserFilter.toLowerCase()))
      if (reviewCigarFilter) reviews = reviews.filter(r => r._cigar_name?.toLowerCase().includes(reviewCigarFilter.toLowerCase()) || r._brand_name?.toLowerCase().includes(reviewCigarFilter.toLowerCase()))
      setAdminReviews(reviews)
    }
    setReviewsLoading(false)
  }
  function exportReviewsCSV() {
    const headers = ['Date', 'User', 'Cigar', 'Brand', 'Rating', 'Draw', 'Burn', 'Construction', 'Value', 'Notes']
    const rows = adminReviews.map(r => [new Date(r.created_at).toLocaleDateString(), r._username || '', r._cigar_name || '', r._brand_name || '', r.rating ?? '', r.draw_score ?? '', r.burn_score ?? '', r.construction_score ?? '', r.value_score ?? '', (r.notes || '').replace(/,/g, ';')])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'reviews.csv'; a.click()
    URL.revokeObjectURL(url)
  }
  async function deleteReview(id: string) {
    await supabase.from('reviews').delete().eq('id', id)
    setAdminReviews(prev => prev.filter(r => r.id !== id))
  }
  async function toggleStoreActive(id: string, active: boolean) {
    await supabase.from('stores').update({ active: !active }).eq('id', id)
    setStores(prev => prev.map(s => s.id === id ? { ...s, active: !active } : s))
  }
  async function logAction(action: string, targetType: string, targetId: string, notes: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('moderation_log').insert({ moderator_id: session.user.id, action, target_type: targetType, target_id: targetId, notes })
  }
  async function findDuplicateBrands() {
    setMergeLoading(true); setMergeMsg('')
    const KNOWN_PAIRS = [['warpped', 'Warped'], ['aganorsa', 'Aganorsa Leaf'], ['Placencia', 'Plasencia'], ['villager', 'Villiger'], ['Newman', 'Jc Newman']]
    const results: BrandMergePair[] = []
    for (const [nameA, nameB] of KNOWN_PAIRS) {
      const { data: ba } = await supabase.from('brand_accounts').select('id, name').ilike('name', nameA).maybeSingle()
      const { data: bb } = await supabase.from('brand_accounts').select('id, name').ilike('name', nameB).maybeSingle()
      if (!ba || !bb) continue
      const [{ count: ca }, { count: cb }] = await Promise.all([supabase.from('cigars').select('*', { count: 'exact', head: true }).eq('brand_account_id', ba.id), supabase.from('cigars').select('*', { count: 'exact', head: true }).eq('brand_account_id', bb.id)])
      results.push({ brand_a: { id: ba.id, name: ba.name, cigar_count: ca || 0 }, brand_b: { id: bb.id, name: bb.name, cigar_count: cb || 0 } })
    }
    setMergePairs(results); setMergeLoading(false)
  }
  async function executeMerge(keeperId: string, deleteId: string, keeperName: string, deleteName: string) {
    setMergeMsg('')
    const { error: e1 } = await supabase.from('cigars').update({ brand_account_id: keeperId }).eq('brand_account_id', deleteId)
    if (e1) { setMergeMsg(`Error: ${e1.message}`); return }
    const { error: e2 } = await supabase.from('brand_accounts').delete().eq('id', deleteId)
    if (e2) { setMergeMsg(`Error: ${e2.message}`); return }
    await logAction('merge_brands', 'brand_account', deleteId, `Merged "${deleteName}" into "${keeperName}"`)
    setMergeMsg(`✅ Merged "${deleteName}" into "${keeperName}"`)
    setMergePairs(prev => prev.filter(p => p.brand_a.id !== deleteId && p.brand_b.id !== deleteId))
    setMergeKeeper({}); fetchSection('brands')
  }
  async function createUser() {
    setNewUserMsg('')
    if (!newUserEmail || !newUserUsername || !newUserPassword) { setNewUserMsg('All fields required'); return }
    const { data, error } = await supabase.auth.admin.createUser({ email: newUserEmail, password: newUserPassword, email_confirm: true })
    if (error) { setNewUserMsg(error.message); return }
    if (data.user) {
      await supabase.from('users').insert({ id: data.user.id, username: newUserUsername, email: newUserEmail, role: newUserRole, tier: 'free' })
      setNewUserMsg(`User ${newUserUsername} created successfully!`)
      setNewUserEmail(''); setNewUserUsername(''); setNewUserPassword('')
      fetchSection('users')
    }
  }
  async function createBrand() {
    setNewBrandMsg('')
    if (!newBrandName) { setNewBrandMsg('Brand name required'); return }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error } = await supabase.from('brand_accounts').insert({ user_id: session.user.id, name: newBrandName, country_of_origin: newBrandCountry || null, tier: 'free', suspended: false })
    if (error) { setNewBrandMsg(error.message); return }
    setNewBrandMsg(`Brand "${newBrandName}" created!`)
    setNewBrandName(''); setNewBrandCountry('')
    fetchSection('brands')
  }
  async function createCigar() {
    setNewCigarMsg('')
    if (!newCigar.name || !newCigar.brand_id) { setNewCigarMsg('Name and brand required'); return }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error } = await supabase.from('cigars').insert({ name: newCigar.name, line: newCigar.line || null, vitola: newCigar.vitola || null, strength: newCigar.strength || null, wrapper_origin: newCigar.wrapper_origin || null, binder_origin: newCigar.binder_origin || null, filler_origins: newCigar.filler_origins || null, msrp: newCigar.msrp ? parseFloat(newCigar.msrp) : null, upc: newCigar.upc || null, brand_account_id: newCigar.brand_id, submitted_by: session.user.id, status: 'live' })
    if (error) { setNewCigarMsg(error.message); return }
    setNewCigarMsg(`Cigar "${newCigar.name}" created!`)
    setNewCigar({ name: '', line: '', vitola: '', strength: '', wrapper_origin: '', binder_origin: '', filler_origins: '', msrp: '', upc: '', brand_id: '' })
    setShowNewCigar(false); fetchSection('cigars')
  }

  if (!authChecked) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#8b5e2a' }}>Checking access...</p>
    </div>
  )

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #d4b896', background: '#fff', fontSize: 14, boxSizing: 'border-box' as const }
  const btnPrimary = { padding: '8px 18px', background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
  const btnDanger = { padding: '6px 14px', background: '#fbe9e7', color: '#b71c1c', border: '1px solid #f5c6c6', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }
  const btnSuccess = { padding: '6px 14px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }
  const btnWarning = { padding: '6px 14px', background: '#fff3e0', color: '#e65100', border: '1px solid #ffe0b2', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }

  const sectionNav = [
    { key: 'cigars', label: '🍂 Cigars' }, { key: 'brands', label: '🏭 Brands' },
    { key: 'users', label: '👤 Users' }, { key: 'moderation', label: '📋 Moderation' },
    { key: 'characteristics', label: '🏷 Characteristics' }, { key: 'stores', label: '🏪 Stores' },
    { key: 'reviews', label: '📝 Reviews' }, { key: 'applications', label: '🏭 Applications' },
    { key: 'feedback', label: '💬 Feedback' }, { key: 'timeline', label: '📜 Timeline' },
  ] as const

  const filteredCigars = cigars.filter(c => {
    const matchSearch = !cigarSearch || c.name.toLowerCase().includes(cigarSearch.toLowerCase()) || c.brand_accounts?.name.toLowerCase().includes(cigarSearch.toLowerCase())
    const matchStatus = cigarStatusFilter === 'all' || c.status === cigarStatusFilter
    const matchIncomplete = cigarIncompleteFilter.length === 0 || cigarIncompleteFilter.some(field => {
      if (field === 'country') return !c.country_of_origin
      if (field === 'strength') return !c.strength
      if (field === 'vitola') return !c.vitola
      if (field === 'msrp') return !c.msrp
      return false
    })
    return matchSearch && matchStatus && matchIncomplete
  })

  const filteredUsers = users.filter(u => !userSearch || u.username?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))
  const filteredChars = characteristics.filter(c => charStatusFilter === 'all' || c.status === charStatusFilter)
  const filteredBrands = brands.filter(b => !brandSearch || b.name.toLowerCase().includes(brandSearch.toLowerCase()))

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ background: '#1a0a00', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ color: '#f5e6c8', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>🍂 CigarLog</a>
          <span style={{ color: '#c4a96a', fontSize: 13, background: '#2c1206', padding: '3px 10px', borderRadius: 4, fontWeight: 600 }}>ADMIN</span>
        </div>
        <a href="/" style={{ color: '#c4a96a', fontSize: 14, textDecoration: 'none' }}>← Back to site</a>
      </header>

      <div style={{ display: 'flex', maxWidth: 1400, margin: '0 auto', padding: 24, gap: 24 }}>
        <aside style={{ width: 200, flexShrink: 0 }}>
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', overflow: 'hidden', position: 'sticky', top: 88 }}>
            {sectionNav.map(({ key, label }) => (
              <button key={key} onClick={() => setSection(key)} style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: section === key ? '#f5f0e8' : 'none', border: 'none', borderLeft: section === key ? '3px solid #1a0a00' : '3px solid transparent', fontSize: 14, fontWeight: section === key ? 600 : 400, color: section === key ? '#1a0a00' : '#5a3a1a', cursor: 'pointer' }}>{label}</button>
            ))}
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0 }}>

          {/* ===== CIGARS ===== */}
          {section === 'cigars' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: 0 }}>Cigar Management</h1>
                <button onClick={() => setShowNewCigar(!showNewCigar)} style={btnPrimary}>+ Add Cigar</button>
              </div>
              {showNewCigar && (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a0a00', margin: '0 0 16px' }}>New Cigar</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Brand *</label>
                      <select value={newCigar.brand_id} onChange={e => setNewCigar(p => ({ ...p, brand_id: e.target.value }))} style={inputStyle}>
                        <option value="">Select brand...</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    {[['name', 'Cigar Name *'], ['line', 'Line'], ['vitola', 'Vitola'], ['wrapper_origin', 'Wrapper Origin'], ['binder_origin', 'Binder Origin'], ['filler_origins', 'Filler Origins'], ['msrp', 'MSRP ($)'], ['upc', 'UPC']].map(([field, label]) => (
                      <div key={field}>
                        <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>{label}</label>
                        <input value={newCigar[field as keyof typeof newCigar]} onChange={e => setNewCigar(p => ({ ...p, [field]: e.target.value }))} style={inputStyle} />
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Strength</label>
                      <select value={newCigar.strength} onChange={e => setNewCigar(p => ({ ...p, strength: e.target.value }))} style={inputStyle}>
                        <option value="">Select...</option>
                        {['mild', 'mild_medium', 'medium', 'medium_full', 'full'].map(s => <option key={s} value={s}>{s.replace('_', '-')}</option>)}
                      </select>
                    </div>
                  </div>
                  {newCigarMsg && <p style={{ color: newCigarMsg.includes('created') ? '#2e7d32' : '#b71c1c', fontSize: 13, marginTop: 12 }}>{newCigarMsg}</p>}
                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button onClick={createCigar} style={btnPrimary}>Create Cigar</button>
                    <button onClick={() => setShowNewCigar(false)} style={btnWarning}>Cancel</button>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <input placeholder="Search cigars..." value={cigarSearch} onChange={e => setCigarSearch(e.target.value)} style={{ ...inputStyle, maxWidth: 280 }} />
                <select value={cigarStatusFilter} onChange={e => setCigarStatusFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 160 }}>
                  <option value="all">All statuses</option>
                  {CIGAR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#8b5e2a', fontWeight: 600, marginRight: 4, whiteSpace: 'nowrap' }}>Show missing:</span>
                {[{ key: 'country', label: '🌍 Country' }, { key: 'strength', label: '💪 Strength' }, { key: 'vitola', label: '📐 Vitola' }, { key: 'msrp', label: '💰 MSRP' }].map(({ key, label }) => {
                  const active = cigarIncompleteFilter.includes(key)
                  return (
                    <button key={key} onClick={() => setCigarIncompleteFilter(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}
                      style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: active ? '2px solid #b71c1c' : '1px solid #d4b896', background: active ? '#fbe9e7' : '#fff', color: active ? '#b71c1c' : '#5a3a1a', fontWeight: active ? 600 : 400 }}>
                      {label}
                    </button>
                  )
                })}
                {cigarIncompleteFilter.length > 0 && (
                  <>
                    <button onClick={() => setCigarIncompleteFilter([])} style={{ fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>clear</button>
                    <span style={{ fontSize: 12, color: '#b71c1c' }}>— {filteredCigars.length} cigars with missing data</span>
                  </>
                )}
              </div>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f0e8', borderBottom: '1px solid #e8ddd0' }}>
                      {['Brand', 'Name', 'Vitola', 'MSRP', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#5a3a1a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCigars.map((c, i) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f0e8dc', background: i % 2 === 0 ? '#fff' : '#faf8f5' }}>
<td style={{ padding: '10px 14px', fontSize: 13, color: '#c4a96a', fontWeight: 500 }}>
  <select
    value={c.brand_accounts?.name || ''}
    onChange={async e => {
      const newBrand = brands.find(b => b.name === e.target.value)
      if (!newBrand) return
      await supabase.from('cigars').update({ brand_account_id: newBrand.id }).eq('id', c.id)
      await logAction('move_cigar', 'cigar', c.id, `Moved to brand "${newBrand.name}"`)
      fetchSection('cigars')
    }}
    style={{ background: 'none', border: 'none', color: '#c4a96a', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0, outline: 'none' }}
  >
    {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
  </select>
</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: '#1a0a00' }}>
                          <a href={`/cigar/${c.id}`} style={{ color: '#1a0a00', textDecoration: 'none' }}>{c.name}</a>
                          {c.is_limited && <span style={{ marginLeft: 6, fontSize: 10, background: '#fff3e0', color: '#e65100', padding: '1px 6px', borderRadius: 3 }}>LIMITED</span>}
                          {!c.country_of_origin && <span style={{ marginLeft: 6, fontSize: 10, background: '#fbe9e7', color: '#b71c1c', padding: '1px 6px', borderRadius: 3 }}>no country</span>}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: c.vitola ? '#5a3a1a' : '#e0a0a0' }}>{c.vitola || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: c.msrp ? '#1a0a00' : '#e0a0a0' }}>{c.msrp ? `$${c.msrp}` : '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <select value={c.status} onChange={e => updateCigarStatus(c.id, e.target.value)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d4b896', fontSize: 12, background: c.status === 'live' ? '#e8f5e9' : c.status === 'sandbox' ? '#fff3e0' : '#fbe9e7' }}>
                            {CIGAR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <a href={`/cigar/${c.id}`} style={{ color: '#c4a96a', fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>View →</a>
                            <a href={`/admin/cigar/${c.id}`} style={{ color: '#8b5e2a', fontSize: 12, textDecoration: 'none', fontWeight: 500, background: '#f5f0e8', border: '1px solid #d4b896', borderRadius: 5, padding: '3px 10px' }}>Edit</a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredCigars.length === 0 && <p style={{ textAlign: 'center', padding: '40px 0', color: '#aaa', fontSize: 14 }}>No cigars found</p>}
              </div>
              <p style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>{filteredCigars.length} cigars shown</p>
            </div>
          )}

          {/* ===== BRANDS ===== */}
          {section === 'brands' && (
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>Brand Management</h1>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 14px' }}>Add New Brand</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Brand Name *</label>
                    <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} style={inputStyle} placeholder="e.g. Padron" />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Country of Origin</label>
                    <input value={newBrandCountry} onChange={e => setNewBrandCountry(e.target.value)} style={inputStyle} placeholder="e.g. Nicaragua" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button onClick={createBrand} style={btnPrimary}>Add Brand</button>
                  </div>
                </div>
                {newBrandMsg && <p style={{ color: newBrandMsg.includes('created') ? '#2e7d32' : '#b71c1c', fontSize: 13, marginTop: 10 }}>{newBrandMsg}</p>}
              </div>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 2px' }}>🔀 Brand Merge Tool</h3>
                    <p style={{ fontSize: 12, color: '#8b5e2a', margin: 0 }}>Consolidate duplicate or misspelled brand names</p>
                  </div>
                  <button onClick={findDuplicateBrands} disabled={mergeLoading} style={btnWarning}>{mergeLoading ? 'Scanning...' : 'Find Duplicates'}</button>
                </div>
                {mergeMsg && <p style={{ color: mergeMsg.startsWith('✅') ? '#2e7d32' : '#b71c1c', fontSize: 13, margin: '0 0 12px', background: mergeMsg.startsWith('✅') ? '#e8f5e9' : '#fbe9e7', padding: '8px 12px', borderRadius: 6 }}>{mergeMsg}</p>}
                {mergePairs.length === 0 && !mergeLoading && <p style={{ fontSize: 13, color: '#aaa', margin: '4px 0 0' }}>Click &ldquo;Find Duplicates&rdquo; to scan for similar brand names.</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: mergePairs.length > 0 ? 12 : 0 }}>
                  {mergePairs.map((pair, i) => {
                    const key = `${pair.brand_a.id}-${pair.brand_b.id}`
                    const selected = mergeKeeper[key]
                    const keeper = selected === pair.brand_a.id ? pair.brand_a : selected === pair.brand_b.id ? pair.brand_b : null
                    const deleting = selected === pair.brand_a.id ? pair.brand_b : selected === pair.brand_b.id ? pair.brand_a : null
                    return (
                      <div key={i} style={{ background: '#faf8f5', borderRadius: 8, padding: 16, border: '1px solid #e8ddd0' }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#8b5e2a', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Possible duplicate</p>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          {[pair.brand_a, pair.brand_b].map(brand => (
                            <button key={brand.id} onClick={() => setMergeKeeper(prev => ({ ...prev, [key]: brand.id }))} style={{ flex: 1, minWidth: 150, padding: '12px 16px', borderRadius: 8, textAlign: 'left', cursor: 'pointer', border: selected === brand.id ? '2px solid #2e7d32' : '1px solid #d4b896', background: selected === brand.id ? '#e8f5e9' : '#fff' }}>
                              <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: '#1a0a00' }}>{brand.name}</p>
                              <p style={{ margin: 0, fontSize: 12, color: '#8b5e2a' }}>{brand.cigar_count} cigar{brand.cigar_count !== 1 ? 's' : ''}</p>
                              {selected === brand.id && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#2e7d32', fontWeight: 700 }}>✓ KEEP THIS ONE</p>}
                            </button>
                          ))}
                          <div>
                            {keeper && deleting
                              ? <button onClick={() => executeMerge(keeper.id, deleting.id, keeper.name, deleting.name)} style={{ ...btnSuccess, padding: '10px 18px' }}>Merge → Keep &ldquo;{keeper.name}&rdquo;</button>
                              : <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>← Pick which to keep</p>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <input placeholder="Search brands..." value={brandSearch} onChange={e => setBrandSearch(e.target.value)} style={{ ...inputStyle, maxWidth: 280, marginBottom: 16 }} />
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f0e8', borderBottom: '1px solid #e8ddd0' }}>
                      {['Brand', 'Country', 'Tier', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#5a3a1a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBrands.map((b, i) => (
                      <tr key={b.id} style={{ borderBottom: '1px solid #f0e8dc', background: i % 2 === 0 ? '#fff' : '#faf8f5' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <input
                            defaultValue={b.name}
                            onBlur={e => updateBrandName(b.id, e.target.value)}
                            style={{ fontSize: 14, fontWeight: 600, color: '#1a0a00', border: 'none', borderBottom: '1px dashed #d4b896', background: 'transparent', outline: 'none', width: '100%', padding: '2px 4px' }}
                          />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: '#5a3a1a' }}>{b.country_of_origin || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <select value={b.tier} onChange={e => updateBrandTier(b.id, e.target.value)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d4b896', fontSize: 12 }}>
                            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, background: b.suspended ? '#fbe9e7' : '#e8f5e9', color: b.suspended ? '#b71c1c' : '#2e7d32', fontWeight: 600 }}>{b.suspended ? 'Suspended' : 'Active'}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <button onClick={() => toggleBrandSuspended(b.id, b.suspended)} style={b.suspended ? btnSuccess : btnDanger}>{b.suspended ? 'Reinstate' : 'Suspend'}</button>
                        </td>
  
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== USERS ===== */}
          {section === 'users' && (
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>User Management</h1>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 14px' }}>Create User</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                  {[{ label: 'Email *', value: newUserEmail, onChange: setNewUserEmail, type: 'email', placeholder: 'user@example.com' }, { label: 'Username *', value: newUserUsername, onChange: setNewUserUsername, type: 'text', placeholder: 'username' }, { label: 'Password *', value: newUserPassword, onChange: setNewUserPassword, type: 'password', placeholder: '••••••••' }].map(({ label, value, onChange, type, placeholder }) => (
                    <div key={label}>
                      <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>{label}</label>
                      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Role</label>
                    <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} style={inputStyle}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                {newUserMsg && <p style={{ color: newUserMsg.includes('created') ? '#2e7d32' : '#b71c1c', fontSize: 13, marginTop: 10 }}>{newUserMsg}</p>}
                <button onClick={createUser} style={{ ...btnPrimary, marginTop: 14 }}>Create User</button>
              </div>
              <input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ ...inputStyle, maxWidth: 280, marginBottom: 16 }} />
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f0e8', borderBottom: '1px solid #e8ddd0' }}>
                      {['Username', 'Email', 'Role', 'Tier', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#5a3a1a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f0e8dc', background: i % 2 === 0 ? '#fff' : '#faf8f5' }}>
                        <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600, color: '#1a0a00' }}>{u.username}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: '#5a3a1a' }}>{u.email}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <select value={u.role} onChange={e => updateUserRole(u.id, e.target.value)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d4b896', fontSize: 12 }}>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <select value={u.tier} onChange={e => updateUserTier(u.id, e.target.value)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d4b896', fontSize: 12 }}>
                            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, background: u.suspended ? '#fbe9e7' : '#e8f5e9', color: u.suspended ? '#b71c1c' : '#2e7d32', fontWeight: 600 }}>{u.suspended ? 'Suspended' : 'Active'}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <button onClick={() => toggleUserSuspended(u.id, u.suspended)} style={u.suspended ? btnSuccess : btnDanger}>{u.suspended ? 'Reinstate' : 'Suspend'}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== MODERATION ===== */}
          {section === 'moderation' && (
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>Moderation Queue</h1>
              {edits.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                  <p style={{ fontSize: 18, marginBottom: 8 }}>Queue is clear</p>
                  <p style={{ fontSize: 14 }}>No pending edits to review</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {edits.map(edit => (
                    <div key={edit.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 600, color: '#1a0a00', margin: '0 0 4px' }}>{edit.cigars?.name || 'Unknown cigar'}</p>
                          <p style={{ fontSize: 12, color: '#8b5e2a', margin: 0 }}>Submitted by {edit.users?.username} · {new Date(edit.created_at).toLocaleDateString()}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => approveEdit(edit)} style={btnSuccess}>Approve All</button>
                          <button onClick={() => rejectEdit(edit.id)} style={btnDanger}>Reject All</button>
                        </div>
                      </div>
                      <div style={{ background: '#f5f0e8', borderRadius: 6, padding: 12 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#5a3a1a', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Proposed Changes — approve or reject each field</p>
                        {Object.entries(edit.changes).filter(([key]) => !key.startsWith('_')).map(([key, val]) => (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, background: '#fff', borderRadius: 6, padding: '8px 12px', border: '1px solid #e8ddd0' }}>
                            <span style={{ color: '#8b5e2a', fontSize: 13, minWidth: 140, fontWeight: 600 }}>{key}</span>
                            <span style={{ color: '#1a0a00', fontSize: 13, fontWeight: 500, flex: 1 }}>{String(val)}</span>
                            <button onClick={() => approveField(edit, key)} style={{ ...btnSuccess, padding: '4px 10px', fontSize: 12 }}>✓ Apply</button>
                            <button onClick={() => rejectField(edit, key)} style={{ ...btnDanger, padding: '4px 10px', fontSize: 12 }}>✕ Skip</button>
                          </div>
                        ))}
                        {edit.changes._reason && <p style={{ fontSize: 12, color: '#8b5e2a', margin: '10px 0 0', fontStyle: 'italic' }}>Reason: {String(edit.changes._reason)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== CHARACTERISTICS ===== */}
          {section === 'characteristics' && (
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>Characteristics</h1>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {['unverified', 'active', 'merged', 'rejected', 'all'].map(s => (
                  <button key={s} onClick={() => setCharStatusFilter(s)} style={{ padding: '7px 14px', borderRadius: 6, fontSize: 13, background: charStatusFilter === s ? '#1a0a00' : '#f5f0e8', color: charStatusFilter === s ? '#f5e6c8' : '#5a3a1a', border: charStatusFilter === s ? '1px solid #1a0a00' : '1px solid #d4b896', fontWeight: charStatusFilter === s ? 600 : 400, cursor: 'pointer' }}>{s}</button>
                ))}
              </div>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f0e8', borderBottom: '1px solid #e8ddd0' }}>
                      {['Raw Name', 'Canonical Name', 'Category', 'Votes', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#5a3a1a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChars.map((c, i) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f0e8dc', background: i % 2 === 0 ? '#fff' : '#faf8f5' }}>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: '#5a3a1a' }}>{c.raw_name}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <input defaultValue={c.canonical_name || c.raw_name} onBlur={e => updateCanonicalName(c.id, e.target.value)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d4b896', fontSize: 13, width: '100%' }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: '#5a3a1a' }}>{c.category}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#1a0a00' }}>{c.vote_count}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, fontWeight: 600, background: c.status === 'active' ? '#e8f5e9' : c.status === 'unverified' ? '#fff3e0' : '#fbe9e7', color: c.status === 'active' ? '#2e7d32' : c.status === 'unverified' ? '#e65100' : '#b71c1c' }}>{c.status}</span>
                        </td>
                        <td style={{ padding: '10px 14px', display: 'flex', gap: 6 }}>
                          {c.status !== 'active' && <button onClick={() => approveChar(c.id)} style={btnSuccess}>Approve</button>}
                          {c.status !== 'rejected' && <button onClick={() => rejectChar(c.id)} style={btnDanger}>Reject</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredChars.length === 0 && <p style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>No characteristics in this category</p>}
              </div>
            </div>
          )}

          {/* ===== STORES ===== */}
          {section === 'stores' && (
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>Store Management</h1>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f0e8', borderBottom: '1px solid #e8ddd0' }}>
                      {['Store', 'Company', 'Type', 'Location', 'Tier', 'Active', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#5a3a1a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f0e8dc', background: i % 2 === 0 ? '#fff' : '#faf8f5' }}>
                        <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600, color: '#1a0a00' }}>{s.name}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: '#5a3a1a' }}>{s.store_accounts?.company_name || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13 }}>{s.type === 'brick_and_mortar' ? '🏪' : s.type === 'online' ? '🌐' : '🏪🌐'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: '#5a3a1a' }}>{[s.city, s.state].filter(Boolean).join(', ') || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13 }}>{s.store_accounts?.tier || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, background: s.active ? '#e8f5e9' : '#fbe9e7', color: s.active ? '#2e7d32' : '#b71c1c', fontWeight: 600 }}>{s.active ? 'Active' : 'Inactive'}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <button onClick={() => toggleStoreActive(s.id, s.active)} style={s.active ? btnDanger : btnSuccess}>{s.active ? 'Deactivate' : 'Activate'}</button>
                        </td>
                      </tr>
                    ))}
                    {stores.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>No stores yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== APPLICATIONS ===== */}
          {section === 'applications' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: 0 }}>Industry Applications</h1>
                <button onClick={fetchApplications} style={btnPrimary}>Refresh</button>
              </div>
              {applications.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                  <p style={{ fontSize: 16, marginBottom: 8 }}>No applications yet</p>
                  <p style={{ fontSize: 13 }}>Click Refresh to load</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {applications.map(app => (
                    <div key={app.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: 0 }}>{app.name}</h3>
                            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, fontWeight: 600, background: app.status === 'approved' ? '#e8f5e9' : app.status === 'rejected' ? '#fbe9e7' : '#fff3e0', color: app.status === 'approved' ? '#2e7d32' : app.status === 'rejected' ? '#b71c1c' : '#e65100' }}>{app.status}</span>
                          </div>
                          <p style={{ fontSize: 14, color: '#1a0a00', fontWeight: 600, margin: '0 0 2px' }}>{app.company}</p>
                          <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 2px' }}>{app.email}{app.phone ? ` · ${app.phone}` : ''}</p>
                          <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>{new Date(app.created_at).toLocaleDateString()} · {app.role_type}</p>
                        </div>
                        {app.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => approveApplication(app)} style={btnSuccess}>Approve</button>
                            <button onClick={() => rejectApplication(app.id)} style={btnDanger}>Reject</button>
                          </div>
                        )}
                      </div>
                      <div style={{ background: '#f5f0e8', borderRadius: 6, padding: 12, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                        {app.website && <div><span style={{ fontSize: 11, color: '#8b5e2a', display: 'block', marginBottom: 2 }}>WEBSITE</span><a href={app.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#1a0a00' }}>{app.website}</a></div>}
                        <div><span style={{ fontSize: 11, color: '#8b5e2a', display: 'block', marginBottom: 2 }}>ROLE</span><span style={{ fontSize: 13, color: '#1a0a00', fontWeight: 500 }}>{app.role_type}</span></div>
                        {app.message && <div style={{ flex: 1 }}><span style={{ fontSize: 11, color: '#8b5e2a', display: 'block', marginBottom: 2 }}>MESSAGE</span><span style={{ fontSize: 13, color: '#1a0a00' }}>{app.message}</span></div>}
                      </div>
                      {app.status === 'approved' && <p style={{ fontSize: 12, color: '#2e7d32', margin: '10px 0 0', fontStyle: 'italic' }}>✓ User role has been updated to match their application type</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== FEEDBACK ===== */}
          {section === 'feedback' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: 0 }}>Feedback</h1>
                <button onClick={fetchFeedback} style={btnPrimary}>Refresh</button>
              </div>
              {feedbackItems.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                  <p style={{ fontSize: 16, marginBottom: 8 }}>No feedback yet</p>
                  <p style={{ fontSize: 13 }}>Click Refresh to load</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {feedbackItems.map(f => (
                    <div key={f.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 18, opacity: f.status === 'read' ? 0.65 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, fontWeight: 600, background: '#f5f0e8', color: '#5a3a1a' }}>{f.type}</span>
                          <span style={{ fontSize: 12, color: '#aaa' }}>{new Date(f.created_at).toLocaleDateString()}</span>
                          {f.email && <span style={{ fontSize: 12, color: '#8b5e2a' }}>{f.email}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {f.status !== 'read' && f.status !== 'actioned' && <button onClick={() => markFeedbackRead(f.id)} style={{ ...btnSuccess, fontSize: 11, padding: '3px 10px' }}>Mark read</button>}
                          <button onClick={() => deleteFeedback(f.id)} style={{ ...btnDanger, fontSize: 11, padding: '3px 10px' }}>Delete</button>
                        </div>
                      </div>
                      <p style={{ fontSize: 14, color: '#1a0a00', margin: '0 0 12px', lineHeight: 1.6 }}>{f.message}</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={feedbackNotes[f.id] ?? (f.admin_note || '')} onChange={e => setFeedbackNotes(prev => ({ ...prev, [f.id]: e.target.value }))} placeholder="Add a follow-up note..." style={{ flex: 1, padding: '7px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 13, outline: 'none' }} />
                        <button onClick={() => saveFeedbackNote(f.id)} style={{ ...btnPrimary, fontSize: 12, padding: '6px 14px' }}>Save note</button>
                      </div>
                      {f.admin_note && !feedbackNotes[f.id] && <p style={{ fontSize: 12, color: '#8b5e2a', margin: '6px 0 0', fontStyle: 'italic' }}>Note: {f.admin_note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== REVIEWS ===== */}
          {section === 'reviews' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: 0 }}>Reviews</h1>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={fetchReviews} style={btnPrimary}>Search</button>
                  {adminReviews.length > 0 && <button onClick={exportReviewsCSV} style={btnWarning}>Export CSV ({adminReviews.length})</button>}
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
                  <div><label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Date From</label><input type="date" value={reviewDateFrom} onChange={e => setReviewDateFrom(e.target.value)} style={inputStyle} /></div>
                  <div><label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Date To</label><input type="date" value={reviewDateTo} onChange={e => setReviewDateTo(e.target.value)} style={inputStyle} /></div>
                  <div><label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Min Rating</label><input type="number" min="1" max="10" step="0.5" value={reviewRatingMin} onChange={e => setReviewRatingMin(e.target.value)} placeholder="e.g. 7" style={inputStyle} /></div>
                  <div><label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Max Rating</label><input type="number" min="1" max="10" step="0.5" value={reviewRatingMax} onChange={e => setReviewRatingMax(e.target.value)} placeholder="e.g. 4" style={inputStyle} /></div>
                  <div><label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Filter by User</label><input value={reviewUserFilter} onChange={e => setReviewUserFilter(e.target.value)} placeholder="Username..." style={inputStyle} /></div>
                  <div><label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Filter by Cigar / Brand</label><input value={reviewCigarFilter} onChange={e => setReviewCigarFilter(e.target.value)} placeholder="Cigar or brand name..." style={inputStyle} /></div>
                </div>
              </div>
              {reviewsLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#8b5e2a' }}>Loading reviews...</div>
              ) : adminReviews.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                  <p style={{ fontSize: 16, marginBottom: 8 }}>No reviews loaded</p>
                  <p style={{ fontSize: 13 }}>Set your filters and click Search</p>
                </div>
              ) : (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f0e8', borderBottom: '1px solid #e8ddd0' }}>
                        {['Date', 'User', 'Cigar', 'Rating', 'Draw', 'Burn', 'Const.', 'Value', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#5a3a1a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adminReviews.map((r, i) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f0e8dc', background: i % 2 === 0 ? '#fff' : '#faf8f5' }}>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#8b5e2a', whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#1a0a00' }}><a href={`/admin/user/${r.user_id}`} style={{ color: '#1a0a00', textDecoration: 'none' }}>{r._username}</a></td>
                          <td style={{ padding: '10px 14px', fontSize: 13, color: '#5a3a1a', maxWidth: 200 }}>
                            <a href={`/cigar/${r.cigar_id}`} style={{ color: '#5a3a1a', textDecoration: 'none' }}>
                              <span style={{ color: '#c4a96a', fontSize: 11, display: 'block' }}>{r._brand_name}</span>
                              {r._cigar_name}
                            </a>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 700, color: '#1a0a00' }}>{r.rating?.toFixed(1) ?? '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, color: '#5a3a1a' }}>{r.draw_score?.toFixed(1) ?? '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, color: '#5a3a1a' }}>{r.burn_score?.toFixed(1) ?? '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, color: '#5a3a1a' }}>{r.construction_score?.toFixed(1) ?? '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, color: '#5a3a1a' }}>{r.value_score?.toFixed(1) ?? '—'}</td>
                          <td style={{ padding: '10px 14px' }}><button onClick={() => deleteReview(r.id)} style={btnDanger}>Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={{ fontSize: 12, color: '#aaa', padding: '8px 14px' }}>{adminReviews.length} reviews shown</p>
                </div>
              )}
            </div>
          )}

          {/* ===== TIMELINE ===== */}
          {section === 'timeline' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: 0 }}>Timeline Moderation</h1>
                <button onClick={() => fetchSection('timeline')} style={btnPrimary}>Refresh</button>
              </div>
              {timelineLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#8b5e2a' }}>Loading...</div>
              ) : timelineEntries.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 40, textAlign: 'center', color: '#aaa' }}>
                  <p style={{ fontSize: 18, marginBottom: 8 }}>Queue is clear</p>
                  <p style={{ fontSize: 14 }}>No pending timeline submissions</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {timelineEntries.map(entry => {
                    const isEditing = timelineEditId === entry.id
                    const isMerging = timelineMergeId === entry.id
                    return (
                      <div key={entry.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0', padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <p style={{ fontSize: 13, color: '#c4a96a', fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{(entry.cigars as any)?.name || 'Unknown cigar'}</p>
                            <p style={{ fontSize: 15, fontWeight: 700, color: '#1a0a00', margin: '0 0 4px' }}>{entry.title}</p>
                            <p style={{ fontSize: 12, color: '#8b5e2a', margin: 0 }}>{entry.event_type.replace('_', ' ')} · {entry.event_date ? entry.event_date.split('T')[0] : 'No date'} · by {entry._username} · {new Date(entry.created_at).toLocaleDateString()}</p>
                          </div>
                          {!isEditing && !isMerging && (
                            <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <button onClick={() => approveTimelineEntry(entry.id)} style={btnSuccess}>✓ Approve</button>
                              <button onClick={() => { setTimelineEditId(entry.id); setTimelineMergeId(null); const dp = entry.event_date ? entry.event_date.split('T')[0].split('-') : ['', '', '']; setTimelineEditForm({ event_type: entry.event_type, year: dp[0] || '', month: entry.date_precision !== 'year' ? (dp[1] || '') : '', day: entry.date_precision === 'day' ? (dp[2] || '') : '', title: entry.title || '', body: entry.body || '', source: entry.source || '' }) }} style={btnWarning}>✏️ Edit</button>
                              <button onClick={() => { startTimelineMerge(entry); setTimelineEditId(null) }} style={{ ...btnWarning, background: '#f3e5f5', color: '#6a1b9a', border: '1px solid #ce93d8' }}>🔀 Merge</button>
                              <button onClick={() => rejectTimelineEntry(entry.id)} style={btnDanger}>✕ Reject</button>
                            </div>
                          )}
                        </div>
                        {entry.body && !isEditing && <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, margin: '0 0 8px', background: '#faf8f5', padding: '10px 14px', borderRadius: 6 }}>{entry.body}</p>}
                        {entry.source && !isEditing && <p style={{ fontSize: 12, color: '#8b5e2a', margin: 0 }}>Source: <a href={entry.source.startsWith('http') ? entry.source : undefined} target="_blank" rel="noopener noreferrer" style={{ color: '#c4a96a' }}>{entry.source}</a></p>}

                        {isEditing && (
                          <div style={{ borderTop: '1px solid #e8ddd0', marginTop: 12, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#8b5e2a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Edit Entry</p>
                            <div>
                              <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Event Type</label>
                              <select value={timelineEditForm.event_type} onChange={e => setTimelineEditForm(p => ({ ...p, event_type: e.target.value }))} style={inputStyle}>
                                {['release', 'discontinued', 'blend_change', 'name_change', 'size_change', 'award', 'price_change', 'note'].map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                              </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 10 }}>
                              <div><label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Year</label><input type="number" value={timelineEditForm.year} onChange={e => setTimelineEditForm(p => ({ ...p, year: e.target.value }))} placeholder="e.g. 2015" style={inputStyle} /></div>
                              <div>
                                <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Month (optional)</label>
                                <select value={timelineEditForm.month} onChange={e => setTimelineEditForm(p => ({ ...p, month: e.target.value }))} style={inputStyle}>
                                  <option value="">—</option>
                                  {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => <option key={m} value={m}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}</option>)}
                                </select>
                              </div>
                              <div><label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Day</label><input type="number" min="1" max="31" value={timelineEditForm.day} onChange={e => setTimelineEditForm(p => ({ ...p, day: e.target.value }))} placeholder="—" style={inputStyle} /></div>
                            </div>
                            <div><label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Title</label><input value={timelineEditForm.title} onChange={e => setTimelineEditForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} /></div>
                            <div><label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Details (optional)</label><textarea value={timelineEditForm.body} onChange={e => setTimelineEditForm(p => ({ ...p, body: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'system-ui', lineHeight: 1.6 }} /></div>
                            <div><label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Source (optional)</label><input value={timelineEditForm.source} onChange={e => setTimelineEditForm(p => ({ ...p, source: e.target.value }))} style={inputStyle} /></div>
                            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                              <button onClick={() => saveAndApproveTimelineEdit(entry.id)} disabled={timelineSaving} style={{ ...btnSuccess, padding: '8px 18px', fontSize: 13 }}>{timelineSaving ? 'Saving...' : '✓ Save & Approve'}</button>
                              <button onClick={() => saveTimelineEdit(entry.id)} disabled={timelineSaving} style={{ ...btnWarning, padding: '8px 18px', fontSize: 13 }}>Save edits only</button>
                              <button onClick={() => setTimelineEditId(null)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '8px 16px', fontSize: 13, color: '#888', cursor: 'pointer' }}>Cancel</button>
                            </div>
                          </div>
                        )}

                        {isMerging && (
                          <div style={{ borderTop: '1px solid #e8ddd0', marginTop: 12, paddingTop: 16 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#6a1b9a', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🔀 Merge — pick which fields to copy from this submission</p>
                            {timelineMergeTargets.length === 0 ? (
                              <p style={{ fontSize: 13, color: '#aaa' }}>No live entries found for this cigar to merge into.</p>
                            ) : (
                              <>
                                <div style={{ marginBottom: 14 }}>
                                  <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 6 }}>Step 1 — Select the existing entry to merge into:</label>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {timelineMergeTargets.map(target => (
                                      <button key={target.id} onClick={() => { setTimelineMergeTargetId(target.id); setTimelineMergeFields({}) }}
                                        style={{ padding: '10px 14px', borderRadius: 8, textAlign: 'left', cursor: 'pointer', border: timelineMergeTargetId === target.id ? '2px solid #6a1b9a' : '1px solid #d4b896', background: timelineMergeTargetId === target.id ? '#f3e5f5' : '#faf8f5' }}>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a0a00' }}>{target.title}</span>
                                        <span style={{ fontSize: 12, color: '#8b5e2a', marginLeft: 10 }}>{target.event_type.replace('_', ' ')} · {target.event_date ? target.event_date.split('T')[0].split('-')[0] : '?'}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                {timelineMergeTargetId && (() => {
                                  const target = timelineMergeTargets.find(t => t.id === timelineMergeTargetId)
                                  if (!target) return null
                                  const fields = [
                                    { key: 'event_type', label: 'Event Type', pending: entry.event_type, existing: target.event_type },
                                    { key: 'title', label: 'Title', pending: entry.title, existing: target.title },
                                    { key: 'body', label: 'Details', pending: entry.body || '—', existing: target.body || '—' },
                                    { key: 'source', label: 'Source', pending: entry.source || '—', existing: target.source || '—' },
                                    { key: 'event_date', label: 'Date', pending: entry.event_date?.split('T')[0] || '—', existing: target.event_date?.split('T')[0] || '—' },
                                  ]
                                  return (
                                    <div style={{ marginBottom: 14 }}>
                                      <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 8 }}>Step 2 — Choose which fields to copy:</label>
                                      <div style={{ background: '#faf8f5', borderRadius: 8, border: '1px solid #e8ddd0', overflow: 'hidden' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', background: '#f5f0e8', padding: '8px 14px', fontSize: 11, fontWeight: 600, color: '#5a3a1a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                          <span>Field</span><span>Existing</span><span>Pending</span><span>Copy?</span>
                                        </div>
                                        {fields.map(f => (
                                          <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', padding: '10px 14px', borderTop: '1px solid #e8ddd0', alignItems: 'center', background: timelineMergeFields[f.key] ? '#f3e5f5' : '#fff' }}>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: '#8b5e2a' }}>{f.label}</span>
                                            <span style={{ fontSize: 13, color: '#5a3a1a' }}>{f.existing}</span>
                                            <span style={{ fontSize: 13, color: '#1a0a00', fontWeight: 500 }}>{f.pending}</span>
                                            <input type="checkbox" checked={!!timelineMergeFields[f.key]} onChange={e => setTimelineMergeFields(prev => ({ ...prev, [f.key]: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })()}
                              </>
                            )}
                            <div style={{ display: 'flex', gap: 10 }}>
                              {timelineMergeTargetId && Object.values(timelineMergeFields).some(Boolean) && (
                                <button onClick={executeMergeTimeline} disabled={timelineSaving} style={{ background: '#6a1b9a', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                  {timelineSaving ? 'Merging...' : '🔀 Execute Merge'}
                                </button>
                              )}
                              <button onClick={() => { setTimelineMergeId(null); setTimelineMergeTargets([]); setTimelineMergeTargetId(null); setTimelineMergeFields({}) }} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '8px 16px', fontSize: 13, color: '#888', cursor: 'pointer' }}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {msg && <p style={{ marginTop: 16, color: '#2e7d32', fontSize: 13 }}>{msg}</p>}
        </main>
      </div>
    </div>
  )
}
