import { motion } from 'framer-motion'

// Pixel grid block
export function PixelBlock({
  size = 4,
  cellSize = 14,
  pattern,
  style,
  delay = 0,
}: {
  size?: number
  cellSize?: number
  pattern?: number[]
  style?: React.CSSProperties
  delay?: number
}) {
  const defaultPattern = [
    1,1,0,1,
    0,1,1,0,
    1,0,1,1,
    1,1,0,1,
  ]
  const cells = pattern || defaultPattern

  return (
    <motion.div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        width: `${size * (cellSize + 3)}px`,
        gap: '3px',
        ...style,
      }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay }}
    >
      {cells.map((filled, i) => (
        <div
          key={i}
          style={{
            width: `${cellSize}px`,
            height: `${cellSize}px`,
            backgroundColor: filled ? '#000' : 'transparent',
            border: '1px solid #E5E5E5',
          }}
        />
      ))}
    </motion.div>
  )
}

// Barcode lines
export function BarcodeLines({
  count = 16,
  maxHeight = 60,
  style,
  color = '#000',
  delay = 0,
}: {
  count?: number
  maxHeight?: number
  style?: React.CSSProperties
  color?: string
  delay?: number
}) {
  const heights = Array.from({ length: count }, (_, i) =>
    15 + Math.sin(i * 0.6) * (maxHeight * 0.4) + Math.cos(i * 0.3) * (maxHeight * 0.2)
  )

  return (
    <motion.div
      style={{
        display: 'flex',
        gap: '2px',
        alignItems: 'flex-end',
        height: `${maxHeight}px`,
        ...style,
      }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay }}
    >
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: '2.5px',
            height: `${h}px`,
            backgroundColor: color,
            opacity: 0.12 + (i % 3) * 0.06,
          }}
        />
      ))}
    </motion.div>
  )
}

// Crosshair marker
export function Crosshair({
  size = 40,
  style,
  color = 'rgba(0,0,0,0.15)',
  delay = 0,
}: {
  size?: number
  style?: React.CSSProperties
  color?: string
  delay?: number
}) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      style={style}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay }}
    >
      <line x1={size/2} y1="0" x2={size/2} y2={size*0.35} stroke={color} strokeWidth="1" />
      <line x1={size/2} y1={size*0.65} x2={size/2} y2={size} stroke={color} strokeWidth="1" />
      <line x1="0" y1={size/2} x2={size*0.35} y2={size/2} stroke={color} strokeWidth="1" />
      <line x1={size*0.65} y1={size/2} x2={size} y2={size/2} stroke={color} strokeWidth="1" />
      <circle cx={size/2} cy={size/2} r={size*0.18} stroke={color} strokeWidth="1" fill="none" />
    </motion.svg>
  )
}

// Corner bracket decoration
export function CornerBrackets({
  size = 32,
  style,
  color = 'rgba(0,0,0,0.12)',
  delay = 0,
}: {
  size?: number
  style?: React.CSSProperties
  color?: string
  delay?: number
}) {
  const s = size
  const l = s * 0.35
  return (
    <motion.svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      style={style}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay }}
    >
      {/* Top-left */}
      <line x1="0" y1={l} x2="0" y2="0" stroke={color} strokeWidth="1.5" />
      <line x1="0" y1="0" x2={l} y2="0" stroke={color} strokeWidth="1.5" />
      {/* Top-right */}
      <line x1={s-l} y1="0" x2={s} y2="0" stroke={color} strokeWidth="1.5" />
      <line x1={s} y1="0" x2={s} y2={l} stroke={color} strokeWidth="1.5" />
      {/* Bottom-left */}
      <line x1="0" y1={s-l} x2="0" y2={s} stroke={color} strokeWidth="1.5" />
      <line x1="0" y1={s} x2={l} y2={s} stroke={color} strokeWidth="1.5" />
      {/* Bottom-right */}
      <line x1={s-l} y1={s} x2={s} y2={s} stroke={color} strokeWidth="1.5" />
      <line x1={s} y1={s-l} x2={s} y2={s} stroke={color} strokeWidth="1.5" />
    </motion.svg>
  )
}
