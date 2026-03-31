'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

const ROLE_TYPES = [
  { value: 'brand', label: 'Cigar Brand / Manufacturer', description: 'Manage your brand profile, edit your cigars, connect with retailers' },
  { value: 'retailer', label: 'Retailer / Shop Owner', description: 'List your store, manage inventory, reach cigar enthusiasts' },
  { value: 'distributor', label: 'Distributor', description: 'Connect brands and retailers on the platform' },
  { value: 'reviewer', label: 'Reviewer / Content Creator', description: 'Get verified status and link your channel or publication' },
  { value: 'press', label: 'Industry Press / Journalist', description: 'Press access and verified badge for your coverage' },
]

export default function IndustryPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    website: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  function isPersonalEmail(email: string) {
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'protonmail.com', 'me.com']
    const domain = email.split('@')[1]?.toLowerCase()
    return personalDomains.includes(domain)
  }

  async function handleSubmit() {
    setError('')
    if (!form.name || !form.email || !form.company || !form.role) {
      setError('Please fill in all required fields')
      return
    }
    if (!form.email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    if (isPersonalEmail(form.email)) {
      setError('Please use your professional or company email address — Gmail, Yahoo, and similar personal emails are not accepted for industry accounts.')
      return
    }
    setSubmitting(true)
    const { error: err } = await supabase.from('industry_applications').insert({
      name: form.name,
      email: form.email,
      company: form.company,
      role_type: form.role,
      website: form.website || null,
      message: form.message || null,
      status: 'pending',
    })
    if (err) {
      await supabase.from('cigar_edits').insert({
        cigar_id: null,
        submitted_by: null,
        changes: {
          _industry_application: true,
          name: form.name,
          email: form.email,
          company: form.company,
          role_type: form.role,
          website: form.website,
          message: form.message,
        },
        status: 'pending',
      })
    }
    setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <Header />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '56px 32px', textAlign: 'center' }}>
        <h1 style={{ color: '#f5e6c8', fontSize: 34, fontWeight: 700, margin: '0 0 12px' }}>Industry Professional Access</h1>
        <p style={{ color: '#c4a96a', fontSize: 16, margin: '0 auto', maxWidth: 560, lineHeight: 1.6 }}>
          CigarLog is building the most accurate cigar database on the internet. If you work in the industry, we want to work with you.
        </p>
      </div>

      <div style={{ flex: 1, maxWidth: 720, margin: '0 auto', padding: '48px 24px', width: '100%' }}>

        {/* ── Disclaimer banner ── */}
        <div style={{
          background: '#f5efe6',
          border: '1px solid #c4a96a',
          borderLeft: '4px solid #c4a96a',
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 28,
        }}>
          <p style={{ margin: '0 0 6px 0', fontWeight: 700, fontSize: 14, color: '#1a0a00', fontFamily: 'Georgia, serif' }}>
            Industry accounts are verified and public.
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#3a2010', lineHeight: 1.6 }}>
            Your profile will be publicly visible as a verified brand or retailer on CigarLog.
            If you&apos;d prefer a separate personal account for browsing and reviewing as a consumer,
            you&apos;re welcome to{' '}
            <Link href="/login" style={{ color: '#8b5e2a', fontWeight: 600, textDecoration: 'underline' }}>
              sign in or create a consumer account
            </Link>
            {' '}instead — or maintain both.
          </p>
        </div>

        {submitted ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🍂</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1a0a00', margin: '0 0 12px' }}>Application received</h2>
            <p style={{ color: '#8b5e2a', fontSize: 15, lineHeight: 1.7, margin: '0 0 24px' }}>
              Thanks for reaching out. We review industry applications personally and will be in touch within a few business days.
            </p>
            <a href="/" style={{ background: '#1a0a00', color: '#f5e6c8', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>
              Back to CigarLog
            </a>
          </div>
        ) : (
          <div>
            {/* What you get */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28, marginBottom: 28 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a0a00', margin: '0 0 16px' }}>What industry access includes</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['✓', 'Verified badge on your profile'],
                  ['✓', 'Direct edit access for your own cigars or store'],
                  ['✓', 'Priority review of data submissions'],
                  ['✓', 'Early access to new platform features'],
                ].map(([icon, text]) => (
                  <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: '#c4a96a', fontWeight: 700, flexShrink: 0 }}>{icon}</span>
                    <span style={{ fontSize: 14, color: '#5a3a1a' }}>{text}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 13, color: '#aaa', margin: '16px 0 0', fontStyle: 'italic' }}>
                A professional or company email is required. Personal email addresses are not accepted.
              </p>
            </div>

            {/* Form */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px' }}>Apply for industry access</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Your Name *</label>
                    <input value={form.name} onChange={field('name')} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Professional Email *</label>
                    <input type="email" value={form.email} onChange={field('email')} placeholder="you@yourbrand.com" style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Company / Brand / Store Name *</label>
                  <input value={form.company} onChange={field('company')} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 8 }}>Your Role *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ROLE_TYPES.map(role => (
                      <button key={role.value} onClick={() => setForm(prev => ({ ...prev, role: role.value }))} style={{
                        padding: '12px 16px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                        border: form.role === role.value ? '2px solid #1a0a00' : '1px solid #d4b896',
                        background: form.role === role.value ? '#f5f0e8' : '#fff',
                      }}>
                        <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: '#1a0a00' }}>{role.label}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#8b5e2a' }}>{role.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Website <span style={{ color: '#bbb' }}>(optional)</span></label>
                  <input value={form.website} onChange={field('website')} placeholder="https://yourbrand.com" style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Anything else you&apos;d like us to know <span style={{ color: '#bbb' }}>(optional)</span></label>
                  <textarea value={form.message} onChange={field('message')} rows={3}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const, fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }} />
                </div>

                {error && (
                  <p style={{ color: '#b71c1c', fontSize: 13, background: '#fbe9e7', padding: '10px 14px', borderRadius: 6, margin: 0 }}>{error}</p>
                )}

                <button onClick={handleSubmit} disabled={submitting} style={{
                  background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 8,
                  padding: '14px 0', fontSize: 15, fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1,
                }}>
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
