import { useEffect, useRef } from 'react'

interface Point {
  x: number
  y: number
  z: number
  ox: number
  oy: number
}

interface FeatureWireframeProps {
  id: string
  isActive: boolean
}

export function FeatureWireframe({ id, isActive }: FeatureWireframeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isActive) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    const dpr = window.devicePixelRatio || 1

    const handleResize = () => {
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
    }

    handleResize()
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(canvas)

    let time = 0
    
    // Pattern Selection based on Feature ID
    // We keep points/logic extremely lean for performance
    
    // 01: Sphere (Globe)
    // 02: Tunnel (Concentric Circles)
    // 03: Terrain (Light Grid)
    // 04: Wave (Sine layers)
    // 05: Radar (Geometric Sweep)
    // 06: Cube (3D Wireframe)

    const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number, alpha = 0.05) => {
      ctx.strokeStyle = `rgba(0,0,0,${alpha})`
      const step = 40
      for (let x = 0; x <= w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
      }
      for (let y = 0; y <= h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height)
      time += 0.008

      drawGrid(ctx, width, height, 0.03)

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'
      ctx.lineWidth = 1

      if (id === '01') {
        const cx = width / 2, cy = height / 2, r = Math.min(width, height) * 0.35
        for (let i = 0; i < 12; i++) {
          const angle = time + (i * Math.PI) / 6
          const xr = r * Math.cos(angle)
          ctx.strokeStyle = `rgba(0,0,0,${0.1 + Math.abs(Math.cos(angle)) * 0.4})`
          ctx.beginPath(); ctx.ellipse(cx, cy, Math.abs(xr), r, 0, 0, Math.PI * 2); ctx.stroke()
        }
        for (let i = 1; i < 8; i++) {
          const yr = r * (i / 8)
          ctx.strokeStyle = `rgba(0,0,0,0.15)`
          ctx.beginPath(); ctx.ellipse(cx, cy, r, yr, 0, 0, Math.PI * 2); ctx.stroke()
        }
      } else if (id === '02') {
        const cx = width / 2, cy = height / 2
        for (let i = 0; i < 15; i++) {
          const shift = (time * 60 + i * 40) % 400
          const r = shift
          ctx.strokeStyle = `rgba(0,0,0,${Math.max(0, 0.6 - (r/400))})`
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
          // Interior spokes
          for (let s = 0; s < 8; s++) {
            const a = s * Math.PI / 4 + time * 0.2
            ctx.beginPath(); ctx.moveTo(cx + Math.cos(a)*r*0.8, cy + Math.sin(a)*r*0.8); ctx.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r); ctx.stroke()
          }
        }
      } else if (id === '03') {
        const cols = 25, rows = 15
        const spacingX = width / cols, spacingY = height / rows
        for (let r = 0; r < rows; r++) {
          ctx.beginPath()
          const ry = (height * 0.25) + r * (height * 0.5 / rows)
          for (let c = 0; c <= cols; c++) {
            const rx = c * spacingX
            const y = ry + Math.sin(time + c * 0.4 + r * 0.2) * 20 + Math.cos(time*0.5 + c*0.2) * 10
            if (c === 0) ctx.moveTo(rx, y)
            else ctx.lineTo(rx, y)
            // Diagonal accents
            if (c % 2 === 0 && r < rows - 1) {
                const nextY = ry + spacingY + Math.sin(time + (c+1)*0.4 + (r+1)*0.2) * 20
                ctx.moveTo(rx, y); ctx.lineTo(rx + spacingX, nextY)
            }
          }
          ctx.stroke()
        }
      } else if (id === '04') {
        for (let j = 0; j < 12; j++) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(0,0,0,${0.05 + (j * 0.04)})`
            const yBase = (height * 0.2) + (j * height * 0.6 / 12)
            for (let i = 0; i <= width; i += 10) {
                const y = yBase + Math.sin(time * 1.5 + i * 0.015 + j * 0.3) * 35 
                if (i === 0) ctx.moveTo(i, y)
                else ctx.lineTo(i, y)
                // Cross vertical
                if (i % 60 === 0 && j < 11) {
                    const nextY = yBase + (height * 0.6 / 12) + Math.sin(time * 1.5 + i * 0.015 + (j+1) * 0.3) * 35
                    ctx.moveTo(i, y); ctx.lineTo(i, nextY)
                }
            }
            ctx.stroke()
        }
      } else if (id === '05') {
        const cx = width / 2, cy = height / 2, r = Math.min(width, height) * 0.4
        // Grid Circles
        for(let i=1; i<=4; i++) {
            ctx.strokeStyle = `rgba(0,0,0,${0.05 * i})`
            ctx.beginPath(); ctx.arc(cx, cy, r * (i/4), 0, Math.PI * 2); ctx.stroke()
        }
        // Sweep
        const sweepA = time * 2
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        grad.addColorStop(0, 'rgba(0,0,0,0)')
        grad.addColorStop(1, 'rgba(0,0,0,0.1)')
        ctx.fillStyle = grad
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, sweepA, sweepA + 0.5); ctx.lineTo(cx, cy); ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(sweepA)*r, cy + Math.sin(sweepA)*r); ctx.stroke()
      } else if (id === '06') {
        const cx = width / 2, cy = height / 2, s = Math.min(width, height) * 0.3
        const points = []
        for(let i=0; i<8; i++) {
            const x = i & 1 ? 1 : -1, y = i & 2 ? 1 : -1, z = i & 4 ? 1 : -1
            const r1 = time * 0.5, r2 = time * 0.3
            let nx = x * Math.cos(r1) - z * Math.sin(r1), nz = x * Math.sin(r1) + z * Math.cos(r1)
            let ny = y * Math.cos(r2) - nz * Math.sin(r2), nz2 = y * Math.sin(r2) + nz * Math.cos(r2)
            const fov = 400, scale = fov / (fov + nz2)
            points.push({ x: cx + nx * s * scale, y: cy + ny * s * scale })
        }
        const edges = [[0,1],[1,3],[3,2],[2,0],[4,5],[5,7],[7,6],[6,4],[0,4],[1,5],[2,6],[3,7]]
        edges.forEach(e => {
            ctx.beginPath(); ctx.moveTo(points[e[0]].x, points[e[0]].y); ctx.lineTo(points[e[1]].x, points[e[1]].y); ctx.stroke()
        })
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      resizeObserver.disconnect()
      cancelAnimationFrame(animationRef.current)
    }
  }, [id, isActive])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: isActive ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    />
  )
}
