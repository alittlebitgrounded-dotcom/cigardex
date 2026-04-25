'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function TermsPage() {
  const updated = 'March 2026'

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'Georgia, serif', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div style={{ flex: 1, maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a0a00', margin: '0 0 8px' }}>Terms of Service</h1>
        <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 36px' }}>Last updated: {updated}</p>

        {[
          {
            title: 'Using CigarDex',
            content: 'CigarDex is a cigar discovery and review platform. By creating an account you agree to use it honestly and respectfully. You must be of legal smoking age in your jurisdiction to use this service.',
          },
          {
            title: 'Your content',
            content: 'Reviews, edits, and other content you submit belong to you. By submitting content you grant CigarDex a license to display it on the platform. We reserve the right to remove content that is false, abusive, or violates these terms.',
          },
          {
            title: 'Accuracy',
            content: 'CigarDex aims to maintain an accurate cigar database but cannot guarantee that all information is correct. Pricing, availability, and product details may change. Always verify current information with retailers and manufacturers.',
          },
          {
            title: 'Account responsibility',
            content: 'You are responsible for maintaining the security of your account. Do not share your credentials. Accounts found to be submitting false information, spamming, or manipulating the database may be suspended without notice.',
          },
          {
            title: 'Industry accounts',
            content: 'Industry accounts (brands, retailers, distributors) are granted additional privileges on the platform. Misrepresentation during the application process or misuse of these privileges will result in immediate account termination.',
          },
          {
            title: 'No warranty',
            content: 'CigarDex is provided as-is. We make no guarantees about uptime, accuracy, or fitness for any particular purpose. We are not liable for any decisions made based on information found on this platform.',
          },
          {
            title: 'Changes',
            content: 'We may update these terms from time to time. Continued use of CigarDex after changes means you accept the updated terms. We will notify users of significant changes through the app.',
          },
          {
            title: 'Contact',
            content: 'Questions about these terms? Reach us through the feedback page.',
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

