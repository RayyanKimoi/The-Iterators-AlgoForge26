import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FeatureVector } from './FeatureVector'
import {
  Radio,
  Bell,
  ShieldCheck,
  Bluetooth,
  MessageSquareLock,
  Smartphone,
} from 'lucide-react'

const features = [
  {
    id: '01',
    label: 'Detection',
    icon: Radio,
    title: 'Crowdsourced Detection',
    description:
      'Every SPORS user becomes a node in a massive detection network. When your device goes missing, thousands of peers silently scan for it — creating an invisible mesh of protection across the city.',
  },
  {
    id: '02',
    label: 'Alerts',
    icon: Bell,
    title: 'Real-time Alerts',
    description:
      'Instant notifications the moment your device is detected anywhere in the network. Location data is triangulated through multiple nodes for pinpoint accuracy.',
  },
  {
    id: '03',
    label: 'Integration',
    icon: ShieldCheck,
    title: 'Police Integration',
    description:
      'A dedicated law enforcement portal enables verified officers to receive reports, coordinate recovery operations, and communicate directly with device owners through secure channels.',
  },
  {
    id: '04',
    label: 'Tracking',
    icon: Bluetooth,
    title: 'BLE Tracking',
    description:
      'Advanced Bluetooth Low Energy scanning detects registered devices within proximity, building a real-time location mesh that grows stronger with every new user in the network.',
  },
  {
    id: '05',
    label: 'Security',
    icon: MessageSquareLock,
    title: 'Encrypted Chat',
    description:
      'Secure, end-to-end encrypted communication between device owners and finders. No personal data is ever exposed — only verified, anonymized interactions.',
  },
  {
    id: '06',
    label: 'Registry',
    icon: Smartphone,
    title: 'Device Registry',
    description:
      'Register IMEI numbers, serial IDs, and unique hardware identifiers to create bulletproof ownership proof that stands up in any recovery scenario.',
  },
]

// Smoother easing curves
const panelEase = [0.65, 0, 0.15, 1] as const  // buttery smooth expo-style ease
const contentEase = [0.25, 0.1, 0.25, 1] as const

