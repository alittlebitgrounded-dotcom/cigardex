'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function PrivacyPage() {
  const updated = 'March 2026'

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'Georgia, serif', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div style={{ flex: 1, maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a0a00', margin: '0 0 8px' }}>Privacy Policy</h1>
        <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 36px' }}>Last updated: {updated}</p>

        {[
          {
            title: 'The short version',
            content: 'We do not sell your data. We do not share your personal information with advertisers. We collect only what we need to run CigarDex, and we use it to make the app work for you.',
          },
          {
            title: 'What we collect',
            content: 'When you create an account we collect your email address and the username you choose. When you write reviews, add cigars to your humidor, or submit edits, that activity is stored so it can be displayed on your profile and used to improve the database. We may collect basic usage data (pages visited, features used) to understand how the app is being used — this is never tied to advertising.',
          },
          {
            title: 'What we do not do',
            content: 'We do not sell your personal information to anyone, ever. We do not share your email address with third parties for marketing purposes. We do not run ads. CigarDex is not and will not be an advertising platform.',
          },
          {
            title: 'Your reviews and public activity',
            content: 'Reviews you write are public by default — they show your username and are visible to anyone browsing the site. Your humidor, stats, and activity feed can be set to private in your profile settings. Your email address is never publicly visible.',
          },
          {
            title: 'Data storage',
            content: 'Your data is stored securely using Supabase, which runs on AWS infrastructure. We use industry-standard security practices including encrypted connections and access controls.',
          },
          {
            title: 'Deleting your account',
            content: 'You can request deletion of your account and associated data by contacting us through the feedback page. We will process deletion requests within 30 days.',
          },
          {
            title: 'Changes to this policy',
            content: 'If we make material changes to how we handle your data, we will notify users via the app. Continued use of CigarDex after changes constitutes acceptance of the updated policy.',
          },
          {
            title: 'Contact',
            content: 'Questions about privacy? Use the feedback page and select "Other" — we will respond personally.',
          },
        ].map(({ title, content }) => (
          <div key={title} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a0a00', margin: '0 0 8px' }}>{title}</h2>
            <p style={{ fontSize: 15, color: '#444', lineHeight: 1.8, margin: 0 }}>{content}</p>
          </div>
        ))}
      </div>
      <Footer />
    </div>
  )
}

