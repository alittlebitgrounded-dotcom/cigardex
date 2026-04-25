'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { resolveIndustryType } from '@/lib/reviewer-publications'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

type UserProfile = {
  id: string
  username: string
  role: string
  dashboardRole: string
}

type StoreMembership = {
  tier: string
}

type BrandAssociation = {
  id: string
  status: string
  brand_accounts: { id: string; name: string; logo_url: string | null } | null
}

const ROLE_CONTENT: Record<string, {
  icon: string
  title: string
  tagline: string
  unlocks: { label: string; description: string }[]
  tools: { icon: string; label: string; description: string; href: string; available: boolean }[]
  faq: { q: string; a: string }[]
}> = {
  store: {
    icon: '🏪',
    title: 'Tobacconist Dashboard',
    tagline: 'Your verified store presence on CigarDex.',
    unlocks: [
      { label: 'Verified store badge', description: 'Displayed on your store profile and visible to all users browsing CigarDex.' },
      { label: 'Industry designations', description: 'PCA Member, Drew Diplomat, TAA Member, and other honors — managed from your store profile page.' },
      { label: 'Store profile page', description: 'A dedicated public page with your contact info, hours, and inventory.' },
      { label: 'Brand-level inventory listing', description: 'List which brands you carry so enthusiasts can find them near you.' },
    ],
    tools: [
      { icon: '🏪', label: 'My Store Profile', description: 'View and manage your public store page.', href: '/store/setup', available: true },
      { icon: '📦', label: 'Inventory', description: 'Manage which brands you carry.', href: '/store/inventory', available: true },
    ],
    faq: [
      { q: 'How do I update my store address, phone, and hours?', a: 'Go to My Store Profile from the tools section below — you can edit all your store details there.' },
      { q: 'How do I add or manage my industry designations?', a: 'Designations are managed from your public store profile page. Open My Store Profile and use the designations section.' },
      { q: 'What kind of inventory can I list?', a: 'CigarDex supports brand-level inventory — you can indicate which brands you carry. Live per-cigar inventory is not currently available.' },
      { q: 'How does my store show up in search?', a: 'Once your profile is complete, users searching for cigars near them will see which local stores carry them.' },
      { q: 'Can I have multiple store locations under one account?', a: 'Yes — contact us and we can link multiple locations to your account.' },
      { q: 'Can I change the email on my account?', a: 'Industry account emails are locked after approval to protect your verified status. Contact us if you need to change it.' },
    ],
  },
  brand: {
    icon: '🍂',
    title: 'Brand Representative Dashboard',
    tagline: 'Own your presence on CigarDex.',
    unlocks: [
      { label: 'Verified brand badge', description: 'Shown on your brand page and all associated cigars.' },
      { label: 'Edit your brand About section', description: 'Write and update your brand\'s story directly.' },
      { label: 'Direct timeline access', description: 'Submit timeline entries that go live immediately.' },
      { label: 'Cigar Edits', description: 'Add or edit cigars manufactured by your brands.' },
    ],
    tools: [],
    faq: [
      { q: 'How do I edit my brand\'s About section?', a: 'Go to your brand page — you\'ll see an Edit button on the About tab when you\'re logged in as a verified rep.' },
      { q: 'How do I add cigars to my catalog?', a: 'Click "Add Cigar" on any of your approved brand cards below.' },
      { q: 'Can I add multiple brands to my account?', a: 'Yes — use the "Apply to represent a new brand" link below to request additional brands.' },
      { q: 'My cigar submission went live — what happens next?', a: 'It appears immediately in the catalog. Our admin team will review it and may follow up if anything needs adjustment.' },
      { q: 'Can I change the email on my account?', a: 'Industry account emails are locked after approval. Contact us if you need to change it.' },
    ],
  },
  reviewer: {
    icon: '✍️',
    title: 'Reviewer Dashboard',
    tagline: 'Your reviews, properly credited.',
    unlocks: [
      { label: 'Verified reviewer badge', description: 'Shown on your profile and all your reviews.' },
      { label: 'Industry Review designation', description: 'Your reviews are marked separately from consumer ratings.' },
      { label: 'Full review link', description: 'Attach a URL to any review so readers can find your full write-up on your publication.' },
      { label: 'Publication info on your profile', description: 'Your outlet name, website, and social links shown alongside your reviews.' },
    ],
    tools: [
      { icon: '✍️', label: 'My Reviewer Profile', description: 'Set your publication name, website, and social links.', href: '/reviewer/setup', available: true },
      { icon: '👤', label: 'My Reviews', description: 'View all your reviews on CigarDex.', href: '/profile', available: true },
    ],
    faq: [
      { q: 'How do I add my publication or channel link to my profile?', a: 'Go to My Reviewer Profile in the tools below and fill in your publication name, website, and any social links.' },
      { q: 'How do I attach a link to a specific review?', a: 'When writing or editing a review, you\'ll see a "Full Review URL" field at the top — paste your link there. It shows as "Read full review →" on the review card.' },
      { q: 'Who can see review source links?', a: 'Anyone viewing the cigar page can see and click your full review link. Only verified reviewers can add them.' },
      { q: 'What makes my reviews show as "Industry Review"?', a: 'All reviews from verified reviewer accounts are automatically tagged and distinguished from consumer ratings.' },
      { q: 'Can I change the email on my account?', a: 'Industry account emails are locked after approval. Contact us if you need to change it.' },
    ],
  },
}

