import { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/ThemeContext'
import { useDevices } from '../hooks/useDevices'
import { Card } from '../components/Card'
import { Button } from '../components/Button'

export function HomePage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { theme } = useTheme()
  const { devices, loading } = useDevices()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const totalDevices = devices.length
  const lostDevices = devices.filter((d) => d.status === 'lost' || d.status === 'stolen').length
  const safeDevices = devices.filter((d) => d.status === 'registered').length
  const recoveredDevices = devices.filter((d) => d.status === 'recovered' || d.status === 'found').length

  const containerStyle: CSSProperties = {
    padding: '48px',
    maxWidth: '1200px',
    margin: '0 auto',
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={{ marginBottom: '48px' }}>
        <span style={{
          display: 'block',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          letterSpacing: '0.2em',
          color: theme.textTertiary,
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          [ Dashboard ]
        </span>
        <h1 style={{
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 600,
          color: theme.text,
          marginBottom: '8px',
          letterSpacing: '-0.02em',
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
        }}>
          {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p style={{ fontSize: '14px', color: theme.textSecondary, lineHeight: 1.6 }}>
          Your device security overview
        </p>
      </header>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', marginBottom: '48px', border: `1px solid ${theme.border}`, backgroundColor: theme.border }}>
        {[
          { value: loading ? '—' : totalDevices, label: 'Total Devices', icon: 'devices' },
          { value: loading ? '—' : safeDevices, label: 'Protected', icon: 'verified_user' },
          ...(lostDevices > 0 ? [{ value: lostDevices, label: 'At Risk', icon: 'warning' }] : []),
          ...(recoveredDevices > 0 ? [{ value: recoveredDevices, label: 'Recovered', icon: 'check_circle' }] : []),
        ].map((stat, i) => (
          <div key={i} style={{ backgroundColor: theme.bgSurface, padding: '28px 24px', display: 'flex', alignItems: 'center', gap: '16px', transition: 'background-color 0.3s ease' }}>
            <span className="material-icons" style={{ fontSize: '24px', color: stat.label === 'At Risk' ? theme.error : theme.textTertiary }}>
              {stat.icon}
            </span>
            <div>
              <div style={{
                fontSize: '32px',
                fontWeight: 600,
                color: stat.label === 'At Risk' ? theme.error : theme.text,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1,
                marginBottom: '4px',
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '11px',
                color: theme.textTertiary,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}>
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '48px' }}>
        <span style={{
          display: 'block',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          letterSpacing: '0.2em',
          color: theme.textTertiary,
          textTransform: 'uppercase',
          marginBottom: '20px',
        }}>
          Quick Actions
        </span>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', border: `1px solid ${theme.border}`, backgroundColor: theme.border }}>
          {[
            { icon: 'add_circle', title: 'Register Device', desc: 'Add a new device to protect', path: '/add-device' },
            { icon: 'smartphone', title: 'My Devices', desc: 'View and manage all devices', path: '/devices' },
            { icon: 'chat', title: 'Messages', desc: 'Chat with device finders', path: '/chat' },
          ].map((action, i) => (
            <div
              key={i}
              onClick={() => navigate(action.path)}
              style={{
                backgroundColor: theme.bgSurface,
                padding: '28px 24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.bgSurfaceHover }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.bgSurface }}
            >
              <span className="material-icons" style={{ fontSize: '24px', color: theme.text }}>
                {action.icon}
              </span>
              <div>
                <h3 style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 600, fontSize: '16px', color: theme.text, marginBottom: '4px' }}>
                  {action.title}
                </h3>
                <p style={{ fontSize: '13px', color: theme.textSecondary, lineHeight: 1.5 }}>
                  {action.desc}
                </p>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: theme.text, marginTop: 'auto' }}>→</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Banner */}
      {lostDevices > 0 && (
        <Card style={{ borderLeft: `3px solid ${theme.error}`, padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
            <span className="material-icons" style={{ fontSize: '24px', color: theme.error, marginTop: '2px' }}>warning</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: '18px', fontWeight: 600, color: theme.text, marginBottom: '8px' }}>
                Devices Requiring Attention
              </h3>
              <p style={{ color: theme.textSecondary, marginBottom: '16px', fontSize: '14px', lineHeight: 1.6 }}>
                You have {lostDevices} device{lostDevices > 1 ? 's' : ''} marked as lost or stolen. 
                Our network is actively scanning for {lostDevices > 1 ? 'them' : 'it'}.
              </p>
              <Button variant="outline" onClick={() => navigate('/devices')} size="small">
                View Lost Devices →
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {totalDevices === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '64px 0', border: `1px solid ${theme.border}`, backgroundColor: theme.bgSurface }}>
          <span className="material-icons" style={{ fontSize: '48px', color: theme.border, display: 'block', marginBottom: '20px' }}>
            security
          </span>
          <h2 style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: '24px', fontWeight: 600, color: theme.text, marginBottom: '8px' }}>
            Get Started with SPORS
          </h2>
          <p style={{ fontSize: '14px', color: theme.textSecondary, marginBottom: '28px', maxWidth: '400px', margin: '0 auto 28px', lineHeight: 1.6 }}>
            Register your first device to begin tracking and securing your electronics.
          </p>
          <Button onClick={() => navigate('/add-device')}>
            Register Your First Device
          </Button>
        </div>
      )}
    </div>
  )
}
