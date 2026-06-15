import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Only show custom cursor on devices with fine pointer (mouse)
    const mediaQuery = window.matchMedia('(pointer: fine)')
    if (!mediaQuery.matches) return

    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    // GSAP quickTo for smooth following
    const xDot = gsap.quickTo(dot, 'left', { duration: 0.15, ease: 'power2.out' })
    const yDot = gsap.quickTo(dot, 'top', { duration: 0.15, ease: 'power2.out' })
    const xRing = gsap.quickTo(ring, 'left', { duration: 0.4, ease: 'power2.out' })
    const yRing = gsap.quickTo(ring, 'top', { duration: 0.4, ease: 'power2.out' })

    const handleMouseMove = (e: MouseEvent) => {
      xDot(e.clientX)
      yDot(e.clientY)
      xRing(e.clientX)
      yRing(e.clientY)
    }

    const handleMouseEnterInteractive = () => {
      ring.classList.add('hovering')
    }

    const handleMouseLeaveInteractive = () => {
      ring.classList.remove('hovering')
    }

    window.addEventListener('mousemove', handleMouseMove)

    // Attach hover listeners to all interactive elements
    const interactiveElements = document.querySelectorAll('a, button, [role="button"], .magnetic-btn, .bento-card, .nav-link')
    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', handleMouseEnterInteractive)
      el.addEventListener('mouseleave', handleMouseLeaveInteractive)
    })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      interactiveElements.forEach((el) => {
        el.removeEventListener('mouseenter', handleMouseEnterInteractive)
        el.removeEventListener('mouseleave', handleMouseLeaveInteractive)
      })
    }
  }, [])

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  )
}
