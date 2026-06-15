import { CSSProperties } from 'react'
import { useTheme } from '../hooks/ThemeContext'

type ButtonProps = {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit'
  style?: CSSProperties
  icon?: string
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  type = 'button',
  style,
  icon,
}: ButtonProps) {
  const { theme } = useTheme()

  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: 'none',
    borderRadius: '0px',
    fontWeight: 500,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.4 : 1,
    transition: 'all 0.3s cubic-bezier(0.33, 1, 0.68, 1)',
    width: fullWidth ? '100%' : 'auto',
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    fontSize: '13px',
    position: 'relative',
    overflow: 'hidden',
  }

  const sizeStyles: Record<string, CSSProperties> = {
    small: { padding: '10px 20px', fontSize: '12px' },
    medium: { padding: '14px 32px', fontSize: '13px' },
    large: { padding: '16px 40px', fontSize: '14px' },
  }

  // Primary is now outline-style (transparent bg, border) with fill-on-hover
  const variantStyles: Record<string, CSSProperties> = {
    primary: {
      backgroundColor: 'transparent',
      color: theme.text,
      border: `1.5px solid ${theme.text}`,
    },
    secondary: {
      backgroundColor: theme.bgSurfaceDim,
      color: theme.text,
      border: `1.5px solid ${theme.border}`,
    },
    outline: {
      backgroundColor: 'transparent',
      color: theme.text,
      border: `1.5px solid ${theme.text}`,
    },
    danger: {
      backgroundColor: 'transparent',
      color: theme.error,
      border: `1.5px solid ${theme.error}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.text,
      border: '1.5px solid transparent',
    },
  }

  // All actionable variants get the slide-fill animation
  const variantClass = variant === 'danger' ? 'app-btn app-btn--danger'
    : variant === 'secondary' ? 'app-btn app-btn--secondary'
    : variant === 'ghost' ? ''
    : 'app-btn app-btn--outline'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={variantClass}
      style={{ ...baseStyle, ...sizeStyles[size], ...variantStyles[variant], ...style }}
    >
      {loading ? (
        <span className="material-icons" style={{ animation: 'spin 1s linear infinite', fontSize: '18px', position: 'relative', zIndex: 1 }}>
          sync
        </span>
      ) : icon ? (
        <span className="material-icons" style={{ fontSize: '18px', position: 'relative', zIndex: 1 }}>
          {icon}
        </span>
      ) : null}
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </button>
  )
}
