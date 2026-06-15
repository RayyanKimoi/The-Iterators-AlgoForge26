import { CSSProperties, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/ThemeContext'
import { supabase } from '../lib/supabase'
import { Shield, Sun, Moon } from 'lucide-react'

const navItems = [
  { path: '/dashboard', icon: 'home', label: 'Home' },
  { path: '/devices', icon: 'devices', label: 'Devices' },
  { path: '/add-device', icon: 'add_circle', label: 'Add Device' },
  { path: '/chat', icon: 'chat', label: 'Chat', showBadge: true },
  { path: '/alerts', icon: 'notifications', label: 'Alerts' },
  { path: '/profile', icon: 'person', label: 'Profile' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, signOut } = useAuth()
  const { theme, isDark, toggleTheme } = useTheme()
  const [unreadCount, setUnreadCount] = useState(0)

  const sidebarStyle: CSSProperties = {
    width: '240px',
    height: '100vh',
    position: 'sticky',
    top: 0,
    backgroundColor: theme.bgSurface,
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    borderRight: `1px solid ${theme.border}`,
    transition: 'background-color 0.3s ease, border-color 0.3s ease',
    overflow: 'hidden',
  }

  const logoStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '24px',
    padding: '0 12px',
  }

  const navStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  }

  const navItemStyle = (isActive: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '0px',
    backgroundColor: isActive ? theme.primary : 'transparent',
    color: isActive ? theme.textInverse : theme.textSecondary,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.33, 1, 0.68, 1)',
    fontSize: '13px',
    fontWeight: isActive ? 500 : 400,
    fontFamily: "'Inter', system-ui, sans-serif",
    letterSpacing: '0.01em',
    position: 'relative',
  })

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'SP'

  useEffect(() => {
    if (!user?.id) return

    const fetchUnreadCount = async () => {
      try {
        const { data: rooms } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('owner_id', user.id)
          .eq('is_active', true)

        if (!rooms || rooms.length === 0) {
          setUnreadCount(0)
          return
        }

        const roomIds = rooms.map(r => r.id)
        
        const { count } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .in('room_id', roomIds)
          .eq('is_read', false)
          .neq('sender_role', 'owner')

        setUnreadCount(count || 0)
      } catch (error) {
        console.error('Error fetching unread count:', error)
      }
    }

    fetchUnreadCount()

    const channel = supabase
      .channel('unread_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  return (
    <aside style={sidebarStyle}>
      {/* Logo */}
      <div style={logoStyle}>
        <Shield size={20} strokeWidth={1.5} color={theme.text} />
        <span
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontWeight: 600,
            fontSize: '16px',
            letterSpacing: '0.15em',
            color: theme.text,
          }}
        >
          SPORS
        </span>
      </div>

      {/* Section label */}
      <span
        style={{
          display: 'block',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          letterSpacing: '0.2em',
          color: theme.textTertiary,
          textTransform: 'uppercase',
          padding: '0 12px',
          marginBottom: '12px',
        }}
      >
        Navigation
      </span>

      <nav style={navStyle}>
        {navItems.map((item) => (
          <button
            key={item.path}
            style={{
              ...navItemStyle(location.pathname === item.path || location.pathname.startsWith(item.path + '/')),
              border: 'none',
              width: '100%',
              textAlign: 'left',
            }}
            onClick={() => navigate(item.path)}
            onMouseEnter={(e) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              if (!isActive) {
                e.currentTarget.style.backgroundColor = theme.bgSurfaceHover
                e.currentTarget.style.color = theme.text
              }
            }}
            onMouseLeave={(e) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = theme.textSecondary
              }
            }}
          >
            <span className="material-icons" style={{ fontSize: '20px' }}>
              {item.icon}
            </span>
            {item.label}
            {item.showBadge && unreadCount > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  backgroundColor: theme.badgeBg,
                  color: theme.badgeText,
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '0px',
                  minWidth: '18px',
                  textAlign: 'center',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Theme toggle */}
      <div style={{ padding: '0 12px', marginBottom: '16px' }}>
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 0',
            cursor: 'pointer',
            color: theme.textSecondary,
            fontSize: '13px',
            fontFamily: "'Inter', system-ui, sans-serif",
            transition: 'color 0.2s ease',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            width: '100%',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = theme.text }}
          onMouseLeave={(e) => { e.currentTarget.style.color = theme.textSecondary }}
        >
          {isDark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      {/* Bottom profile section */}
      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '0px',
              backgroundColor: theme.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.textInverse,
              fontWeight: 600,
              fontSize: '13px',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 500, color: theme.text, fontSize: '13px' }}>
              {profile?.full_name || 'SPORS User'}
            </div>
            <div style={{ fontSize: '11px', color: theme.textTertiary, fontFamily: "'JetBrains Mono', monospace" }}>
              {profile?.role === 'police' ? 'Officer' : 'User'}
            </div>
          </div>
        </div>
        <button
          style={{
            ...navItemStyle(false),
            color: theme.error,
            border: 'none',
            width: '100%',
            textAlign: 'left',
          }}
          onClick={async (e) => {
            e.preventDefault()
            await signOut()
            window.location.href = '/login'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.errorBg
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <span className="material-icons" style={{ fontSize: '20px' }}>
            logout
          </span>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
