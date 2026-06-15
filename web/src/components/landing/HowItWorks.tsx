import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, useInView } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { PixelBlock, BarcodeLines, CornerBrackets } from './Accents'

gsap.registerPlugin(ScrollTrigger)

const steps = [
  {
    number: '01',
    title: 'Register',
    description: 'Add your devices with IMEI, serial number, and unique identifiers to the SPORS network.',
  },
  {
    number: '02',
    title: 'Report',
    description: 'Mark a device as lost or stolen. The entire network is instantly activated to search.',
  },
  {
    number: '03',
    title: 'Detect',
    description: 'Any SPORS user in proximity automatically detects your device via BLE scanning.',
  },
  {
    number: '04',
    title: 'Recover',
    description: 'Get real-time location alerts and coordinate recovery with police through the platform.',
  },
]

const scrambleChars = '0123456789'

function useNumberScramble(finalValue: string, delay: number = 0) {
  const ref = useRef<HTMLSpanElement>(null)
  const hasPlayed = useRef(false)

  const play = useCallback(() => {
    if (hasPlayed.current) return
    hasPlayed.current = true
    const el = ref.current
    if (!el) return

    let frame = 0
    const totalFrames = 20
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        const scrambled = finalValue
          .split('')
          .map((char, i) => {
            if (frame > totalFrames * (i / finalValue.length) + 5) return char
            return scrambleChars[Math.floor(Math.random() * scrambleChars.length)]
          })
          .join('')
        el.textContent = scrambled
        frame++
        if (frame > totalFrames + 10) {
          el.textContent = finalValue
          clearInterval(interval)
        }
      }, 40)
    }, delay)

    return () => clearTimeout(timer)
  }, [finalValue, delay])

  return { ref, play }
}

