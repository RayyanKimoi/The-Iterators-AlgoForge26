import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { PixelBlock, BarcodeLines, Crosshair } from './Accents'

gsap.registerPlugin(ScrollTrigger)

const stats = [
  { value: 10000, suffix: '+', label: 'Devices Protected', mono: '10,000+' },
  { value: 98, suffix: '%', label: 'Recovery Rate', mono: '98%' },
  { value: 500, suffix: '+', label: 'Police Partners', mono: '500+' },
  { value: 24, suffix: '/7', label: 'Network Monitoring', mono: '24/7' },
]

export function Stats() {
  const sectionRef = useRef<HTMLElement>(null)
  const numberRefs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    numberRefs.current.filter(Boolean).forEach((el, i) => {
      const stat = stats[i]
      const obj = { value: 0 }

      gsap.to(obj, {
        value: stat.value,
        duration: 2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        onUpdate: () => {
          if (el) {
            const formatted = stat.value >= 1000
              ? Math.floor(obj.value).toLocaleString()
              : Math.floor(obj.value).toString()
            el.textContent = formatted + stat.suffix
          }
        },
      })
    })

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="stats"
      style={{
        padding: '128px 0',
        backgroundColor: '#000',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px' }}>
        {/* Section label */}
        <motion.span
          className="typing-cursor"
          style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            letterSpacing: '0.3em',
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            marginBottom: '64px',
            textAlign: 'center',
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          [ 03 — IMPACT ]
        </motion.span>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
          }}
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              style={{
                textAlign: 'center',
                padding: '48px 16px',
                borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                position: 'relative',
              }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.7,
                delay: i * 0.1,
                ease: [0.33, 1, 0.68, 1],
              }}
            >
              {/* Number */}
              <span
                ref={(el) => { numberRefs.current[i] = el }}
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  fontSize: 'clamp(36px, 4vw, 56px)',
                  color: '#fff',
                  marginBottom: '16px',
                  lineHeight: 1,
                }}
              >
                0{stat.suffix}
              </span>

              {/* Label */}
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 400,
                  fontSize: '12px',
                  letterSpacing: '0.2em',
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                }}
              >
                {stat.label}
              </span>

              {/* Subtle tick at bottom */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '16px',
                  height: '1px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Decorative white accents on dark bg */}
      <PixelBlock
        size={5}
        cellSize={12}
        pattern={[0,1,1,0,1, 1,0,1,1,0, 0,1,0,1,1, 1,1,0,0,1, 0,0,1,1,0]}
        style={{ position: 'absolute', top: '40px', left: '48px', zIndex: 2, filter: 'invert(1)' }}
        delay={0.3}
      />
      <BarcodeLines
        count={18}
        maxHeight={60}
        color="#fff"
        style={{ position: 'absolute', bottom: '40px', right: '48px', zIndex: 2 }}
        delay={0.5}
      />
      <Crosshair
        size={44}
        color="rgba(255,255,255,0.12)"
        style={{ position: 'absolute', top: '50%', left: '48px', transform: 'translateY(-50%)', zIndex: 2 }}
        delay={0.4}
      />
    </section>
  )
}
