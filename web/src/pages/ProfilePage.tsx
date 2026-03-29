import { CSSProperties, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Colors } from '../lib/colors'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useDevices } from '../hooks/useDevices'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Input } from '../components/Input'

function daysSince(dateIso?: string) {
  if (!dateIso) return 0
  const ms = Date.now() - new Date(dateIso).getTime()
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { profile, user, signOut, refreshProfile } = useAuth()
  const { devices } = useDevices()
  const [reportsCount, setReportsCount] = useState(0)
  
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone_number || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const loadReportsCount = async () => {
      if (!user?.id) return
      const { count } = await supabase
        .from('lost_reports')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id)
      setReportsCount(count ?? 0)
    }
    loadReportsCount()
  }, [user?.id])

  useEffect(() => {
    setFullName(profile?.full_name || '')
    setPhone(profile?.phone_number || '')
  }, [profile])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone_number: phone || null })
      .eq('id', user?.id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      await refreshProfile()
      setIsEditing(false)
    }
    setLoading(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Password changed successfully!' })
      setIsChangingPassword(false)
      setNewPassword('')
      setConfirmPassword('')
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const containerStyle: CSSProperties = {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
  }

  const headerStyle: CSSProperties = {
    textAlign: 'center',
    marginBottom: '48px',
    background: `linear-gradient(135deg, ${Colors.primary}15 0%, transparent 100%)`,
    padding: '48px 32px',
    borderRadius: '24px',
    border: `1px solid ${Colors.primary}20`,
  }

  const avatarContainerStyle: CSSProperties = {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${Colors.primary} 0%, ${Colors.secondary} 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    fontSize: '54px',
    fontWeight: 800,
    color: Colors.onPrimary,
    border: `4px solid ${Colors.surfaceContainer}`,
    boxShadow: `0 8px 24px ${Colors.primary}40`,
    letterSpacing: '1px',
  }

  const nameStyle: CSSProperties = {
    fontSize: '36px',
    fontWeight: 700,
    color: Colors.onSurface,
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  }

  const emailStyle: CSSProperties = {
    fontSize: '16px',
    color: Colors.onSurfaceVariant,
    marginBottom: '4px',
  }

  const memberSinceStyle: CSSProperties = {
    fontSize: '14px',
    color: Colors.onSurfaceVariant,
    fontWeight: 500,
  }

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '48px',
  }

  const statCardStyle: CSSProperties = {
    textAlign: 'center',
    padding: '32px 24px',
  }

  const statIconStyle = (color: string): CSSProperties => ({
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: `linear-gradient(135deg, ${color}30 0%, ${color}10 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    border: `2px solid ${color}40`,
  })

  const statValueStyle: CSSProperties = {
    fontSize: '48px',
    fontWeight: 800,
    color: Colors.onSurface,
    marginBottom: '8px',
    letterSpacing: '-1.5px',
  }

  const statLabelStyle: CSSProperties = {
    fontSize: '15px',
    color: Colors.onSurfaceVariant,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }

  const sectionTitleStyle: CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: Colors.onSurface,
    marginBottom: '24px',
    letterSpacing: '-0.3px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  }

  const messageStyle: CSSProperties = {
    padding: '16px 20px',
    borderRadius: '12px',
    marginBottom: '20px',
    backgroundColor: message.type === 'error' ? `${Colors.error}20` : `${Colors.tertiary}20`,
    color: message.type === 'error' ? Colors.error : Colors.tertiary,
    border: `2px solid ${message.type === 'error' ? Colors.error : Colors.tertiary}40`,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontWeight: 600,
  }

  const getInitials = () => {
    const name = profile?.full_name || 'U'
    const parts = name.split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={avatarContainerStyle}>{getInitials()}</div>
        <h1 style={nameStyle}>{profile?.full_name || 'User'}</h1>
        <p style={emailStyle}>{user?.email}</p>
        <p style={memberSinceStyle}>
          Member for {daysSince(profile?.created_at)} days
        </p>
      </header>

      <div style={gridStyle}>
        <Card variant="elevated" style={statCardStyle}>
          <div style={statIconStyle(Colors.primary)}>
            <span className="material-icons" style={{ fontSize: '32px', color: Colors.primary }}>
              devices
            </span>
          </div>
          <div style={statValueStyle}>{devices.length}</div>
          <div style={statLabelStyle}>Devices</div>
        </Card>

        <Card variant="elevated" style={statCardStyle}>
          <div style={statIconStyle(Colors.error)}>
            <span className="material-icons" style={{ fontSize: '32px', color: Colors.error }}>
              report
            </span>
          </div>
          <div style={statValueStyle}>{reportsCount}</div>
          <div style={statLabelStyle}>Reports</div>
        </Card>

        <Card variant="elevated" style={statCardStyle}>
          <div style={statIconStyle(Colors.secondary)}>
            <span className="material-icons" style={{ fontSize: '32px', color: Colors.secondary }}>
              verified
            </span>
          </div>
          <div style={statValueStyle}>{devices.filter(d => d.status === 'registered').length}</div>
          <div style={statLabelStyle}>Protected</div>
        </Card>
      </div>

      <h2 style={sectionTitleStyle}>
        <span className="material-icons" style={{ fontSize: '28px', color: Colors.primary }}>
          account_circle
        </span>
        Profile Information
      </h2>
      <Card variant="elevated" style={{ marginBottom: '32px', padding: '32px' }}>
        {message.text && (
          <div style={messageStyle}>
            <span className="material-icons">
              {message.type === 'error' ? 'error' : 'check_circle'}
            </span>
            {message.text}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleUpdateProfile}>
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{ marginBottom: '20px' }}
            />
            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              style={{ marginBottom: '24px' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button type="submit" loading={loading} icon="save" fullWidth>
                Save Changes
              </Button>
              <Button variant="ghost" onClick={() => setIsEditing(false)} style={{ border: `2px solid ${Colors.outlineVariant}` }}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', color: Colors.onSurfaceVariant, marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Full Name
              </div>
              <div style={{ fontSize: '18px', color: Colors.onSurface, fontWeight: 600 }}>
                {profile?.full_name || '—'}
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', color: Colors.onSurfaceVariant, marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Email
              </div>
              <div style={{ fontSize: '18px', color: Colors.onSurface, fontWeight: 600 }}>
                {user?.email || '—'}
              </div>
            </div>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '14px', color: Colors.onSurfaceVariant, marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Phone
              </div>
              <div style={{ fontSize: '18px', color: Colors.onSurface, fontWeight: 600 }}>
                {profile?.phone_number || '—'}
              </div>
            </div>
            <Button onClick={() => setIsEditing(true)} icon="edit" fullWidth>
              Edit Profile
            </Button>
          </>
        )}
      </Card>

      <h2 style={sectionTitleStyle}>
        <span className="material-icons" style={{ fontSize: '28px', color: Colors.error }}>
          lock
        </span>
        Security
      </h2>
      <Card variant="elevated" style={{ marginBottom: '32px', padding: '32px' }}>
        {isChangingPassword ? (
          <form onSubmit={handleChangePassword}>
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{ marginBottom: '20px' }}
            />
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ marginBottom: '24px' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button type="submit" loading={loading} variant="danger" icon="lock" fullWidth>
                Update Password
              </Button>
              <Button variant="ghost" onClick={() => setIsChangingPassword(false)} style={{ border: `2px solid ${Colors.outlineVariant}` }}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button onClick={() => setIsChangingPassword(true)} icon="lock" fullWidth>
            Change Password
          </Button>
        )}
      </Card>

      <h2 style={sectionTitleStyle}>
        <span className="material-icons" style={{ fontSize: '28px', color: Colors.error }}>
          power_settings_new
        </span>
        Account Actions
      </h2>
      <Card variant="elevated" style={{ padding: '32px' }}>
        <p style={{ color: Colors.onSurfaceVariant, marginBottom: '24px', fontSize: '15px', lineHeight: '1.6' }}>
          Sign out of your account. You can always sign back in later.
        </p>
        <Button onClick={handleSignOut} variant="danger" icon="logout" fullWidth>
          Sign Out
        </Button>
      </Card>
    </div>
  )
}
