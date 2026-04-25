'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  getReviewerPublicationProfile,
  saveReviewerPublicationProfile,
} from '@/lib/reviewer-publications'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function ReviewerSetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [publicationId, setPublicationId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    publication_name: '',
    publication_url: '',
    instagram: '',
    youtube: '',
    podcast: '',
    other: '',
  })

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/?signin=true'); return }
    const { data: profile } = await supabase
      .from('users')
      .select('id, role, publication_name, publication_url, social_urls')
      .eq('id', session.user.id)
      .maybeSingle()
    if (!profile) { router.push('/'); return }

    const reviewerPublication = await getReviewerPublicationProfile(session.user.id)
    if (profile.role !== 'reviewer' && !reviewerPublication) { router.push('/pro'); return }

    setUserId(profile.id)
    setPublicationId(reviewerPublication?.publicationId || null)
    setForm({
      publication_name: reviewerPublication?.publicationName || profile.publication_name || '',
      publication_url: reviewerPublication?.publicationUrl || profile.publication_url || '',
      instagram: reviewerPublication?.socialUrls?.instagram || profile.social_urls?.instagram || '',
      youtube: reviewerPublication?.socialUrls?.youtube || profile.social_urls?.youtube || '',
      podcast: reviewerPublication?.socialUrls?.podcast || profile.social_urls?.podcast || '',
      other: reviewerPublication?.socialUrls?.other || profile.social_urls?.other || '',
    })
    setLoading(false)
  }

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSave() {
    setError(''); setMsg('')
    if (!userId) return
    setSaving(true)
    const social_urls: Record<string, string> = {}
    if (form.instagram.trim()) social_urls.instagram = form.instagram.trim()
    if (form.youtube.trim()) social_urls.youtube = form.youtube.trim()
    if (form.podcast.trim()) social_urls.podcast = form.podcast.trim()
    if (form.other.trim()) social_urls.other = form.other.trim()

    const publicationName = form.publication_name.trim() || null
    const publicationUrl = form.publication_url.trim() || null

    try {
      const { error: err } = await supabase.from('users').update({
        publication_name: publicationName,
        publication_url: publicationUrl,
        social_urls: Object.keys(social_urls).length > 0 ? social_urls : null,
      }).eq('id', userId)

      if (err) {
        setError(`Save failed: ${err.message}`)
        return
      }

      const savedPublicationId = await saveReviewerPublicationProfile(
        userId,
        {
          publicationName,
          publicationUrl,
          socialUrls: Object.keys(social_urls).length > 0 ? social_urls : null,
        },
        publicationId,
      )

      if (savedPublicationId) setPublicationId(savedPublicationId)

      setMsg('Profile saved.')
    } catch (err: unknown) {
      setError(err instanceof Error ? `Save failed: ${err.message}` : 'Save failed.')
    } finally {
      setSaving(false)
    }
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

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif' }}>
      <Header />

      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '36px 32px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: '#f5e6c8', fontSize: 24, fontWeight: 700, margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              Reviewer Profile
            </h1>
            <p style={{ color: '#c4a96a', fontSize: 14, margin: 0 }}>
              Your publication info shown on your reviews and profile.
            </p>
          </div>
          <a href="/pro" style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid rgba(196,169,106,0.4)', color: '#c4a96a', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            ← Dashboard
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px 64px' }}>

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

        {/* Publication */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28, marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>Publication</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Publication / Channel Name</label>
              <input value={form.publication_name} onChange={field('publication_name')} placeholder="e.g. Cigar Snob, The Stogie Review..." style={inputStyle} />
              <p style={{ fontSize: 11, color: '#aaa', margin: '5px 0 0' }}>Shown on your profile and review cards.</p>
            </div>
            <div>
              <label style={labelStyle}>Main Website or Channel URL</label>
              <input value={form.publication_url} onChange={field('publication_url')} placeholder="https://..." style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Socials */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28, marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>Social & Podcast Links</h2>
          <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 20px' }}>Optional — shown on your reviewer profile.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Instagram</label>
              <input value={form.instagram} onChange={field('instagram')} placeholder="https://instagram.com/yourchannel" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>YouTube</label>
              <input value={form.youtube} onChange={field('youtube')} placeholder="https://youtube.com/@yourchannel" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Podcast</label>
              <input value={form.podcast} onChange={field('podcast')} placeholder="https://..." style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Other</label>
              <input value={form.other} onChange={field('other')} placeholder="Any other link..." style={inputStyle} />
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', padding: '14px 0', background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>

      </div>
      <Footer />
    </div>
  )
}
