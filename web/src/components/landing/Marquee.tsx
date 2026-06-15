import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const marqueeText = 'PROTECT · TRACK · RECOVER · CROWDSOURCED · SECURE · SPORS · '

export function Marquee() {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 1,
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    }

    // Animate marquee scroll
    if (trackRef.current) {
      gsap.to(trackRef.current, {
        xPercent: -50,
        duration: 20,
        ease: 'none',
        repeat: -1,
      })
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        padding: '32px 0',
        backgroundColor: '#000',
        overflow: 'hidden',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div style={{ display: 'flex', whiteSpace: 'nowrap' }}>
        <div
          ref={trackRef}
          style={{ display: 'flex', willChange: 'transform' }}
        >
          {Array.from({ length: 4 }).map((_, repeatIndex) => (
            <span
              key={repeatIndex}
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 'clamp(36px, 5vw, 72px)',
                color: 'rgba(255,255,255,0.08)',
                letterSpacing: '-0.02em',
                paddingRight: '32px',
              }}
            >
              {marqueeText}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
