import { CSSProperties, InputHTMLAttributes, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useTheme } from '../hooks/ThemeContext'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  fullWidth?: boolean
  icon?: string
  helperText?: string
}

export function Input({
  label,
  error,
  fullWidth = true,
  icon,
  helperText,
  style,
  className,
  type,
  ...props
}: InputProps) {
  const isPasswordField = type === 'password'
  const [showPassword, setShowPassword] = useState(false)
  
  let theme: any
  try {
    theme = useTheme().theme
  } catch {
    // Fallback for contexts where ThemeProvider isn't available (e.g., login page)
    theme = {
      inputBg: '#fff',
      inputBorder: '#E5E5E5',
      inputText: '#000',
      inputPlaceholder: '#A3A3A3',
      textSecondary: '#737373',
      textTertiary: '#A3A3A3',
      error: '#FF4E4E',
      text: '#000',
      border: '#E5E5E5',
    }
  }

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: fullWidth ? '100%' : 'auto',
  }

  const labelStyle: CSSProperties = {
    fontSize: '11px',
    fontWeight: 500,
    color: theme.textSecondary,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    fontFamily: "'JetBrains Mono', monospace",
  }

  const inputWrapperStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: theme.inputBg,
    borderRadius: '0px',
    border: error ? `1.5px solid ${theme.error}` : `1px solid ${theme.inputBorder}`,
    padding: '12px 16px',
    transition: 'border-color 0.3s ease',
  }

  const inputStyle: CSSProperties = {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: theme.inputText,
    WebkitTextFillColor: theme.inputText,
    fontFamily: "'Inter', system-ui, sans-serif",
    fontWeight: 400,
    ...style,
  }

  const toggleBtnStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    color: theme.textTertiary,
    transition: 'color 0.2s ease',
    flexShrink: 0,
  }

  const errorStyle: CSSProperties = {
    fontSize: '12px',
    color: theme.error,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontFamily: "'JetBrains Mono', monospace",
  }

  const helperTextStyle: CSSProperties = {
    fontSize: '12px',
    color: theme.textTertiary,
  }

  return (
    <div style={containerStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={inputWrapperStyle} className="input-wrapper">
        {icon && (
          <span className="material-icons" style={{ color: theme.textTertiary, fontSize: '20px' }}>
            {icon}
          </span>
        )}
        <input
          style={inputStyle}
          className="custom-input"
          type={isPasswordField && showPassword ? 'text' : type}
          {...props}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            style={toggleBtnStyle}
            onMouseEnter={(e) => { e.currentTarget.style.color = theme.text }}
            onMouseLeave={(e) => { e.currentTarget.style.color = theme.textTertiary }}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
          </button>
        )}
      </div>
      {error && (
        <span style={errorStyle}>
          <span className="material-icons" style={{ fontSize: '14px' }}>error</span>
          {error}
        </span>
      )}
      {helperText && !error && <span style={helperTextStyle}>{helperText}</span>}
    </div>
  )
}
