import { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/ThemeContext'
import { Card } from '../components/Card'

export function AboutPage() {
  const navigate = useNavigate()
  const { theme } = useTheme()

  const sectionTitleStyle: CSSProperties = {
    fontSize: '18px', fontWeight: 600, color: theme.text,
    marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px',
  }

  const textStyle: CSSProperties = {
    color: theme.textSecondary, fontSize: '14px', lineHeight: 1.6,
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
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: theme.text }}>About SPORS</h1>
      </header>

      <Card style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
          <span className="material-icons" style={{ fontSize: '48px', color: theme.text }}>security</span>
          <span style={{ fontSize: '32px', fontWeight: 700, color: theme.text }}>SPORS</span>
        </div>
        <p style={{ color: theme.textSecondary, marginBottom: '8px' }}>Secure Phone Ownership & Recovery System</p>
        <p style={{ color: theme.textTertiary, fontSize: '14px' }}>Version 1.0.0</p>
      </Card>

      {[
        { icon: 'info', title: 'What is SPORS?', content: <p style={textStyle}>SPORS is a comprehensive device protection and recovery system that uses Bluetooth Low Energy (BLE) technology to help locate lost or stolen devices through a community-powered network of users.</p> },
        { icon: 'star', title: 'Key Features', content: <ul style={listStyle}><li>Register your devices with IMEI and serial numbers</li><li>Report devices as lost with detailed incident information</li><li>BLE-based passive scanning network (mobile app only)</li><li>Anonymous chat system for device recovery coordination</li><li>Real-time location alerts when lost devices are detected</li><li>Aadhaar verification for enhanced trust</li></ul> },
        { icon: 'help', title: 'How It Works', content: <ol style={listStyle}><li>Register your device with its IMEI and details</li><li>If your device is lost, mark it as lost in the app</li><li>Other SPORS users' phones passively scan for your device</li><li>When found, you receive an alert with location info</li><li>Use anonymous chat to coordinate safe recovery</li></ol> },
        { icon: 'computer', title: 'Desktop Version', content: <p style={textStyle}>This desktop version allows you to manage your devices and account without the BLE scanning capabilities. For full functionality including device detection and broadcasting, please use the SPORS mobile app.</p> },
      ].map((section, i) => (
        <Card key={i} style={{ marginBottom: '24px' }}>
          <h3 style={sectionTitleStyle}>
            <span className="material-icons" style={{ color: theme.text }}>{section.icon}</span>
            {section.title}
          </h3>
          {section.content}
        </Card>
      ))}

      <Card style={{ backgroundColor: theme.bgSurfaceDim, borderLeft: `4px solid ${theme.textSecondary}` }}>
        <h3 style={{ ...sectionTitleStyle, color: theme.textSecondary }}>
          <span className="material-icons">warning</span>
          Disclaimer
        </h3>
        <p style={textStyle}>
          SPORS is a device tracking aid and does not guarantee device recovery. Always report
          theft to local authorities. Use caution when meeting to recover devices. Never meet
          alone in isolated locations.
        </p>
      </Card>
    </div>
  )
}
