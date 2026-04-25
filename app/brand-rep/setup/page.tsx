'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

type BrandAssociation = {
  id: string
  brand_account_id: string
  status: string
  brand_accounts: { name: string; country_of_origin: string | null } | null
}

type Brand = {
  id: string
  name: string
  country_of_origin: string | null
}

export default function BrandRepSetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const [associations, setAssociations] = useState<BrandAssociation[]>([])
  const [allBrands, setAllBrands] = useState<Brand[]>([])
  const [brandSearch, setBrandSearch] = useState('')
  const [addingBrand, setAddingBrand] = useState<string | null>(null)
  const [removingBrand, setRemovingBrand] = useState<string | null>(null)

  const [form, setForm] = useState({
    role_at_brand: '',
  })

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/?signin=true'); return }
    const { data: profile } = await supabase
      .from('users')
      .select('id, role, username, publication_name')
      .eq('id', session.user.id)
      .maybeSingle()
    if (!profile) { router.push('/'); return }
    const associations = await fetchAssociations(profile.id)
    if (profile.role !== 'brand' && associations.length === 0) { router.push('/pro'); return }
    setUserId(profile.id)
    setUsername(profile.username || '')
    setForm({ role_at_brand: profile.publication_name || '' })
    await fetchAllBrands()
    setLoading(false)
  }

  async function fetchAssociations(uid: string) {
    const { data } = await supabase
      .from('brand_rep_brands')
      .select('id, brand_account_id, status, brand_accounts(name, country_of_origin)')
      .eq('user_id', uid)
      .order('created_at', { ascending: true })
    const nextAssociations = (data as unknown as BrandAssociation[]) || []
    setAssociations(nextAssociations)
    return nextAssociations
  }

  async function fetchAllBrands() {
    const { data } = await supabase
      .from('brand_accounts')
      .select('id, name, country_of_origin')
      .eq('suspended', false)
      .order('name')
    if (data) setAllBrands(data)
  }

  async function addBrand(brandId: string) {
    if (!userId) return
    setAddingBrand(brandId)
    const { error: err } = await supabase.from('brand_rep_brands').insert({
      user_id: userId,
      brand_account_id: brandId,
      status: 'pending',
    })
    setAddingBrand(null)
    if (err) { setError(`Error: ${err.message}`); return }
    setBrandSearch('')
    setMsg('Brand association requested — we\'ll verify and approve it shortly.')
    await fetchAssociations(userId)
  }

  async function removeBrand(associationId: string) {
    setRemovingBrand(associationId)
    await supabase.from('brand_rep_brands').delete().eq('id', associationId)
    setRemovingBrand(null)
    setAssociations(prev => prev.filter(a => a.id !== associationId))
  }

  async function handleSave() {
    setError(''); setMsg('')
    if (!userId) return
    setSaving(true)
    const { error: err } = await supabase.from('users').update({
      publication_name: form.role_at_brand.trim() || null,
    }).eq('id', userId)
    setSaving(false)
    if (err) { setError(`Save failed: ${err.message}`); return }
    setMsg('Profile saved.')
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

  const associatedIds = new Set(associations.map(a => a.brand_account_id))
  const approvedAssociations = associations.filter(a => a.status === 'approved')
  const pendingAssociations = associations.filter(a => a.status === 'pending')

  const filteredBrands = brandSearch.length >= 2
    ? allBrands.filter(b =>
        !associatedIds.has(b.id) &&
        b.name.toLowerCase().includes(brandSearch.toLowerCase())
      ).slice(0, 20)
    : []

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'system-ui, sans-serif' }}>
      <Header />

      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '36px 32px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: '#f5e6c8', fontSize: 24, fontWeight: 700, margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              Brand Rep Profile
            </h1>
            <p style={{ color: '#c4a96a', fontSize: 14, margin: 0 }}>
              Manage your role and the brands you represent.
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

        {/* How you appear */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>
            How you appear on reviews
          </h2>
          <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 16px' }}>
            Your username is fixed. All your reviews will show a "Brand Representative" label.
          </p>
          <div style={{ background: '#f5f0e8', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>🍂</span>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1a0a00', margin: '0 0 2px' }}>
                <span style={{ color: '#8b5e2a' }}>{username}</span>
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, background: '#c4a96a', color: '#1a0a00', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em' }}>BRAND REP</span>
                <span style={{ fontSize: 11, color: '#aaa' }}>shown on all your reviews</span>
              </div>
            </div>
          </div>
        </div>

        {/* Role at brand */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28, marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>Your Role</h2>
          <div>
            <label style={labelStyle}>Role at brand(s) <span style={{ color: '#bbb', fontWeight: 400 }}>(e.g. Owner, Sales Rep, PR Contact)</span></label>
            <input
              value={form.role_at_brand}
              onChange={e => setForm(prev => ({ ...prev, role_at_brand: e.target.value }))}
              placeholder="e.g. Owner, National Sales Manager..."
              style={inputStyle}
            />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', padding: '14px 0', background: '#1a0a00', color: '#f5e6c8', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, marginBottom: 28 }}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>

        {/* Brands */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>Brands You Represent</h2>
          <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 20px' }}>
            Each brand association requires admin approval. You'll be notified when approved.
          </p>

          {/* Approved */}
          {approvedAssociations.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>✓ Approved</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {approvedAssociations.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: 8, padding: '7px 12px' }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1a0a00' }}>{a.brand_accounts?.name}</span>
                      {a.brand_accounts?.country_of_origin && (
                        <span style={{ fontSize: 11, color: '#8b5e2a', marginLeft: 6 }}>{a.brand_accounts.country_of_origin}</span>
                      )}
                    </div>
                    <button onClick={() => removeBrand(a.id)} disabled={removingBrand === a.id}
                      style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                      {removingBrand === a.id ? '...' : '×'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending */}
          {pendingAssociations.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#e65100', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>⏳ Pending approval</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {pendingAssociations.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: 8, padding: '7px 12px' }}>
                    <span style={{ fontSize: 13, color: '#5a3a1a' }}>{a.brand_accounts?.name}</span>
                    <button onClick={() => removeBrand(a.id)} disabled={removingBrand === a.id}
                      style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                      {removingBrand === a.id ? '...' : '×'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search to add */}
          <div>
            <label style={labelStyle}>Add a brand</label>
            <input
              value={brandSearch}
              onChange={e => setBrandSearch(e.target.value)}
              placeholder="Type to search brands..."
              style={inputStyle}
            />
            {brandSearch.length >= 2 && (
              <div style={{ marginTop: 8, border: '1px solid #e8ddd0', borderRadius: 8, overflow: 'hidden' }}>
                {filteredBrands.length === 0 ? (
                  <p style={{ padding: '12px 16px', fontSize: 13, color: '#aaa', margin: 0 }}>No brands found for "{brandSearch}"</p>
                ) : (
                  filteredBrands.map(b => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #f0e8dc', background: '#fff' }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#1a0a00' }}>{b.name}</span>
                        {b.country_of_origin && <span style={{ fontSize: 12, color: '#8b5e2a', marginLeft: 8 }}>{b.country_of_origin}</span>}
                      </div>
                      <button onClick={() => addBrand(b.id)} disabled={addingBrand === b.id}
                        style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#1a0a00', color: '#f5e6c8', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: addingBrand === b.id ? 0.6 : 1 }}>
                        {addingBrand === b.id ? 'Adding...' : '+ Request'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
            <p style={{ fontSize: 11, color: '#aaa', margin: '8px 0 0', fontStyle: 'italic' }}>
              Don't see your brand? Contact us and we'll add it to the database.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28, marginTop: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: '0 0 18px', fontFamily: 'Georgia, serif' }}>Questions</h2>
          {[
            { q: 'Why do brand associations need approval?', a: 'We verify that reps are actually authorized by the brand before giving them edit access. This protects brands from unauthorized changes.' },
            { q: 'What can I do once a brand is approved?', a: 'You can edit the brand\'s About section, manage their cigar catalog, and add stores that carry their products.' },
            { q: 'I represent multiple brands — can I add them all?', a: 'Yes — search and request each one. Each requires separate approval.' },
            { q: 'Can I change my account email?', a: 'Industry account emails are locked after approval. Contact us if you need to update it.' },
          ].map((item, i, arr) => (
            <div key={i} style={{ borderBottom: i < arr.length - 1 ? '1px solid #f0e8dc' : 'none', paddingBottom: i < arr.length - 1 ? 14 : 0, marginBottom: i < arr.length - 1 ? 14 : 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1a0a00', margin: '0 0 4px' }}>{item.q}</p>
              <p style={{ fontSize: 13, color: '#5a3a1a', margin: 0, lineHeight: 1.6 }}>{item.a}</p>
            </div>
          ))}
        </div>

      </div>
      <Footer />
    </div>
  )
}
