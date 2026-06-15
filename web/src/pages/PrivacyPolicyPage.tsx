import { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/ThemeContext'
import { Card } from '../components/Card'

export function PrivacyPolicyPage() {
  const navigate = useNavigate()
  const { theme } = useTheme()

  const sectionTitleStyle: CSSProperties = {
    fontSize: '18px', fontWeight: 600, color: theme.text, marginBottom: '12px',
  }

  const textStyle: CSSProperties = {
    color: theme.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '12px',
  }

  const listStyle: CSSProperties = {
    ...textStyle, paddingLeft: '20px', margin: '8px 0',
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <button style={{ background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', padding: '8px' }} onClick={() => navigate(-1)}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: theme.text }}>Privacy Policy</h1>
      </header>

      <p style={{ ...textStyle, marginBottom: '24px' }}>Last updated: March 2026</p>

      {[
        { title: 'Information We Collect', content: <><p style={textStyle}>We collect the following information to provide our services:</p><ul style={listStyle}><li>Account Information: Email, name, phone number</li><li>Device Information: IMEI, serial number, make, model</li><li>Location Data: When reporting lost devices or detecting devices</li><li>Aadhaar Verification: Last 4 digits only, for identity verification</li></ul></> },
        { title: 'How We Use Your Information', content: <ul style={listStyle}><li>To register and verify your devices</li><li>To facilitate lost device recovery</li><li>To enable anonymous communication between users</li><li>To send you notifications about your devices</li><li>To improve our services</li></ul> },
        { title: 'Data Sharing', content: <><p style={textStyle}>We do not sell your personal information. We may share data:</p><ul style={listStyle}><li>With law enforcement when legally required</li><li>Anonymously with other users during device recovery</li><li>With service providers who help us operate SPORS</li></ul></> },
        { title: 'Data Security', content: <p style={textStyle}>We implement industry-standard security measures to protect your data. All communications are encrypted, and sensitive information like IMEI numbers are hashed when possible.</p> },
        { title: 'Your Rights', content: <ul style={listStyle}><li>Access your personal data</li><li>Request correction of inaccurate data</li><li>Request deletion of your account and data</li><li>Opt out of marketing communications</li></ul> },
        { title: 'Cookies and Tracking', content: <p style={textStyle}>We use essential cookies to maintain your session and preferences. We do not use third-party tracking cookies for advertising purposes.</p> },
        { title: 'Contact Us', content: <><p style={textStyle}>If you have questions about this Privacy Policy or your data, please contact us at:</p><p style={{ ...textStyle, color: theme.text }}>privacy@spors.app</p></> },
      ].map((section, i) => (
        <Card key={i} style={{ marginBottom: '24px' }}>
          <h3 style={sectionTitleStyle}>{section.title}</h3>
          {section.content}
        </Card>
      ))}
    </div>
  )
}
