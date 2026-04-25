'use client'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{
      background: '#1a0a00',
      borderTop: '1px solid rgba(196,169,106,0.15)',
      padding: '20px 32px',
      fontFamily: 'Georgia, serif',
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        {/* Left — brand + copyright */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#f5e6c8', fontSize: 15, fontWeight: 700 }}>🍂 CigarDex</span>
          <span style={{ color: '#5a3a1a', fontSize: 13 }}>© {year} CigarDex. All rights reserved.</span>
        </div>

        {/* Right — links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <a href="/industry" style={{ color: '#c4a96a', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
            Industry Professional Signup
          </a>
          <a href="/feedback" style={{ color: '#c4a96a', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
            Feedback
          </a>
          <a href="/privacy" style={{ color: '#8b6a4a', fontSize: 13, textDecoration: 'none' }}>
            Privacy Policy
          </a>
          <a href="/terms" style={{ color: '#8b6a4a', fontSize: 13, textDecoration: 'none' }}>
            Terms
          </a>
        </div>
      </div>
    </footer>
  )
}

