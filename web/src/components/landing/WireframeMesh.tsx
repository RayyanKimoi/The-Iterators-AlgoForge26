import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface Point {
  x: number
  y: number
  z: number
  ox: number
  oy: number
}

interface WireframeMeshProps {
  variant?: 'dark' | 'light'
}

export function WireframeMesh({ variant = 'dark' }: WireframeMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0.5, y: 0.5 })
  const animationRef = useRef<number>(0)

  // dark = black lines on white bg, light = white lines on black bg
  const isDark = variant === 'dark'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = canvas.offsetWidth
    let height = canvas.offsetHeight

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const cols = 40
    const rows = 20
    const spacing = width / cols

    const createPoints = (): Point[][] => {
      const pts: Point[][] = []
      for (let row = 0; row < rows; row++) {
        pts[row] = []
        for (let col = 0; col <= cols; col++) {
          const x = col * spacing
          const baseY = height * 0.7 + (row / rows) * height * 0.35
          const noise = Math.sin(col * 0.3) * 20 +
            Math.cos(row * 0.5 + col * 0.2) * 15 +
            Math.sin(col * 0.15 + row * 0.3) * 25
          const y = baseY + noise
          pts[row][col] = { x, y, z: noise, ox: x, oy: y }
        }
      }
      return pts
    }

    const createTopPoints = (): Point[][] => {
      const pts: Point[][] = []
      for (let row = 0; row < rows / 2; row++) {
        pts[row] = []
        for (let col = 0; col <= cols; col++) {
          const x = col * spacing
          const baseY = height * 0.15 - (row / (rows / 2)) * height * 0.2
          const noise = Math.sin(col * 0.25 + 2) * 15 +
            Math.cos(row * 0.6 + col * 0.15) * 12 +
            Math.sin(col * 0.1 + row * 0.4) * 18
          const y = baseY + noise
          pts[row][col] = { x, y, z: noise, ox: x, oy: y }
        }
      }
      return pts
    }

    let bottomMesh = createPoints()
    let topMesh = createTopPoints()
    let time = 0

    // Floating particles
    const lineColor = isDark ? '0, 0, 0' : '255, 255, 255'
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = []
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.25,
      })
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      gsap.to(mouseRef.current, {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
        duration: 0.5,
        ease: 'power2.out',
      })
    }

    const drawMesh = (mesh: Point[][], isTop: boolean) => {
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      for (let row = 0; row < mesh.length; row++) {
        for (let col = 0; col < mesh[row].length; col++) {
          const pt = mesh[row][col]
          const dx = (col / cols) - mx
          const dy = isTop ? (row / mesh.length) - my : ((row / mesh.length) + 0.6) - my
          const dist = Math.sqrt(dx * dx + dy * dy)
          const influence = Math.max(0, 1 - dist * 2) * 30

          const wave = Math.sin(time * 0.8 + col * 0.15 + row * 0.1) * 8 +
            Math.cos(time * 0.5 + row * 0.2) * 5

          pt.y = pt.oy + wave + (isTop ? influence : -influence)
        }
      }

      // Horizontal lines
      ctx.strokeStyle = `rgba(${lineColor}, 0.5)`
      ctx.lineWidth = 1

      for (let row = 0; row < mesh.length; row++) {
        ctx.beginPath()
        for (let col = 0; col < mesh[row].length; col++) {
          const pt = mesh[row][col]
          if (col === 0) ctx.moveTo(pt.x, pt.y)
          else ctx.lineTo(pt.x, pt.y)
        }
        ctx.stroke()
      }

      // Vertical lines
      for (let col = 0; col <= cols; col++) {
        ctx.beginPath()
        for (let row = 0; row < mesh.length; row++) {
          if (!mesh[row][col]) continue
          const pt = mesh[row][col]
          if (row === 0) ctx.moveTo(pt.x, pt.y)
          else ctx.lineTo(pt.x, pt.y)
        }
        ctx.stroke()
      }

      // Diagonal connections
      ctx.strokeStyle = `rgba(${lineColor}, 0.25)`
      for (let row = 0; row < mesh.length - 1; row++) {
        for (let col = 0; col < mesh[row].length - 1; col++) {
          const pt = mesh[row][col]
          const ptDiag = mesh[row + 1][col + 1]
          ctx.beginPath()
          ctx.moveTo(pt.x, pt.y)
          ctx.lineTo(ptDiag.x, ptDiag.y)
          ctx.stroke()
        }
      }
    }

    const drawParticles = () => {
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${lineColor}, ${p.alpha})`
        ctx.fill()
      })
    }

    const animate = () => {
      if (!isVisible) return

      ctx.clearRect(0, 0, width, height)
      // Transparent background — the parent element controls the bg color
      time += 0.016

      drawParticles()
      drawMesh(topMesh, true)
      drawMesh(bottomMesh, false)

      animationRef.current = requestAnimationFrame(animate)
    }

    let isVisible = true

    const handleResize = () => {
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      if (width < 30 || height < 30) return

      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
      bottomMesh = createPoints()
      topMesh = createTopPoints()
    }

    const resizeObserver = new ResizeObserver(() => handleResize())
    resizeObserver.observe(canvas)

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting
        if (isVisible) {
          cancelAnimationFrame(animationRef.current)
          animationRef.current = requestAnimationFrame(animate)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(canvas)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', handleResize)
    
    // Initial resize to capture proper dimensions
    setTimeout(handleResize, 100) 
    
    animate()

    return () => {
      resizeObserver.disconnect()
      observer.disconnect()
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [isDark])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
