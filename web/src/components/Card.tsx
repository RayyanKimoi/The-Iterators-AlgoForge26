import { CSSProperties, ReactNode, HTMLAttributes } from 'react'
import { useTheme } from '../hooks/ThemeContext'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  title?: string
  subtitle?: string
  onClick?: () => void
  style?: CSSProperties
  padding?: string
  variant?: 'default' | 'elevated' | 'outlined'
  hoverable?: boolean
}

export function Card({ 
  children, 
  title, 
  subtitle, 
  onClick, 
  style, 
  padding = '24px',
  variant = 'default',
  hoverable = true,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: CardProps) {
  const { theme } = useTheme()

  const getVariantStyles = (): CSSProperties => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: theme.cardBg,
          boxShadow: theme.cardShadow,
          border: `1px solid ${theme.cardBorder}`,
        }
      case 'outlined':
        return {
          backgroundColor: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
        }
      default:
        return {
          backgroundColor: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
        }
    }
  }

  const cardStyle: CSSProperties = {
    borderRadius: '0px',
    padding,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.3s cubic-bezier(0.33, 1, 0.68, 1)',
    ...getVariantStyles(),
    ...style,
  }

  const titleStyle: CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: theme.text,
    marginBottom: subtitle ? '4px' : '16px',
    letterSpacing: '-0.01em',
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
  }

  const subtitleStyle: CSSProperties = {
    fontSize: '13px',
    color: theme.textSecondary,
    marginBottom: '16px',
    lineHeight: '1.6',
  }

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hoverable) {
          e.currentTarget.style.borderColor = theme.cardHoverBorder
          if (onClick) {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = theme.cardHoverShadow
          }
        }
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        if (hoverable) {
          e.currentTarget.style.borderColor = theme.cardBorder
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = getVariantStyles().boxShadow || 'none'
        }
        onMouseLeave?.(e)
      }}
      {...rest}
    >
      {title && <h3 style={titleStyle}>{title}</h3>}
      {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
      {children}
    </div>
  )
}
