import { useState, useEffect } from 'react'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { MagneticButton } from './MagneticButton'
import { Shield } from 'lucide-react'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Statistics', href: '#stats' },
  { label: 'About', href: '#about' },
]

export function Navbar() {
  const navigate = useNavigate()
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 50)
  })

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const handleNavClick = (href: string) => {
    setMenuOpen(false)
    const el = document.querySelector(href)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Colors change based on scroll — white on hero, black after scroll
  const textColor = '#000'
  const textColorMuted = '#525252'
  const hamburgerColor = '#000'

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1] }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 48px',
          height: scrolled ? '64px' : '88px',
          backgroundColor: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid #E5E5E5' : '1px solid transparent',
          transition: 'all 0.4s ease',
        }}
      >
        {/* Logo */}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
        >
          <Shield style={{ width: '24px', height: '24px', color: textColor, transition: 'color 0.4s ease' }} strokeWidth={1.5} />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '18px',
              letterSpacing: '0.15em',
              color: textColor,
              transition: 'color 0.4s ease',
            }}
          >
            SPORS
          </span>
        </a>

        {/* Desktop Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }} className="hidden md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => { e.preventDefault(); handleNavClick(link.href) }}
              className="nav-link"
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 400,
                fontSize: '14px',
                letterSpacing: '0.04em',
                color: textColorMuted,
                textDecoration: 'none',
                transition: 'color 0.3s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = textColor }}
              onMouseLeave={(e) => { e.currentTarget.style.color = textColorMuted }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:block">
          <MagneticButton variant="rounded" onClick={() => navigate('/login')}>
            <span>Get Started</span>
          </MagneticButton>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          className="md:hidden"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            padding: '8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <motion.span
            style={{ display: 'block', width: '24px', height: '1.5px', backgroundColor: hamburgerColor, transformOrigin: 'center', transition: 'background-color 0.4s ease' }}
            animate={menuOpen ? { rotate: 45, y: 7.5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.3 }}
          />
          <motion.span
            style={{ display: 'block', width: '24px', height: '1.5px', backgroundColor: hamburgerColor, transition: 'background-color 0.4s ease' }}
            animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
          <motion.span
            style={{ display: 'block', width: '24px', height: '1.5px', backgroundColor: hamburgerColor, transformOrigin: 'center', transition: 'background-color 0.4s ease' }}
            animate={menuOpen ? { rotate: -45, y: -7.5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.3 }}
          />
        </button>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <motion.div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
        }}
        className="md:hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={menuOpen ? { opacity: 1, y: 0, pointerEvents: 'auto' as const } : { opacity: 0, y: -20, pointerEvents: 'none' as const }}
        transition={{ duration: 0.4, ease: [0.77, 0, 0.175, 1] }}
      >
        {navLinks.map((link, i) => (
          <motion.a
            key={link.label}
            href={link.href}
            onClick={(e) => { e.preventDefault(); handleNavClick(link.href) }}
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize: '32px',
              letterSpacing: '0.08em',
              color: '#000',
              textDecoration: 'none',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={menuOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: i * 0.1 + 0.2, duration: 0.4 }}
          >
            {link.label}
          </motion.a>
        ))}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={menuOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <MagneticButton variant="rounded" onClick={() => { setMenuOpen(false); navigate('/login') }}>
            <span>Get Started</span>
          </MagneticButton>
        </motion.div>
      </motion.div>
    </>
  )
}
