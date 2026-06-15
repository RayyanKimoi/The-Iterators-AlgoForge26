import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomCursor } from '../components/landing/CustomCursor'
import { InteractiveGrid } from '../components/landing/InteractiveGrid'
import { Navbar } from '../components/landing/Navbar'
import { Hero } from '../components/landing/Hero'
import { GridRuler } from '../components/landing/GridRuler'
import { BentoGrid } from '../components/landing/BentoGrid'
import { HowItWorks } from '../components/landing/HowItWorks'
import { Stats } from '../components/landing/Stats'
import { CTA } from '../components/landing/CTA'
import { Footer } from '../components/landing/Footer'

gsap.registerPlugin(ScrollTrigger)

export function LandingPage() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      ScrollTrigger.refresh()
    }, 500)

    return () => {
      clearTimeout(timeout)
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <div className="custom-cursor-area" style={{ backgroundColor: '#fff', minHeight: '100vh', fontFamily: 'var(--font-body)', position: 'relative' }}>
      <CustomCursor />
      <InteractiveGrid />
      <Navbar />
      <main>
        <Hero />

        <div style={{ padding: '0', backgroundColor: '#fff' }}>
          <GridRuler label="Sec 01" />
        </div>

        <BentoGrid />

        <div style={{ padding: '0', backgroundColor: '#FAFAFA' }}>
          <GridRuler label="Sec 02" />
        </div>

        <HowItWorks />

        {/* Stats flows directly — black bg creates natural separation */}
        <Stats />

        <CTA />
      </main>
      <Footer />
    </div>
  )
}
