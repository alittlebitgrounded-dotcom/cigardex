'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  targetType: 'cigar' | 'brand'
  targetId: string
  targetName: string
  userId: string
  onClose: () => void
}

const ERROR_TYPES = [
  'Wrong name',
  'Wrong brand',
  'Wrong country of origin',
  'Wrong strength',
  'Wrong vitola / size',
  'Wrong wrapper / binder / filler',
  'Wrong MSRP',
  'Duplicate listing',
  'Discontinued / no longer available',
  'Other',
]

export default function ReportError({ targetType, targetId, targetName, userId, onClose }: Props) {
  const [errorType, setErrorType] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!errorType) { setError('Please select an error type.'); return }
    setSubmitting(true)
    setError('')

    const { error: dbError } = await supabase.from('feedback').insert({
      type: `error_report_${targetType}`,
      message: `[${errorType}] on "${targetName}" (${targetType} ID: ${targetId})${message ? ': ' + message : ''}`,
      user_id: userId,
      status: 'pending',
    })

    if (dbError) {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) return (
    <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 10, padding: '16px 20px', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <p style={{ fontSize: 14, color: '#2e7d32', margin: 0, fontWeight: 500 }}>
        ✓ Thanks — we'll review your report shortly.
      </p>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#2e7d32', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
        Close
      </button>
    </div>
  )

  return (
    <div style={{ background: '#fff', border: '1px solid #e8ddd0', borderRadius: 10, padding: 24, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a0a00', margin: 0 }}>
          Report an Error — <span style={{ color: '#8b5e2a', fontWeight: 500 }}>{targetName}</span>
        </h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>
          ×
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Error type */}
        <div>
          <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 6, fontWeight: 600 }}>
            What's wrong? *
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ERROR_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setErrorType(type)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                  border: errorType === type ? '2px solid #1a0a00' : '1px solid #d4b896',
                  background: errorType === type ? '#1a0a00' : '#fff',
                  color: errorType === type ? '#f5e6c8' : '#5a3a1a',
                  fontWeight: errorType === type ? 600 : 400,
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Optional details */}
        <div>
          <label style={{ fontSize: 12, color: '#8b5e2a', display: 'block', marginBottom: 6, fontWeight: 600 }}>
            Details <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="e.g. The correct country is Honduras, not Nicaragua..."
            rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d4b896', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const, fontFamily: 'Georgia, serif', lineHeight: 1.6 }}
          />
        </div>

        {error && (
          <p style={{ fontSize: 13, color: '#b71c1c', background: '#fbe9e7', padding: '8px 12px', borderRadius: 6, margin: 0 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 6, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
          <button
            onClick={onClose}
            style={{ background: 'none', border: '1px solid #d4b896', borderRadius: 6, padding: '10px 18px', fontSize: 14, color: '#888', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