function StepCard({
  step,
  index,
  railProgress,
}: {
  step: (typeof steps)[0]
  index: number
  railProgress: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(cardRef, { once: true, margin: '-80px' })
  const [hovered, setHovered] = useState(false)

  const nodePosition = (index + 0.5) / steps.length
  const isRevealed = railProgress > nodePosition - 0.1

  const numberScramble = useNumberScramble(step.number, index * 200 + 400)

  useEffect(() => {
    if (isRevealed && isInView) {
      numberScramble.play()
    }
  }, [isRevealed, isInView, numberScramble.play])

  return (
    <motion.div
      ref={cardRef}
      style={{
        position: 'relative',
        padding: '40px 28px 36px',
        borderLeft: '1px solid',
        borderColor: hovered ? '#000' : '#E5E5E5',
        transition: 'border-color 0.4s ease',
      }}
      initial={{ opacity: 0, y: 40 }}
      animate={isRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{
        duration: 0.7,
        delay: index * 0.1,
        ease: [0.33, 1, 0.68, 1],
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Node dot on the rail */}
      <motion.div
        style={{
          position: 'absolute',
          top: '-7px',
          left: '-7px',
          width: '13px',
          height: '13px',
          borderRadius: '50%',
          backgroundColor: '#000',
          transition: 'transform 0.3s ease',
          transform: hovered ? 'scale(1.4)' : 'scale(1)',
        }}
        initial={{ scale: 0 }}
        animate={isRevealed ? { scale: 1 } : { scale: 0 }}
        transition={{
          duration: 0.4,
          delay: index * 0.1 + 0.15,
          type: 'spring',
          stiffness: 400,
          damping: 20,
        }}
      />

      {/* Sonar ping */}
      {isRevealed && (
        <motion.div
          style={{
            position: 'absolute',
            top: '-7px',
            left: '-7px',
            width: '13px',
            height: '13px',
            borderRadius: '50%',
            border: '1.5px solid #000',
            pointerEvents: 'none',
          }}
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 3.5, opacity: 0 }}
          transition={{ duration: 0.8, delay: index * 0.1 + 0.2, ease: 'easeOut' }}
        />
      )}

      {/* Number */}
      <span
        ref={numberScramble.ref}
        style={{
          display: 'block',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          fontSize: '11px',
          letterSpacing: '0.2em',
          color: hovered ? '#000' : '#A3A3A3',
          marginBottom: '20px',
          transition: 'color 0.3s ease',
        }}
      >
        {step.number}
      </span>

      {/* Title */}
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: '22px',
          color: '#000',
          marginBottom: '12px',
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}
      >
        {step.title}
      </h3>

      {/* Description */}
      <motion.p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          color: '#737373',
          lineHeight: 1.7,
        }}
        animate={hovered ? { opacity: 1, y: -2 } : { opacity: 0.7, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {step.description}
      </motion.p>

      {/* Arrow indicator on hover */}
      <motion.span
        style={{
          display: 'block',
          fontFamily: 'var(--font-mono)',
          fontSize: '16px',
          color: '#000',
          marginTop: '20px',
        }}
        animate={hovered ? { opacity: 1, x: 4 } : { opacity: 0, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        →
      </motion.span>
    </motion.div>
  )
}

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null)
  const [railProgress, setRailProgress] = useState(0)

  const headingWords = 'How it works'.split(' ')

  useEffect(() => {
    if (sectionRef.current) {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 70%',
        end: 'center 40%',
        scrub: 0.5,
        onUpdate: (self) => {
          setRailProgress(self.progress)
        },
      })
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      style={{
        padding: '128px 0',
        backgroundColor: '#FAFAFA',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px' }}>
        {/* Section Header */}
        <div style={{ marginBottom: '80px', maxWidth: '640px' }}>
          <motion.span
            className="typing-cursor"
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              letterSpacing: '0.3em',
              color: '#A3A3A3',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            [ 02 — PROCESS ]
          </motion.span>

          {/* Word-by-word heading */}
          <div style={{ marginBottom: '24px' }}>
            {headingWords.map((word, i) => (
              <motion.span
                key={i}
                style={{
                  display: 'inline-block',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 'clamp(36px, 5vw, 60px)',
                  color: '#000',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  marginRight: '0.3em',
                }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.12,
                  ease: [0.33, 1, 0.68, 1],
                }}
              >
                {word}
              </motion.span>
            ))}
          </div>

          {/* Animated underline */}
          <motion.div
            style={{
              width: '64px',
              height: '2px',
              backgroundColor: '#000',
              transformOrigin: 'left',
            }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.33, 1, 0.68, 1] }}
          />
        </div>

        {/* Timeline — horizontal rail with cards below */}
        <div style={{ position: 'relative' }}>
          {/* The horizontal rail */}
          <div style={{ position: 'relative', height: '1px', backgroundColor: '#E5E5E5', marginBottom: '0' }}>
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                backgroundColor: '#000',
                transformOrigin: 'left',
              }}
              animate={{ width: `${railProgress * 100}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
            {/* Tick marks */}
            {Array.from({ length: 21 }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${(i / 20) * 100}%`,
                  top: '-3px',
                  width: '1px',
                  height: i % 5 === 0 ? '7px' : '4px',
                  backgroundColor: '#D4D4D4',
                }}
              />
            ))}
          </div>

          {/* 4 step cards in a clean row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0',
            }}
          >
            {steps.map((step, i) => (
              <StepCard key={i} step={step} index={i} railProgress={railProgress} />
            ))}
          </div>
        </div>
      </div>

      {/* Decorative accents */}
      <PixelBlock
        size={4}
        cellSize={14}
        pattern={[1,1,0,1, 0,1,1,0, 1,0,1,1, 0,1,0,1]}
        style={{ position: 'absolute', bottom: '40px', right: '48px', zIndex: 2 }}
        delay={0.5}
      />
      <BarcodeLines
        count={14}
        maxHeight={50}
        style={{ position: 'absolute', top: '60px', right: '48px', zIndex: 2 }}
        delay={0.6}
      />
      <CornerBrackets
        size={36}
        style={{ position: 'absolute', bottom: '40px', left: '48px', zIndex: 2 }}
        delay={0.4}
      />
    </section>
  )
}
