import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { MagneticButton } from './MagneticButton'
import { ArrowRight } from 'lucide-react'
import { WireframeMesh } from './WireframeMesh'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function CTA() {
  const navigate = useNavigate()
  const sectionRef = useRef<HTMLElement>(null)
  const textRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (textRef.current) {
      gsap.fromTo(
        textRef.current,
        { opacity: 0, y: 60 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="about"
      style={{
        padding: '160px 0',
        backgroundColor: '#000',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Wireframe mesh background */}
      <WireframeMesh variant="light" />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '960px', margin: '0 auto', padding: '0 48px', textAlign: 'center' }}>
        <motion.span
          style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            letterSpacing: '0.3em',
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            marginBottom: '32px',
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          [ 04 — Get Started ]
        </motion.span>

        <h2
          ref={textRef}
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 'clamp(36px, 5vw, 64px)',
            color: '#fff',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: '24px',
          }}
        >
          Your devices deserve
          <br />
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>protection</span>
        </h2>

        <motion.p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '17px',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '48px',
            maxWidth: '500px',
            margin: '0 auto 48px',
            lineHeight: 1.6,
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Join the network. Register your devices. Sleep better knowing thousands are watching.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <MagneticButton variant="inverted" onClick={() => navigate('/login')}>
            <span>Start Protecting</span>
            <ArrowRight style={{ width: '16px', height: '16px' }} />
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  )
}
