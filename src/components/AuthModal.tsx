'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Mode = 'signin' | 'signup' | 'verify'

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSignIn() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      onClose()
    }
    setLoading(false)
  }

  async function handleSignUp() {
    setLoading(true)
    setError('')
    if (!username.trim()) {
      setError('Username is required')
      setLoading(false)
      return
    }
    // Check username not taken
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.trim())
      .maybeSingle()
    if (existing) {
      setError('That username is already taken')
      setLoading(false)
      return
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { username: username.trim() },
      },
    })
    if (error) {
      setError(error.message)
    } else if (data.user) {
      // Insert into our users table
      await supabase.from('users').insert({
        id: data.user.id,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        role: 'registered',
        tier: 'free',
      })
      setMode('verify')
    }
    setLoading(false)
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email address first')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError(error.message)
    else setError('Check your email for a password reset link!')
    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    fontSize: 15,
    border: '1px solid #d4b896',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box' as const,
    background: '#fff',
    color: '#1a0a00',
  }

  const btnStyle = {
    width: '100%',
    padding: '13px 0',
    fontSize: 15,
    fontWeight: 600,
    background: '#1a0a00',
    color: '#f5e6c8',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    opacity: loading ? 0.7 : 1,
  }

  return (
    // Overlay
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
    >
      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, padding: 36,
          width: '100%', maxWidth: 420,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 32 }}>🍂</span>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: '8px 0 4px' }}>CigarDex</h2>
          <p style={{ color: '#8b5e2a', fontSize: 14, margin: 0 }}>
            {mode === 'signin' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'verify' && 'Check your email'}
          </p>
        </div>

        {/* Verify state */}
        {mode === 'verify' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
            <p style={{ color: '#444', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              We sent a verification link to <strong>{email}</strong>. Click it to activate your account.
            </p>
            <button onClick={onClose} style={{ ...btnStyle }}>Got it</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Tab switcher */}
            <div style={{ display: 'flex', background: '#f5f0e8', borderRadius: 8, padding: 4, marginBottom: 4 }}>
              {(['signin', 'signup'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                  flex: 1, padding: '8px 0', fontSize: 14, fontWeight: mode === m ? 600 : 400,
                  background: mode === m ? '#fff' : 'transparent',
                  color: mode === m ? '#1a0a00' : '#8b5e2a',
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}>
                  {m === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Username field (sign up only) */}
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={inputStyle}
              />
            )}

            {/* Email */}
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />

            {/* Password */}
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (mode === 'signin' ? handleSignIn() : handleSignUp())}
              style={inputStyle}
            />

            {/* Error */}
            {error && (
              <p style={{
                color: error.includes('Check your email') ? '#2e7d32' : '#b71c1c',
                fontSize: 13, margin: 0, padding: '8px 12px',
                background: error.includes('Check your email') ? '#e8f5e9' : '#fbe9e7',
                borderRadius: 6,
              }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              onClick={mode === 'signin' ? handleSignIn : handleSignUp}
              disabled={loading}
              style={btnStyle}
            >
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>

            {/* Forgot password */}
            {mode === 'signin' && (
              <button onClick={handleForgotPassword} style={{
                background: 'none', border: 'none', color: '#8b5e2a',
                fontSize: 13, cursor: 'pointer', textAlign: 'center', padding: 0,
              }}>
                Forgot your password?
              </button>
            )}

            {/* Terms note for signup */}
            {mode === 'signup' && (
              <p style={{ fontSize: 12, color: '#aaa', textAlign: 'center', margin: 0 }}>
                By creating an account you agree to our terms of service.
              </p>
            )}
          </div>
        )}

        {/* Close button */}
<button onClick={onClose} style={{
  position: 'absolute', top: 16, right: 16,
  background: 'none', border: 'none', fontSize: 20,
  cursor: 'pointer', color: '#aaa', lineHeight: 1,
}}>✕</button>
      </div>
    </div>
  )
}
