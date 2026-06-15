import { CSSProperties, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/ThemeContext'
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
  const { theme } = useTheme()
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
    window.location.href = '/login'
  }

  const containerStyle: CSSProperties = {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
  }

  const sectionTitleStyle: CSSProperties = {
    fontSize: '11px',
    fontWeight: 500,
    color: theme.textTertiary,
    marginBottom: '16px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    fontFamily: "'JetBrains Mono', monospace",
  }

  const messageStyle: CSSProperties = {
    padding: '16px 20px',
    borderRadius: '0px',
    marginBottom: '20px',
    backgroundColor: message.type === 'error' ? theme.errorBg : theme.bgSurfaceDim,
    color: message.type === 'error' ? theme.error : theme.text,
    border: `2px solid ${message.type === 'error' ? theme.errorBorder : theme.border}`,
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
      <header style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{
          width: '100px', height: '100px', backgroundColor: theme.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: '36px', fontWeight: 700,
          color: theme.textInverse, fontFamily: "'Space Grotesk', system-ui, sans-serif", letterSpacing: '0.05em',
        }}>
          {getInitials()}
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: theme.text, marginBottom: '4px', fontFamily: "'Space Grotesk', system-ui, sans-serif", letterSpacing: '-0.02em' }}>
          {profile?.full_name || 'User'}
        </h1>
        <p style={{ fontSize: '16px', color: theme.textSecondary, marginBottom: '4px' }}>{user?.email}</p>
        <p style={{ fontSize: '14px', color: theme.textSecondary, fontWeight: 500 }}>
          Member for {daysSince(profile?.created_at)} days
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
        {[
          { icon: 'devices', value: devices.length, label: 'Devices' },
          { icon: 'report', value: reportsCount, label: 'Reports' },
          { icon: 'verified', value: devices.filter(d => d.status === 'registered').length, label: 'Protected' },
        ].map((stat, i) => (
          <Card key={i} variant="elevated" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: theme.bgSurfaceDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: `1px solid ${theme.border}` }}>
              <span className="material-icons" style={{ fontSize: '24px', color: theme.text }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 600, color: theme.text, marginBottom: '4px', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: theme.textSecondary, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: "'JetBrains Mono', monospace" }}>{stat.label}</div>
          </Card>
        ))}
      </div>

      <h2 style={sectionTitleStyle}>[ Profile Information ]</h2>
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
            <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={{ marginBottom: '20px' }} />
            <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" style={{ marginBottom: '24px' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button type="submit" loading={loading} icon="save" fullWidth>Save Changes</Button>
              <Button variant="ghost" onClick={() => setIsEditing(false)} style={{ border: `2px solid ${theme.border}` }}>Cancel</Button>
            </div>
          </form>
        ) : (
          <>
            {[
              ['Full Name', profile?.full_name || '—'],
              ['Email', user?.email || '—'],
              ['Phone', profile?.phone_number || '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', color: theme.textSecondary, marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                <div style={{ fontSize: '18px', color: theme.text, fontWeight: 600 }}>{value}</div>
              </div>
            ))}
            <Button onClick={() => setIsEditing(true)} icon="edit" fullWidth>Edit Profile</Button>
          </>
        )}
      </Card>

      <h2 style={sectionTitleStyle}>[ Security ]</h2>
      <Card variant="elevated" style={{ marginBottom: '32px', padding: '32px' }}>
        {isChangingPassword ? (
          <form onSubmit={handleChangePassword}>
            <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={{ marginBottom: '20px' }} />
            <Input label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ marginBottom: '24px' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button type="submit" loading={loading} variant="danger" icon="lock" fullWidth>Update Password</Button>
              <Button variant="ghost" onClick={() => setIsChangingPassword(false)} style={{ border: `2px solid ${theme.border}` }}>Cancel</Button>
            </div>
          </form>
        ) : (
          <Button onClick={() => setIsChangingPassword(true)} icon="lock" fullWidth>Change Password</Button>
        )}
      </Card>

      <h2 style={sectionTitleStyle}>[ Account Actions ]</h2>
      <Card variant="elevated" style={{ padding: '32px' }}>
        <p style={{ color: theme.textSecondary, marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
          Sign out of your account. You can always sign back in later.
        </p>
        <Button onClick={handleSignOut} variant="danger" icon="logout" fullWidth>Sign Out</Button>
      </Card>
    </div>
  )
}
