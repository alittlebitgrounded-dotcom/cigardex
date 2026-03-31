'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const FEEDBACK_TYPES = [
  { value: 'bug', label: '🐛 Bug report', description: 'Something is broken or not working right' },
  { value: 'suggestion', label: '💡 Feature suggestion', description: 'Something you\'d like to see added' },
  { value: 'data', label: '📊 Data quality', description: 'Missing cigars, wrong info, bad imports' },
  { value: 'compliment', label: '🍂 Compliment', description: 'Something you love about CigarLog' },
  { value: 'other', label: '💬 Other', description: 'Anything else on your mind' },
]

export default function FeedbackPage() {
  const [form, setForm] = useState({ type: '', message: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!form.type || !form.message.trim()) { setError('Please select a type and write your feedback'); return }
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

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '48px 32px', textAlign: 'center' }}>
        <h1 style={{ color: '#f5e6c8', fontSize: 30, fontWeight: 700, margin: '0 0 10px' }}>Share Your Feedback</h1>
        <p style={{ color: '#c4a96a', fontSize: 15, margin: 0 }}>We read everything. No ticket system, no auto-replies.</p>
      </div>

      <div style={{ flex: 1, maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}>
        {submitted ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: '0 0 10px' }}>Thank you!</h2>
            <p style={{ color: '#8b5e2a', fontSize: 15, margin: '0 0 24px' }}>Your feedback helps make CigarLog better for everyone.</p>
            <a href="/" style={{ background: '#1a0a00', color: '#f5e6c8', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>Back to CigarLog</a>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 8 }}>What kind of feedback? *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {FEEDBACK_TYPES.map(t => (
                    <button key={t.value} onClick={() => setForm(prev => ({ ...prev, type: t.value }))} style={{
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

              <div>
                <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Your feedback *</label>
                <textarea value={form.message} onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))} rows={5}
                  placeholder="Tell us what's on your mind..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const, fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 4 }}>Your email <span style={{ color: '#bbb' }}>(optional — only if you want a reply)</span></label>
                <input type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="you@example.com"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>

              {error && <p style={{ color: '#b71c1c', fontSize: 13, background: '#fbe9e7', padding: '10px 14px', borderRadius: 6, margin: 0 }}>{error}</p>}

              <button onClick={handleSubmit} disabled={submitting} style={{
                background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 8,
                padding: '14px 0', fontSize: 15, fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1,
              }}>
                {submitting ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
