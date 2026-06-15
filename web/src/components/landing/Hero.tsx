import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { MagneticButton } from './MagneticButton'
import { WireframeMesh } from './WireframeMesh'
import { ArrowRight } from 'lucide-react'

export function Hero() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const scanLineRef = useRef<HTMLDivElement>(null)
  const word1Ref = useRef<HTMLDivElement>(null)
  const word2Ref = useRef<HTMLDivElement>(null)
  const word3Ref = useRef<HTMLDivElement>(null)
  const subtitleRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const btn1Ref = useRef<HTMLDivElement>(null)
  const btn2Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scanLine = scanLineRef.current
    const words = [word1Ref.current, word2Ref.current, word3Ref.current]
    const subtitle = subtitleRef.current
    const btn1 = btn1Ref.current
    const btn2 = btn2Ref.current
    if (!scanLine || words.some(w => !w) || !subtitle || !btn1 || !btn2) return

    // Set initial states
    words.forEach(w => {
      if (!w) return
      gsap.set(w, { clipPath: 'inset(0 100% 0 0)' })
    })
    gsap.set(subtitle, { opacity: 0 })
    gsap.set(btn1, { opacity: 0, y: 16 })
    gsap.set(btn2, { opacity: 0, y: 16 })
    gsap.set(scanLine, { top: '-2px', opacity: 1 })

    const tl = gsap.timeline({ delay: 0.3 })

    // ─── PHASE 1: Scan line sweeps top to bottom (800ms) ───
    tl.to(scanLine, {
      top: '100vh',
      duration: 0.8,
      ease: 'none',
    })

    // ─── PHASE 2: Word reveals triggered as scan line passes ───
    // Word 1 — PROTECT. triggers around ~35% of viewport (scan at 280ms)
    tl.to(words[0], {
      clipPath: 'inset(0 0% 0 0)',
      duration: 0.4,
      ease: 'power2.out',
    }, 0.28)

    // Glitch artifact on word 1
    tl.to(words[0], {
      x: 4,
      duration: 0.06,
    }, 0.28)
    tl.to(words[0], {
      x: 0,
      duration: 0.06,
    }, 0.34)

    // Word 2 — TRACK. triggers around ~48% of viewport (scan at 384ms)
    tl.to(words[1], {
      clipPath: 'inset(0 0% 0 0)',
      duration: 0.4,
      ease: 'power2.out',
    }, 0.43)

    // Glitch artifact on word 2
    tl.to(words[1], {
      x: -3,
      duration: 0.06,
    }, 0.43)
    tl.to(words[1], {
      x: 0,
      duration: 0.06,
    }, 0.49)

    // Word 3 — RECOVER. triggers around ~60% of viewport (scan at 480ms)
    tl.to(words[2], {
      clipPath: 'inset(0 0% 0 0)',
      duration: 0.4,
      ease: 'power2.out',
    }, 0.58)

    // Glitch artifact on word 3
    tl.to(words[2], {
      x: 3,
      duration: 0.06,
    }, 0.58)
    tl.to(words[2], {
      x: 0,
      duration: 0.06,
    }, 0.64)

    // ─── PHASE 3: Scan line disappears ───
    tl.to(scanLine, {
      opacity: 0,
      duration: 0.15,
    }, 0.8)

    // ─── PHASE 4: Subtitle fades in (after all words ~1.2s) ───
    tl.to(subtitle, {
      opacity: 1,
      duration: 0.5,
      ease: 'power2.out',
    }, 1.2)

    // ─── PHASE 5: Buttons slide up staggered ───
    tl.to(btn1, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power3.out',
    }, 1.5)
    tl.to(btn2, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power3.out',
    }, 1.58) // 80ms stagger

    return () => { tl.kill() }
  }, [])

  const subtitle = 'Crowdsourced device recovery powered by the community'
  const squarePattern = [1,1,0,1, 1,0,1,1, 0,1,1,0, 1,1,1,0, 1,0,1,1, 0,1,0,1]
  const barHeights = [35,42,28,55,38,62,30,48,25,58,33,45,52,28,40,55,32,60,38,44]

  return (
    <section
      ref={containerRef}
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: '#fff',
      }}
    >
      <WireframeMesh variant="dark" />

      {/* ═══ SCAN LINE — sweeps top to bottom ═══ */}
      <div
        ref={scanLineRef}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '1px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 30,
          opacity: 0,
          boxShadow: '0 0 8px rgba(0, 0, 0, 0.1), 0 0 24px rgba(0, 0, 0, 0.05)',
        }}
      />

      {/* Corner labels */}
      <motion.div
        style={{ position: 'absolute', top: '80px', left: '48px', zIndex: 10 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0, duration: 0.8 }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.2em', color: '#A3A3A3' }}>
          CYBERSECURITY
        </span>
      </motion.div>

      <motion.div
        style={{ position: 'absolute', top: '80px', right: '48px', zIndex: 10 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.8 }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.2em', color: '#A3A3A3' }}>
          EST. 2026
        </span>
      </motion.div>

      {/* Barcode — left */}
      <motion.div
        style={{
          position: 'absolute', top: '120px', left: '48px',
          display: 'flex', gap: '2px', alignItems: 'flex-end', height: '80px', zIndex: 10,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4, duration: 0.8 }}
      >
        {barHeights.map((h, i) => (
          <div key={i} style={{ width: '2px', height: `${h}px`, backgroundColor: '#000', opacity: 0.15 + (i % 3) * 0.08 }} />
        ))}
      </motion.div>

      {/* Pixel grid — bottom left */}
      <motion.div
        style={{ position: 'absolute', bottom: '120px', left: '48px', display: 'flex', gap: '3px', flexWrap: 'wrap', width: '72px', zIndex: 10 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.6, duration: 0.8 }}
      >
        {squarePattern.map((filled, i) => (
          <div key={i} style={{ width: '12px', height: '12px', backgroundColor: filled ? '#000' : 'transparent', border: '1px solid #E5E5E5' }} />
        ))}
      </motion.div>

      {/* Pixel grid — bottom right */}
      <motion.div
        style={{ position: 'absolute', bottom: '120px', right: '48px', display: 'flex', gap: '2px', flexWrap: 'wrap', width: '48px', zIndex: 10 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8, duration: 0.8 }}
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} style={{ width: '10px', height: '10px', backgroundColor: [0,1,3,4,6,9,10,12,15].includes(i) ? '#000' : 'transparent', border: '1px solid #E5E5E5' }} />
        ))}
      </motion.div>

      {/* Crosshair — right */}
      <motion.div
        style={{ position: 'absolute', top: '50%', right: '48px', transform: 'translateY(-50%)', zIndex: 10 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.0, duration: 0.8 }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <line x1="16" y1="0" x2="16" y2="12" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
          <line x1="16" y1="20" x2="16" y2="32" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
          <line x1="0" y1="16" x2="12" y2="16" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
          <line x1="20" y1="16" x2="32" y2="16" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
          <circle cx="16" cy="16" r="6" stroke="rgba(0,0,0,0.15)" strokeWidth="1" fill="none" />
        </svg>
      </motion.div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 32px' }}>

        {/* Headline — clip-path wipe reveal triggered by scan line */}
        <div style={{ marginBottom: '32px' }}>
          <div ref={word1Ref} style={{ clipPath: 'inset(0 100% 0 0)' }}>
            <span style={{
              display: 'block',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(48px, 10vw, 128px)',
              color: '#000',
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
            }}>
              PROTECT.
            </span>
          </div>
          <div ref={word2Ref} style={{ clipPath: 'inset(0 100% 0 0)' }}>
            <span style={{
              display: 'block',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(48px, 10vw, 128px)',
              color: '#000',
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
            }}>
              TRACK.
            </span>
          </div>
          <div ref={word3Ref} style={{ clipPath: 'inset(0 100% 0 0)' }}>
            <span style={{
              display: 'block',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(48px, 10vw, 128px)',
              color: '#000',
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
            }}>
              RECOVER.
            </span>
          </div>
        </div>

        {/* Subtitle */}
        <div ref={subtitleRef} style={{ maxWidth: '500px', margin: '0 auto 48px', opacity: 0 }}>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '17px',
            color: '#737373',
            lineHeight: 1.6,
          }}>
            {subtitle}
          </p>
        </div>

        {/* CTA Buttons */}
        <div ref={ctaRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div ref={btn1Ref} style={{ opacity: 0, transform: 'translateY(16px)' }}>
            <MagneticButton onClick={() => navigate('/login')}>
              <span>Register Now</span>
              <ArrowRight style={{ width: '16px', height: '16px' }} />
            </MagneticButton>
          </div>

          <div ref={btn2Ref} style={{ opacity: 0, transform: 'translateY(16px)' }}>
            <MagneticButton variant="rounded" onClick={() => {
              const el = document.querySelector('#features')
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}>
              <span>Learn More</span>
            </MagneticButton>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        style={{
          position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 10,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1 }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.3em', color: '#A3A3A3', textTransform: 'uppercase' }}>
          Scroll
        </span>
        <motion.div
          style={{ width: '1px', height: '32px', backgroundColor: '#D4D4D4', transformOrigin: 'top' }}
          animate={{ scaleY: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </section>
  )
}
