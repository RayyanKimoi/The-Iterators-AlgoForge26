import { CSSProperties, SelectHTMLAttributes } from 'react'
import { useTheme } from '../hooks/ThemeContext'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  fullWidth?: boolean
  icon?: string
}

export function Select({ label, fullWidth, icon, style, children, ...props }: SelectProps) {
  let theme: ReturnType<typeof useTheme>['theme']
  try {
    theme = useTheme().theme
  } catch {
    theme = {
      inputBg: '#FFFFFF', inputBorder: '#E5E5E5', inputText: '#000000',
      inputPlaceholder: '#A3A3A3', textSecondary: '#737373', text: '#000000',
      bgSurfaceHover: '#F5F5F5', border: '#E5E5E5',
    } as any
  }

  const containerStyle: CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
  }

  const labelStyle: CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 500,
    color: theme.textSecondary,
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    fontFamily: "'JetBrains Mono', monospace",
  }

  const selectWrapperStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
  }

  const selectStyle: CSSProperties = {
    width: '100%',
    padding: icon ? '12px 40px 12px 40px' : '12px 40px 12px 16px',
    backgroundColor: theme.inputBg,
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: '0px',
    color: theme.inputText,
    fontSize: '14px',
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    fontWeight: 500,
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    transition: 'all 0.2s ease',
    backgroundImage: 'none',
    ...style,
  }

  const arrowStyle: CSSProperties = {
    position: 'absolute',
    right: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    fontSize: '18px',
    color: theme.textSecondary,
  }

  const iconStyle: CSSProperties = {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    fontSize: '18px',
    color: theme.textSecondary,
  }

  return (
    <div style={containerStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={selectWrapperStyle}>
        {icon && (
          <span className="material-icons" style={iconStyle}>{icon}</span>
        )}
        <select
          style={selectStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.text
            e.currentTarget.style.boxShadow = `0 0 0 1px ${theme.text}`
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.inputBorder
            e.currentTarget.style.boxShadow = 'none'
          }}
          {...props}
        >
          {children}
        </select>
        <span className="material-icons" style={arrowStyle}>expand_more</span>
      </div>
    </div>
  )
}
