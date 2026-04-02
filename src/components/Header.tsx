'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AuthModal from '@/components/AuthModal'
import type { User } from '@supabase/supabase-js'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<{ username: string; role: string } | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('signin') === 'true') {
        setShowAuth(true)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setUserProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('users').select('username, role').eq('id', userId).maybeSingle()
    if (data) setUserProfile(data)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setShowUserMenu(false)
  }

  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <header style={{
        background: '#1a0a00', padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64, position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🍂</span>
          <a href="/" style={{ color: '#f5e6c8', fontSize: 20, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.03em' }}>CigarLog</a>
        </div>
        <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="/" style={{ color: '#c4a96a', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Browse</a>
          <a href="/brands" style={{ color: '#c4a96a', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Brands</a>
          {user && <a href="/humidor" style={{ color: '#c4a96a', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>My Humidor</a>}
          {(userProfile?.role === 'super_admin' || userProfile?.role === 'moderator') && (
            <a href="/admin" style={{ color: '#1a0a00', fontSize: 14, textDecoration: 'none', fontWeight: 600, background: '#c4a96a', padding: '5px 14px', borderRadius: 20 }}>Admin</a>
          )}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowUserMenu(!showUserMenu)} style={{
                background: '#2c1206', border: '1px solid #c4a96a', color: '#f5e6c8',
                borderRadius: 20, padding: '6px 16px', fontSize: 14, cursor: 'pointer',
                fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#c4a96a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#1a0a00' }}>
                  {(userProfile?.username || user.email || '?')[0].toUpperCase()}
                </span>
                {userProfile?.username || user.email?.split('@')[0]}
                {userProfile?.role === 'super_admin' && (
                  <span style={{ fontSize: 10, background: '#c4a96a', color: '#1a0a00', padding: '1px 6px', borderRadius: 3, fontWeight: 700 }}>ADMIN</span>
                )}
              </button>
              {showUserMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 8,
                  background: '#fff', borderRadius: 10, border: '1px solid #e8ddd0',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 180, overflow: 'hidden', zIndex: 200,
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0e8dc' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1a0a00' }}>{userProfile?.username}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#8b5e2a' }}>{user.email}</p>
                  </div>
                  <a href={`/profile/${userProfile?.username}`} style={{ display: 'block', padding: '10px 16px', fontSize: 14, color: '#1a0a00', textDecoration: 'none' }}>My Profile</a>
                  <a href="/humidor" style={{ display: 'block', padding: '10px 16px', fontSize: 14, color: '#1a0a00', textDecoration: 'none' }}>My Humidor</a>
                  <a href="/wishlist" style={{ display: 'block', padding: '10px 16px', fontSize: 14, color: '#1a0a00', textDecoration: 'none' }}>My Wishlist</a>
                  <a href={`/profile/${userProfile?.username}?tab=reviews`} style={{ display: 'block', padding: '10px 16px', fontSize: 14, color: '#1a0a00', textDecoration: 'none' }}>
                    My Reviews
                  </a>
                  {(userProfile?.role === 'super_admin' || userProfile?.role === 'moderator') && (
                    <a href="/admin" style={{ display: 'block', padding: '10px 16px', borderTop: '1px solid #f0e8dc', fontSize: 14, color: '#1a0a00', textDecoration: 'none' }}>Admin Panel</a>
                  )}
                  <button onClick={handleSignOut} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', fontSize: 14, color: '#b71c1c', cursor: 'pointer', borderTop: '1px solid #f0e8dc' }}>Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} style={{ background: '#c4a96a', color: '#1a0a00', border: 'none', borderRadius: 20, padding: '7px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Sign In
            </button>
          )}
        </nav>
      </header>
    </>
  )
}