export default function ProPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [brandAssociations, setBrandAssociations] = useState<BrandAssociation[]>([])
  const [storeMembership, setStoreMembership] = useState<StoreMembership | null>(null)

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/?signin=true'); return }
    const { data } = await supabase.from('users').select('id, username, role').eq('id', session.user.id).maybeSingle()
    if (!data) { router.push('/'); return }

    const [, storeMembershipData] = await Promise.all([
      fetchBrandAssociations(data.id),
      fetchStoreMembership(data.id),
    ])

    const membership = await resolveIndustryType(data.id, data.role)
    const dashboardRole = membership.industryType

    if (!dashboardRole) { router.push('/'); return }

    setProfile({ ...data, dashboardRole })
    setLoading(false)
  }

  async function fetchBrandAssociations(userId: string) {
    const { data } = await supabase
      .from('brand_rep_brands')
      .select('id, status, brand_accounts(id, name, logo_url)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    const nextAssociations = (data as unknown as BrandAssociation[]) || []
    setBrandAssociations(nextAssociations)
    return nextAssociations
  }

  async function fetchStoreMembership(userId: string) {
    const { data } = await supabase
      .from('store_accounts')
      .select('tier')
      .eq('user_id', userId)
      .maybeSingle()

    if (data) setStoreMembership(data)
    else setStoreMembership(null)

    return data || null
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
      <p style={{ color: '#8b5e2a' }}>Loading your dashboard...</p>
    </div>
  )

  if (!profile) return null
  const content = ROLE_CONTENT[profile.dashboardRole]
  if (!content) return null

  const approvedBrands = brandAssociations.filter(a => a.status === 'approved')
  const pendingBrands = brandAssociations.filter(a => a.status === 'pending')
  const tools = profile.dashboardRole === 'store'
    ? [
      ...content.tools,
      {
        icon: '🎁',
        label: 'Shared Wishlists',
        description: storeMembership?.tier === 'paid' ? 'Look up opted-in customers by real name.' : 'Paid membership feature for in-store gift shopping.',
        href: '/store/shared-wishlists',
        available: storeMembership?.tier === 'paid',
      },
    ]
    : content.tools

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'Georgia, serif' }}>
      <Header />

      <div style={{ background: 'linear-gradient(135deg, #2c1206 0%, #1a0a00 100%)', padding: '48px 32px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <span style={{ fontSize: 40 }}>{content.icon}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h1 style={{ color: '#f5e6c8', fontSize: 26, fontWeight: 700, margin: 0, fontFamily: 'Georgia, serif' }}>{content.title}</h1>
                <span style={{ fontSize: 11, background: '#c4a96a', color: '#1a0a00', padding: '2px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.05em' }}>VERIFIED</span>
              </div>
              <p style={{ color: '#c4a96a', fontSize: 15, margin: 0 }}>{content.tagline}</p>
            </div>
          </div>
          <p style={{ color: '#8b6a4a', fontSize: 13, margin: 0 }}>
            Logged in as <strong style={{ color: '#c4a96a' }}>{profile.username}</strong>
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 64px' }}>

        {/* Membership unlocks */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28, marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a0a00', margin: '0 0 18px', fontFamily: 'Georgia, serif' }}>Your membership includes</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {content.unlocks.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: '#c4a96a', fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✦</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a0a00', margin: '0 0 2px' }}>{item.label}</p>
                  <p style={{ fontSize: 12, color: '#8b5e2a', margin: 0, lineHeight: 1.5 }}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BRAND REP — Your Brands section */}
        {profile.dashboardRole === 'brand' && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a0a00', margin: 0, fontFamily: 'Georgia, serif' }}>Your Brands</h2>
              <a href="/brand-rep/setup" style={{ fontSize: 13, color: '#c4a96a', fontWeight: 600, textDecoration: 'none' }}>
                + Apply to represent a new brand →
              </a>
            </div>
            <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 20px' }}>
              Manage your brands, add cigars, and update timelines.
            </p>

            {brandAssociations.length === 0 ? (
              <div style={{ background: '#f5f0e8', borderRadius: 10, padding: 24, textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: '#8b5e2a', margin: '0 0 12px' }}>No brands yet — request your first brand association.</p>
                <a href="/brand-rep/setup" style={{ fontSize: 13, color: '#c4a96a', fontWeight: 600, textDecoration: 'none' }}>Go to My Brand Profile →</a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Approved brands */}
                {approvedBrands.map(a => {
                  const brand = a.brand_accounts
                  if (!brand) return null
                  return (
                    <div key={a.id} style={{ border: '1px solid #e8ddd0', borderRadius: 12, overflow: 'hidden' }}>
                      {/* Brand header */}
                      <div style={{ background: '#1a0a00', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, background: '#fff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {brand.logo_url
                            ? <img src={brand.logo_url} alt={brand.name} style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }} />
                            : <span style={{ fontSize: 18 }}>🍂</span>}
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#f5e6c8' }}>{brand.name}</span>
                        <span style={{ fontSize: 10, background: '#c4a96a', color: '#1a0a00', padding: '2px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.05em', marginLeft: 'auto' }}>VERIFIED REP</span>
                      </div>
                      {/* Action grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: '#faf8f5' }}>
                        {[
                    { icon: '🍂', label: 'Profile', desc: 'View & edit brand page', href: `/brand/${brand.id}` },
{ icon: '📜', label: 'Timeline', desc: 'Add history & milestones', href: `/brand/${brand.id}` },
                    { icon: '➕', label: 'Add Cigar', desc: 'Add a new cigar', href: `/brand-rep/add-cigar?brand=${brand.id}` },
                          { icon: '📋', label: 'Cigar Catalog', desc: 'View all cigars', href: `/brand/${brand.id}` },
                        ].map((action, i) => (
                          <a key={i} href={action.href} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: '16px 8px', textDecoration: 'none',
                            borderRight: i < 3 ? '1px solid #e8ddd0' : 'none',
                            borderTop: '1px solid #e8ddd0',
                            background: '#fff', transition: 'background 0.1s',
                          }}
                            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = '#f5f0e8'}
                            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = '#fff'}
                          >
                            <span style={{ fontSize: 22, marginBottom: 6 }}>{action.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a0a00', marginBottom: 2 }}>{action.label}</span>
                            <span style={{ fontSize: 11, color: '#8b5e2a', textAlign: 'center', lineHeight: 1.3 }}>{action.desc}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {/* Pending brands */}
                {pendingBrands.length > 0 && (
                  <div style={{ border: '1px solid #ffe0b2', borderRadius: 12, overflow: 'hidden', opacity: 0.7 }}>
                    <div style={{ background: '#fff3e0', padding: '12px 20px' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#e65100', margin: '0 0 4px' }}>⏳ Pending Approval</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {pendingBrands.map(a => (
                          <span key={a.id} style={{ fontSize: 13, color: '#5a3a1a', background: '#fff', border: '1px solid #ffe0b2', padding: '3px 10px', borderRadius: 6 }}>
                            {a.brand_accounts?.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Grayed action grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: '#faf8f5' }}>
                      {['Profile', 'Timeline', 'Add Cigar', 'Cigar Catalog'].map((label, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 8px', borderRight: i < 3 ? '1px solid #e8ddd0' : 'none', borderTop: '1px solid #e8ddd0', background: '#f5f5f5' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#bbb' }}>{label}</span>
                          <span style={{ fontSize: 11, color: '#ccc' }}>Pending approval</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tools — store and reviewer only */}
        {profile.dashboardRole !== 'brand' && tools.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28, marginBottom: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a0a00', margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>Your Tools</h2>
            <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 18px' }}>Features available to your account.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {tools.map((tool, i) => (
                <div key={i} style={{ background: tool.available ? '#faf8f5' : '#f5f5f5', border: `1px solid ${tool.available ? '#d4b896' : '#e8e8e8'}`, borderRadius: 10, padding: '16px 18px', opacity: tool.available ? 1 : 0.6 }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{tool.icon}</div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1a0a00', margin: '0 0 4px' }}>{tool.label}</p>
                  <p style={{ fontSize: 12, color: '#8b5e2a', margin: '0 0 10px', lineHeight: 1.5 }}>{tool.description}</p>
                  {tool.available
                    ? <a href={tool.href} style={{ fontSize: 12, color: '#c4a96a', fontWeight: 600, textDecoration: 'none' }}>Open →</a>
                    : <span style={{ fontSize: 11, color: '#aaa', fontStyle: 'italic' }}>Coming soon</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ddd0', padding: 28, marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a0a00', margin: '0 0 18px', fontFamily: 'Georgia, serif' }}>Frequently Asked Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {content.faq.map((item, i) => (
              <div key={i} style={{ borderBottom: i < content.faq.length - 1 ? '1px solid #f0e8dc' : 'none' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '14px 0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1a0a00', lineHeight: 1.4 }}>{item.q}</span>
                  <span style={{ color: '#c4a96a', fontSize: 18, flexShrink: 0, fontWeight: 300 }}>{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && <p style={{ fontSize: 13, color: '#5a3a1a', lineHeight: 1.7, margin: '0 0 14px', paddingRight: 24 }}>{item.a}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div style={{ background: '#f5f0e8', borderRadius: 12, border: '1px solid #d4b896', padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a0a00', margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>Need help or have a question?</p>
          <p style={{ fontSize: 13, color: '#8b5e2a', margin: '0 0 14px' }}>We review every industry account personally. Reach out anytime.</p>
          <a href="/feedback" style={{ display: 'inline-block', background: '#1a0a00', color: '#f5e6c8', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Contact Us</a>
        </div>

      </div>
      <Footer />
    </div>
  )
}