export function BentoGrid() {
  const [activeIndex, setActiveIndex] = useState<number>(0)

  return (
    <section
      id="features"
      style={{
        height: '100vh',
        backgroundColor: '#fff',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        borderTop: '1px solid #E5E5E5',
        borderBottom: '1px solid #E5E5E5',
      }}
    >
      {/* Section label */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '24px',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        letterSpacing: '0.3em',
        color: '#A3A3A3',
        textTransform: 'uppercase',
        zIndex: 5,
        pointerEvents: 'none',
      }}>
        [ FEATURES ]
      </div>

      {features.map((feature, i) => {
        const isActive = activeIndex === i
        const Icon = feature.icon

        return (
          <motion.div
            key={feature.id}
            onClick={() => setActiveIndex(i)}
            style={{
              position: 'relative',
              height: '100%',
              borderRight: '1px solid #E5E5E5',
              cursor: 'pointer',
              overflow: 'hidden',
              backgroundColor: '#fff',
              minWidth: isActive ? 'auto' : '52px',
            }}
            animate={{ flex: isActive ? 8 : 1 }}
            transition={{
              duration: 0.85,
              ease: panelEase as unknown as number[],
            }}
          >
            {/* ─── COLLAPSED STATE ─── */}
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '28px 0',
                pointerEvents: isActive ? 'none' : 'auto',
              }}
              animate={{
                opacity: isActive ? 0 : 1,
                scale: isActive ? 0.95 : 1,
                filter: isActive ? 'blur(4px)' : 'blur(0px)',
              }}
              transition={{
                duration: 0.45,
                ease: contentEase as unknown as number[],
                delay: isActive ? 0 : 0.3,  // delay re-appearance so panel settles first
              }}
            >
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 500,
                color: '#000',
                letterSpacing: '0.1em',
                marginBottom: '24px',
              }}>
                {feature.id}
              </span>

              <div style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                fontFamily: 'var(--font-display)',
                fontSize: '14px',
                fontWeight: 500,
                color: '#525252',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginTop: 'auto',
                marginBottom: 'auto',
              }}>
                {feature.label}
              </div>
            </motion.div>

            {/* ─── EXPANDED STATE (AnimatePresence for smooth mount/unmount) ─── */}
            <AnimatePresence mode="wait">
              {isActive && (
                <motion.div
                  key={`expanded-${feature.id}`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    height: '100%',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }}
                  transition={{ duration: 0.5, delay: 0.2, ease: contentEase as unknown as number[] }}
                >
                  {/* ── LEFT: Visualization ── */}
                  <div style={{
                    position: 'relative',
                    borderRight: '1px solid #E5E5E5',
                    overflow: 'hidden',
                    backgroundColor: '#fff',
                  }}>
                    <FeatureVector id={feature.id} isActive={isActive} />

                    {/* Giant feature number */}
                    <motion.div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                        pointerEvents: 'none',
                      }}
                      initial={{ opacity: 0, scale: 0.8, y: 30 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        duration: 0.7,
                        delay: 0.35,
                        ease: panelEase as unknown as number[],
                      }}
                    >
                      <span style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: 'clamp(120px, 15vw, 200px)',
                        color: '#000',
                        opacity: 0.4,
                        letterSpacing: '-0.04em',
                        lineHeight: 1,
                        userSelect: 'none',
                      }}>
                        {feature.id}
                      </span>
                    </motion.div>

                    {/* Feature icon overlay */}
                    <motion.div
                      style={{
                        position: 'absolute',
                        bottom: '40px',
                        left: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        zIndex: 10,
                      }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.55,
                        delay: 0.55,
                        ease: contentEase as unknown as number[],
                      }}
                    >
                      <div style={{
                        width: '44px',
                        height: '44px',
                        border: '1px solid #E5E5E5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fff',
                      }}>
                        <Icon size={20} strokeWidth={1.5} color="#000" />
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        letterSpacing: '0.2em',
                        color: '#737373',
                        textTransform: 'uppercase',
                      }}>
                        {feature.label}
                      </span>
                    </motion.div>

                    {/* Number label — top left */}
                    <motion.span
                      style={{
                        position: 'absolute',
                        top: '20px',
                        left: '24px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#000',
                        letterSpacing: '0.1em',
                        zIndex: 10,
                      }}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: 0.3,
                        ease: contentEase as unknown as number[],
                      }}
                    >
                      {feature.id}
                    </motion.span>
                  </div>

                  {/* ── RIGHT: Content ── */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <div style={{
                      padding: '48px',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}>
                      <div>
                        {/* Label tag */}
                        <motion.span
                          style={{
                            display: 'inline-block',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            letterSpacing: '0.3em',
                            color: '#A3A3A3',
                            textTransform: 'uppercase',
                            marginBottom: '32px',
                          }}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.5,
                            delay: 0.4,
                            ease: contentEase as unknown as number[],
                          }}
                        >
                          [ {feature.id} — {feature.label} ]
                        </motion.span>

                        {/* Title */}
                        <motion.h3
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 600,
                            fontSize: 'clamp(28px, 3vw, 40px)',
                            color: '#000',
                            lineHeight: 1.15,
                            letterSpacing: '-0.02em',
                            marginBottom: '28px',
                          }}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.6,
                            delay: 0.48,
                            ease: panelEase as unknown as number[],
                          }}
                        >
                          {feature.title}
                        </motion.h3>
                      </div>

                      {/* Description */}
                      <motion.p
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '16px',
                          color: '#737373',
                          lineHeight: 1.8,
                          maxWidth: '460px',
                        }}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.55,
                          delay: 0.56,
                          ease: contentEase as unknown as number[],
                        }}
                      >
                        {feature.description}
                      </motion.p>

                      {/* Accent line */}
                      <motion.div
                        style={{
                          width: '48px',
                          height: '2px',
                          backgroundColor: '#000',
                          marginTop: '32px',
                        }}
                        initial={{ scaleX: 0, originX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{
                          duration: 0.5,
                          delay: 0.65,
                          ease: panelEase as unknown as number[],
                        }}
                      />
                    </div>

                    {/* Bottom bar */}
                    <motion.div
                      style={{
                        borderTop: '1px solid #E5E5E5',
                        padding: '24px 48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: 0.4,
                        delay: 0.7,
                        ease: 'easeOut',
                      }}
                    >
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        letterSpacing: '0.2em',
                        color: '#A3A3A3',
                        textTransform: 'uppercase',
                      }}>
                        SPORS / {feature.label}
                      </span>

                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: '#D4D4D4',
                        letterSpacing: '0.1em',
                      }}>
                        {feature.id} / 06
                      </span>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </section>
  )
}
