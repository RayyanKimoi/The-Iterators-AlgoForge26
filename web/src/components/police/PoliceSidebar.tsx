import { CSSProperties, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/ThemeContext'
import { supabase } from '../../lib/supabase'
import { Shield, Sun, Moon } from 'lucide-react'

const policeNavItems = [
  { path: '/police', icon: 'dashboard', label: 'Dashboard', exact: true },
  { path: '/police/chats', icon: 'forum', label: 'All Chats' },
  { path: '/police/devices', icon: 'devices', label: 'Lost Devices' },
  { path: '/police/reports', icon: 'description', label: 'Reports' },
  { path: '/police/search', icon: 'search', label: 'Search' },
  { path: '/police/analytics', icon: 'analytics', label: 'Analytics' },
]

export function PoliceSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, signOut } = useAuth()
  const { theme, isDark, toggleTheme } = useTheme()
  const [activeChatsCount, setActiveChatsCount] = useState(0)

  useEffect(() => {
    const fetchActiveChats = async () => {
      const { count } = await supabase
        .from('chat_rooms')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      
      setActiveChatsCount(count || 0)
    }

    fetchActiveChats()
    const interval = setInterval(fetchActiveChats, 30000)
    return () => clearInterval(interval)
  }, [])

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
  })

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'PO'

  return (
    <aside style={sidebarStyle}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 12px', marginBottom: '8px' }}>
        <Shield size={20} strokeWidth={1.5} color={theme.text} />
        <span style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 600, fontSize: '16px', letterSpacing: '0.15em', color: theme.text }}>
          SPORS
        </span>
      </div>
      <span style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', color: theme.textTertiary, textTransform: 'uppercase', padding: '0 12px', marginBottom: '32px' }}>
        Police Portal
      </span>

      {/* Section label */}
      <span style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: theme.textTertiary, textTransform: 'uppercase', padding: '0 12px', marginBottom: '12px' }}>
        Navigation
      </span>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        {policeNavItems.map((item) => {
          const isActive = item.exact 
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path)

          return (
            <button
              key={item.path}
              style={{
                ...navItemStyle(isActive),
                border: 'none',
                width: '100%',
                textAlign: 'left',
                backgroundColor: isActive ? theme.primary : 'transparent',
              }}
              onClick={() => navigate(item.path)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = theme.bgSurfaceHover
                  e.currentTarget.style.color = theme.text
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = theme.textSecondary
                }
              }}
            >
              <span className="material-icons" style={{ fontSize: '20px' }}>
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.path === '/police/chats' && activeChatsCount > 0 && (
                <span style={{
                  backgroundColor: theme.badgeBg,
                  color: theme.badgeText,
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {activeChatsCount}
                </span>
              )}
            </button>
          )
        })}
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

      {/* Profile */}
      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', marginBottom: '8px' }}>
          <div style={{
            width: '36px', height: '36px', backgroundColor: theme.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.textInverse, fontWeight: 600, fontSize: '13px',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 500, color: theme.text, fontSize: '13px' }}>
              {profile?.full_name || 'Officer'}
            </div>
            <div style={{ fontSize: '11px', color: theme.textTertiary, fontFamily: "'JetBrains Mono', monospace" }}>
              Police Officer
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
            backgroundColor: 'transparent',
          }}
          onClick={async (e) => {
            e.preventDefault()
            await signOut()
            window.location.href = '/login'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.errorBg }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <span className="material-icons" style={{ fontSize: '20px' }}>logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
