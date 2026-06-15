import { CSSProperties, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/ThemeContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Input } from '../components/Input'

export function ReportBugPage() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const mailtoLink = `mailto:bugs@spors.app?subject=${encodeURIComponent(`[Bug Report] ${title}`)}&body=${encodeURIComponent(`Description:\n${description}\n\nReporter Email: ${email}\n\nPlatform: Web Desktop\nUser Agent: ${navigator.userAgent}`)}`
    window.open(mailtoLink)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div style={{ padding: '32px', maxWidth: '800px' }}>
        <Card style={{ textAlign: 'center', padding: '60px 40px' }}>
          <span className="material-icons" style={{ fontSize: '64px', color: theme.text, marginBottom: '16px' }}>check_circle</span>
          <h2 style={{ color: theme.text, marginBottom: '12px' }}>Thank You!</h2>
          <p style={{ color: theme.textSecondary, marginBottom: '24px' }}>
            Your bug report has been submitted. We'll look into it and get back to you if needed.
          </p>
          <Button onClick={() => navigate('/profile')}>Back to Profile</Button>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <button style={{ background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', padding: '8px' }} onClick={() => navigate(-1)}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: theme.text }}>Report a Bug</h1>
      </header>

      <Card>
        <p style={{ color: theme.textSecondary, marginBottom: '24px' }}>
          Found something that's not working correctly? Let us know and we'll fix it as soon as possible.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Input label="Bug Title" placeholder="Brief description of the issue" value={title} onChange={(e) => setTitle(e.target.value)} required />

          <div>
            <label style={{ fontSize: '11px', fontWeight: 500, color: theme.textSecondary, marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: "'JetBrains Mono', monospace" }}>Description *</label>
            <textarea
              style={{
                width: '100%', minHeight: '150px', padding: '12px 16px',
                backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`,
                color: theme.inputText, fontSize: '14px', resize: 'vertical',
                fontFamily: "'Inter', system-ui, sans-serif", outline: 'none',
              }}
              placeholder="Please describe what happened, what you expected to happen, and steps to reproduce the bug..."
              value={description} onChange={(e) => setDescription(e.target.value)} required
            />
          </div>

          <Input label="Your Email (optional)" type="email" placeholder="For follow-up questions" value={email} onChange={(e) => setEmail(e.target.value)} />

          <Card style={{ backgroundColor: theme.bgSurfaceDim, padding: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span className="material-icons" style={{ color: theme.textSecondary }}>info</span>
              <p style={{ color: theme.textSecondary, fontSize: '14px', margin: 0 }}>
                This will open your email client with a pre-filled bug report. You can add
                screenshots or additional details before sending.
              </p>
            </div>
          </Card>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit">
              <span className="material-icons" style={{ fontSize: '18px' }}>send</span>
              Submit Report
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
