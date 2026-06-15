import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MagneticButtonProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'inverted' | 'rounded'
  onClick?: () => void
  href?: string
}

export function MagneticButton({
  children,
  className,
  variant = 'default',
  onClick,
  href,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 })
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 })

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    x.set((e.clientX - centerX) * 0.3)
    y.set((e.clientY - centerY) * 0.3)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const classes = cn(
    'magnetic-btn',
    variant === 'inverted' && 'magnetic-btn--inverted',
    variant === 'rounded' && 'magnetic-btn--rounded',
    className
  )

  const inner = (
    <motion.div
      ref={ref}
      className={classes}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.div>
  )

  if (href) {
    return <a href={href}>{inner}</a>
  }

  return inner
}
