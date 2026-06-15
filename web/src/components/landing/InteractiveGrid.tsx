import { useEffect, useRef } from 'react'

interface Cell {
  x: number
  y: number
  alpha: number
}

export function InteractiveGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const mouseRef = useRef({ x: -100, y: -100 })
  const cellsRef = useRef<Map<string, Cell>>(new Map())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cellSize = 50
    const fadeSpeed = 0.025
    const activationRadius = 60 // px radius around cursor that activates cells

    const updateSize = () => {
      const scrollHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      )
      canvas.width = window.innerWidth
      canvas.height = scrollHeight
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${scrollHeight}px`
    }

    updateSize()

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY + window.scrollY
    }

    const handleScroll = () => {
      // Update mouse position on scroll too
      mouseRef.current.y = mouseRef.current.y
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      // Calculate which cells are near the cursor
      const colStart = Math.max(0, Math.floor((mx - activationRadius) / cellSize))
      const colEnd = Math.floor((mx + activationRadius) / cellSize)
      const rowStart = Math.max(0, Math.floor((my - activationRadius) / cellSize))
      const rowEnd = Math.floor((my + activationRadius) / cellSize)

      for (let row = rowStart; row <= rowEnd; row++) {
        for (let col = colStart; col <= colEnd; col++) {
          const cellCenterX = col * cellSize + cellSize / 2
          const cellCenterY = row * cellSize + cellSize / 2
          const dx = mx - cellCenterX
          const dy = my - cellCenterY
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < activationRadius) {
            const key = `${col},${row}`
            const intensity = 1 - dist / activationRadius
            const targetAlpha = intensity * 0.12 // max opacity — subtle

            const existing = cellsRef.current.get(key)
            if (!existing) {
              cellsRef.current.set(key, {
                x: col * cellSize,
                y: row * cellSize,
                alpha: targetAlpha,
              })
            } else {
              existing.alpha = Math.max(existing.alpha, targetAlpha)
            }
          }
        }
      }

      // Draw and fade cells
      const toDelete: string[] = []
      cellsRef.current.forEach((cell, key) => {
        if (cell.alpha <= 0.005) {
          toDelete.push(key)
          return
        }

        // Draw cell fill
        ctx.fillStyle = `rgba(0, 0, 0, ${cell.alpha})`
        ctx.fillRect(cell.x + 0.5, cell.y + 0.5, cellSize - 1, cellSize - 1)

        // Draw cell border
        ctx.strokeStyle = `rgba(0, 0, 0, ${cell.alpha * 0.5})`
        ctx.lineWidth = 0.5
        ctx.strokeRect(cell.x + 0.5, cell.y + 0.5, cellSize - 1, cellSize - 1)

        // Fade out
        cell.alpha -= fadeSpeed
      })

      toDelete.forEach((key) => cellsRef.current.delete(key))

      // Draw subtle base grid lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)'
      ctx.lineWidth = 0.5

      const cols = Math.ceil(canvas.width / cellSize)
      const rows = Math.ceil(canvas.height / cellSize)

      // Vertical lines
      for (let col = 0; col <= cols; col++) {
        const x = col * cellSize
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }

      // Horizontal lines
      for (let row = 0; row <= rows; row++) {
        const y = row * cellSize
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    // Observe size changes
    const resizeObserver = new ResizeObserver(() => {
      updateSize()
    })
    resizeObserver.observe(document.body)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', updateSize)
    animate()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', updateSize)
      resizeObserver.disconnect()
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  )
}
