import { CSSProperties, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/ThemeContext'
import { supabase } from '../lib/supabase'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Shield, ArrowLeft } from 'lucide-react'
import { WireframeMesh } from '../components/landing/WireframeMesh'
import { CustomCursor } from '../components/landing/CustomCursor'
import { InteractiveGrid } from '../components/landing/InteractiveGrid'

export function LoginPage() {
  const navigate = useNavigate()
  const { theme, isDark } = useTheme()
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [isPoliceLogin, setIsPoliceLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Magnetic button effect
  const btnRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = btnRef.current
    if (!el) return
    const btn = el.querySelector('button')
    if (!btn) return

    const handleMove = (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`
    }
    const handleLeave = () => {
      btn.style.transform = 'translate(0, 0)'
      btn.style.transition = 'transform 0.4s cubic-bezier(0.33, 1, 0.68, 1)'
      setTimeout(() => { btn.style.transition = '' }, 400)
    }

    el.addEventListener('mousemove', handleMove)
    el.addEventListener('mouseleave', handleLeave)
    return () => {
      el.removeEventListener('mousemove', handleMove)
      el.removeEventListener('mouseleave', handleLeave)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName)
        if (error) throw error
        setError('Account created! Please check your email to verify.')
        setIsSignUp(false)
      } else {
        const { error } = await signIn(email, password)
        if (error) throw error
        
        if (isPoliceLogin) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .single()
          
          if (profile?.role !== 'police' && profile?.role !== 'admin') {
            await supabase.auth.signOut()
            throw new Error('Access denied. Police credentials required.')
          }
          navigate('/police')
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .single()
          
          if (profile?.role === 'police' || profile?.role === 'admin') {
            setError('Please use the Police login option.')
            await supabase.auth.signOut()
            return
          }
          navigate('/dashboard')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const containerStyle: CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backgroundColor: theme.bg,
    position: 'relative',
    overflow: 'hidden',
    transition: 'background-color 0.3s ease',
  }

  const cardStyle: CSSProperties = {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: theme.bgSurface,
    border: `1px solid ${theme.border}`,
    padding: '48px 40px',
    position: 'relative',
    zIndex: 5,
    transition: 'background-color 0.3s ease, border-color 0.3s ease',
  }

  return (
    <>
      <CustomCursor />
      <div className="custom-cursor-area" style={containerStyle}>

      {/* Wireframe mesh background — same as landing page */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <WireframeMesh variant={isDark ? "light" : "dark"} />
      </div>

      {/* Interactive grid — cells darken on cursor hover */}
      <InteractiveGrid />

      {/* Decorative pixel block — top right */}
      <div style={{ position: 'absolute', top: '48px', right: '48px', display: 'flex', gap: '3px', flexWrap: 'wrap', width: '85px', opacity: 0.4, zIndex: 2 }}>
        {[1,0,1,1,0, 1,1,0,1,0, 0,1,1,0,1, 1,0,0,1,1, 0,1,1,1,0].map((f, i) => (
          <div key={i} style={{ width: '12px', height: '12px', backgroundColor: f ? theme.text : 'transparent', border: `1px solid ${theme.border}` }} />
        ))}
      </div>

      {/* Decorative barcode — bottom left */}
      <div style={{ position: 'absolute', bottom: '48px', left: '48px', display: 'flex', gap: '2px', alignItems: 'flex-end', height: '60px', opacity: 0.3, zIndex: 2 }}>
        {Array.from({ length: 16 }, (_, i) => 15 + Math.sin(i * 0.6) * 25 + Math.cos(i * 0.3) * 12).map((h, i) => (
          <div key={i} style={{ width: '2.5px', height: `${h}px`, backgroundColor: theme.text }} />
        ))}
      </div>

      {/* Crosshair — bottom right */}
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ position: 'absolute', bottom: '48px', right: '48px', zIndex: 2, opacity: 0.15 }}>
        <line x1="22" y1="0" x2="22" y2="15" stroke={theme.text} strokeWidth="1" />
        <line x1="22" y1="29" x2="22" y2="44" stroke={theme.text} strokeWidth="1" />
        <line x1="0" y1="22" x2="15" y2="22" stroke={theme.text} strokeWidth="1" />
        <line x1="29" y1="22" x2="44" y2="22" stroke={theme.text} strokeWidth="1" />
        <circle cx="22" cy="22" r="8" stroke={theme.text} strokeWidth="1" fill="none" />
      </svg>

      {/* Back button — top left, spaced away from decorations */}
      <div
        style={{
          position: 'absolute',
          top: '32px',
          left: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          zIndex: 10,
          padding: '8px 14px',
          border: `1px solid ${theme.border}`,
          backgroundColor: theme.bgSurface,
          transition: 'all 0.2s ease',
        }}
        onClick={() => navigate('/')}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.text }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border }}
      >
        <ArrowLeft size={14} color={theme.text} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: theme.text, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Back
        </span>
      </div>

      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
          <Shield size={24} strokeWidth={1.5} color={theme.text} />
          <span style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 700, fontSize: '24px', color: theme.text, letterSpacing: '0.1em' }}>
            SPORS
          </span>
        </div>

        {/* Section label */}
        <p style={{ textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: theme.textTertiary, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '36px' }}>
          {isSignUp ? '[ Create Account ]' : isPoliceLogin ? '[ Law Enforcement ]' : '[ Authentication ]'}
        </p>

        {/* Civilian / Police toggle */}
        {!isSignUp && (
          <div style={{ display: 'flex', marginBottom: '28px', border: `1px solid ${theme.border}` }}>
            <button
              type="button"
              onClick={() => setIsPoliceLogin(false)}
              style={{
                flex: 1, padding: '10px', border: 'none',
                backgroundColor: !isPoliceLogin ? theme.text : theme.bgSurface,
                color: !isPoliceLogin ? theme.bgSurface : theme.textSecondary,
                fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: '12px',
                fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
            >
              Civilian
            </button>
            <button
              type="button"
              onClick={() => setIsPoliceLogin(true)}
              style={{
                flex: 1, padding: '10px', border: 'none', borderLeft: `1px solid ${theme.border}`,
                backgroundColor: isPoliceLogin ? theme.text : theme.bgSurface,
                color: isPoliceLogin ? theme.bgSurface : theme.textSecondary,
                fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: '12px',
                fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
            >
              Police
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ backgroundColor: theme.errorBg, color: theme.error, padding: '10px 14px', marginBottom: '20px', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace", border: `1px solid ${theme.error}` }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isSignUp && (
            <Input
              label="Full Name"
              icon="person"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
          )}

          <Input
            label="Email"
            icon="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            icon="lock"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />

          {/* Magnetic button wrapper */}
          <div ref={btnRef} style={{ padding: '8px' }}>
            <Button type="submit" variant="outline" fullWidth loading={loading} size="large">
              {isSignUp ? 'Create Account' : isPoliceLogin ? 'Police Sign In' : 'Sign In'}
            </Button>
          </div>
        </form>

        {/* Toggle */}
        <p style={{ textAlign: 'center', marginTop: '28px', color: theme.textSecondary, fontSize: '13px' }}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              setIsSignUp(!isSignUp)
              setError('')
            }}
            style={{ color: theme.text, fontWeight: 600, textDecoration: 'none', borderBottom: `1px solid ${theme.text}` }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </a>
        </p>
      </div>
    </div>
    </>
  )
}
