import { motion } from 'framer-motion'

interface FeatureVectorProps {
  id: string
  isActive: boolean
}

export function FeatureVector({ id, isActive }: FeatureVectorProps) {
  if (!isActive) return null

  const center = 200
  const radius = 140

  // Smooth entrance — syncs with the panel pull-out timing
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.88, y: 15 },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: { 
        delay: 0.3,
        duration: 1.0,
        ease: [0.25, 0.1, 0.25, 1],
      }
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-12 overflow-hidden">
      <motion.svg
        viewBox="0 0 400 400"
        className="w-full h-full max-w-[500px] max-h-[500px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <defs>
          <pattern id="grid-pattern-orb" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.01)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern-orb)" />

        {/* 01: DETECTION - THE GLOBE */}
        {id === '01' && (
          <g>
            {[0, 30, 60, 90, 120, 150].map((rot) => (
              <motion.ellipse
                key={rot}
                cx={center}
                cy={center}
                rx={radius}
                ry={radius}
                stroke="#000"
                strokeWidth="1"
                strokeOpacity="0.08"
                animate={{ rx: [radius, 5, radius] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: rot / 30 }}
                style={{ transform: `rotate(${rot}deg)`, transformOrigin: 'center' }}
              />
            ))}
            <circle cx={center} cy={center} r={radius} stroke="#000" strokeWidth="1" strokeOpacity="0.1" />
            <motion.circle
              cx={center} cy={center} r={radius}
              stroke="#000" strokeWidth="0.5" strokeDasharray="5 15"
              strokeOpacity="0.15"
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            />
          </g>
        )}

        {/* 02: ALERTS - HARMONIC RINGS ORB */}
        {id === '02' && (
          <g>
            {[1, 0.8, 0.6, 0.4, 0.2].map((scale, i) => (
              <motion.circle
                key={i}
                cx={center} cy={center}
                r={radius * scale}
                stroke="#000"
                strokeWidth="1"
                strokeOpacity={0.05 + (scale * 0.1)}
                animate={{ scale: [1, 1.05, 1] }}
                strokeDasharray="4 8"
                transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
              />
            ))}
            {[0, 90].map(rot => (
                 <motion.ellipse
                    key={rot}
                    cx={center} cy={center} rx={radius} ry={radius}
                    stroke="#000" strokeWidth="0.5" strokeOpacity="0.05"
                    animate={{ ry: [radius, 0, radius] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    style={{ transform: `rotate(${rot}deg)`, transformOrigin: 'center' }}
                 />
            ))}
          </g>
        )}

        {/* 03: INTEGRATION - CRYSTALLINE ORB */}
        {id === '03' && (
          <motion.g animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: '200px 200px' }}>
            {[0, 45, 90, 135].map(rot => (
                <motion.ellipse
                    key={rot}
                    cx={center} cy={center} rx={radius} ry={radius}
                    stroke="#000" strokeWidth="1" strokeOpacity="0.08"
                    animate={{ rx: [radius, 20, radius] }}
                    transition={{ duration: 8, repeat: Infinity, delay: rot/45 }}
                    style={{ transform: `rotate(${rot}deg)`, transformOrigin: 'center' }}
                />
            ))}
            {[0, 60, 120, 180, 240, 300].map(a => (
                <motion.circle
                    key={a}
                    cx={center + Math.cos(a*Math.PI/180) * radius * 0.7}
                    cy={center + Math.sin(a*Math.PI/180) * radius * 0.7}
                    r="2"
                    fill="#000"
                    fillOpacity="0.1"
                />
            ))}
          </motion.g>
        )}

        {/* 04: TRACKING - WAVE-FIELD ORB */}
        {id === '04' && (
          <g>
            {Array.from({ length: 12 }).map((_, i) => {
               const yPos = (i / 11) * (radius * 2) - radius
               const r = Math.sqrt(radius * radius - yPos * yPos)
               return (
                 <motion.ellipse
                    key={i}
                    cx={center}
                    cy={center + yPos}
                    rx={r}
                    ry={r * 0.2}
                    stroke="#000"
                    strokeWidth="1"
                    strokeOpacity={0.05 + (1 - Math.abs(yPos)/radius) * 0.15}
                    animate={{ ry: [r * 0.1, r * 0.3, r * 0.1] }}
                    transition={{ duration: 4, repeat: Infinity, delay: i * 0.2 }}
                 />
               )
            })}
          </g>
        )}

        {/* 05: SECURITY - HEX-SHIELD ORB */}
        {id === '05' && (
          <motion.g animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: '200px 200px' }}>
            {[0, 60, 120].map(rot => (
                <motion.ellipse
                    key={rot}
                    cx={center} cy={center} rx={radius} ry={radius}
                    stroke="#000" strokeWidth="1" strokeOpacity="0.08"
                    strokeDasharray="20 10"
                    animate={{ rx: [radius, 30, radius] }}
                    transition={{ duration: 10, repeat: Infinity, delay: rot/60 }}
                    style={{ transform: `rotate(${rot}deg)`, transformOrigin: 'center' }}
                />
            ))}
            <path
                d={`M 200 ${center-60} L ${200+52} ${center-30} L ${200+52} ${center+30} L 200 ${center+60} L ${200-52} ${center+30} L ${200-52} ${center-30} Z`}
                stroke="#000" strokeWidth="1" strokeOpacity="0.15"
            />
          </motion.g>
        )}

        {/* 06: REGISTRY - ATOMIC ORB (Fixed Motion) */}
        {id === '06' && (
          <g>
            {/* Center Nucleus */}
            {[0, 120, 240].map(a => (
                <motion.circle
                    key={a}
                    cx={center + Math.cos(a*Math.PI/180) * 10}
                    cy={center + Math.sin(a*Math.PI/180) * 10}
                    r="4"
                    fill="#000"
                    fillOpacity="0.1"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: a/120 }}
                />
            ))}
            
            {/* Orbital Paths */}
            {[0, 45, 90, 135].map((rot) => (
              <motion.ellipse
                key={rot}
                cx={center}
                cy={center}
                rx={radius}
                ry={radius}
                stroke="#000"
                strokeWidth="1"
                strokeOpacity="0.06"
                initial={{ rx: radius, ry: radius }}
                animate={{ rx: [radius, 2, radius] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: rot / 45 }}
                style={{ transform: `rotate(${rot}deg)`, transformOrigin: 'center' }}
              />
            ))}

            {/* Tracking Nodes (Smoother polar motion) */}
            {[0, 45, 90, 135].map((rot, i) => (
               <motion.g
                  key={i}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: `${center}px ${center}px` }}
               >
                  <motion.circle
                    cx={center + radius}
                    cy={center}
                    r="3"
                    fill="#000"
                    fillOpacity="0.2"
                    animate={{ r: [3, 5, 3] }} // Fixed: circle uses 'r', not 'rx'
                    style={{ transform: `rotate(${rot}deg)`, transformOrigin: `${center}px ${center}px` }}
                  />
               </motion.g>
            ))}
          </g>
        )}
      </motion.svg>
    </div>
  )
}
