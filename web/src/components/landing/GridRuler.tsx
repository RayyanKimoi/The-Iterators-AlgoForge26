import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface GridRulerProps {
  label?: string
}

export function GridRuler({ label }: GridRulerProps) {
  const lineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (lineRef.current) {
      gsap.fromTo(
        lineRef.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: lineRef.current,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        }
      )
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <div style={{ position: 'relative', maxWidth: '1280px', margin: '0 auto', padding: '0 48px' }}>
      <div
        ref={lineRef}
        style={{
          height: '1px',
          backgroundColor: '#E5E5E5',
          width: '100%',
          transformOrigin: 'left',
        }}
      />
      {/* Tick marks */}
      <div style={{ position: 'relative', height: '24px' }}>
        {Array.from({ length: 13 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(i / 12) * 100}%`,
              top: 0,
              width: '1px',
              height: i % 4 === 0 ? '12px' : '6px',
              backgroundColor: '#D4D4D4',
            }}
          />
        ))}
      </div>
      {label && (
        <motion.span
          style={{
            position: 'absolute',
            right: '48px',
            top: '-28px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.2em',
            color: '#A3A3A3',
            textTransform: 'uppercase',
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {label}
        </motion.span>
      )}
    </div>
  )
}
