import { useState, useEffect, CSSProperties } from 'react'
import { useTheme } from '../hooks/ThemeContext'
import { Shield, Minus, Square, X, Copy } from 'lucide-react'

// Check if we're running inside Electron
const electronAPI = (window as any).electronAPI as {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (cb: (isMaximized: boolean) => void) => void
} | undefined

export function TitleBar() {
  const { theme, isDark } = useTheme()
  const [isMaximized, setIsMaximized] = useState(false)
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)

  // Don't render the custom title bar if not in Electron
  if (!electronAPI) return null

  useEffect(() => {
    electronAPI!.isMaximized().then(setIsMaximized)
    electronAPI!.onMaximizeChange(setIsMaximized)
  }, [])

  const titleBarStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '36px',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#0A0A0A' : '#FAFAFA',
    borderBottom: `1px solid ${isDark ? '#1E1E1E' : '#E5E5E5'}`,
    WebkitAppRegion: 'drag' as any, // Make the title bar draggable
    userSelect: 'none',
    transition: 'background-color 0.3s ease, border-color 0.3s ease',
  }

  const brandStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingLeft: '14px',
  }

  const titleStyle: CSSProperties = {
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    color: isDark ? '#A0A0A0' : '#737373',
    letterSpacing: '0.06em',
  }

  const controlsStyle: CSSProperties = {
    display: 'flex',
    height: '100%',
    WebkitAppRegion: 'no-drag' as any, // Buttons must be clickable, not draggable
  }

  const btnStyle = (id: string): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '46px',
    height: '100%',
    border: 'none',
    background: hoveredBtn === id
      ? id === 'close'
        ? '#E81123'
        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'
      : 'transparent',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  })

  const iconColor = (id: string) => {
    if (hoveredBtn === 'close' && id === 'close') return '#FFFFFF'
    return isDark ? '#A0A0A0' : '#737373'
  }

  return (
    <div style={titleBarStyle}>
      {/* Brand: Shield icon + App name */}
      <div style={brandStyle}>
        <Shield
          size={14}
          strokeWidth={1.8}
          color={isDark ? '#F0F0F0' : '#000000'}
        />
        <span style={titleStyle}>
          SPORS
        </span>
        <span style={{ ...titleStyle, fontWeight: 400, color: isDark ? '#555' : '#B0B0B0' }}>
          —
        </span>
        <span style={{ ...titleStyle, fontWeight: 400, fontSize: '11px' }}>
          Secure Phone Ownership & Recovery
        </span>
      </div>

      {/* Window controls: Minimize, Maximize/Restore, Close */}
      <div style={controlsStyle}>
        <button
          style={btnStyle('min')}
          onClick={() => electronAPI!.minimize()}
          onMouseEnter={() => setHoveredBtn('min')}
          onMouseLeave={() => setHoveredBtn(null)}
          title="Minimize"
        >
          <Minus size={14} color={iconColor('min')} strokeWidth={1.5} />
        </button>

        <button
          style={btnStyle('max')}
          onClick={() => electronAPI!.maximize()}
          onMouseEnter={() => setHoveredBtn('max')}
          onMouseLeave={() => setHoveredBtn(null)}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized
            ? <Copy size={12} color={iconColor('max')} strokeWidth={1.5} style={{ transform: 'rotate(180deg)' }} />
            : <Square size={12} color={iconColor('max')} strokeWidth={1.5} />
          }
        </button>

        <button
          style={btnStyle('close')}
          onClick={() => electronAPI!.close()}
          onMouseEnter={() => setHoveredBtn('close')}
          onMouseLeave={() => setHoveredBtn(null)}
          title="Close"
        >
          <X size={14} color={iconColor('close')} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
