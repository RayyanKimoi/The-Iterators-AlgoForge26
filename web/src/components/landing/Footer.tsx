import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerCols = [
    {
      title: 'Product',
      links: ['Features', 'How It Works', 'Security', 'Pricing'],
    },
    {
      title: 'Company',
      links: ['About', 'Blog', 'Careers', 'Contact'],
    },
    {
      title: 'Legal',
      links: ['Privacy Policy', 'Terms of Service', 'Report Bug'],
    },
  ]

  return (
    <footer style={{ backgroundColor: '#000', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '80px 0 48px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px' }}>
        {/* Top section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '64px', marginBottom: '80px' }}>
          {/* Logo column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Shield style={{ width: '20px', height: '20px', color: '#fff' }} strokeWidth={1.5} />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: '16px',
                  letterSpacing: '0.15em',
                  color: '#fff',
                }}
              >
                SPORS
              </span>
            </div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.3)',
                lineHeight: 1.7,
                maxWidth: '260px',
              }}
            >
              Secure Phone Ownership & Recovery System. Crowdsourced device protection for everyone.
            </p>
          </motion.div>

          {/* Link columns */}
          {footerCols.map((col, colIdx) => (
            <motion.div
              key={col.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: (colIdx + 1) * 0.1 }}
            >
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 500,
                  fontSize: '11px',
                  letterSpacing: '0.15em',
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  marginBottom: '20px',
                }}
              >
                {col.title}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {col.links.map((link) => (
                  <a
                    key={link}
                    href="#"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.35)',
                      textDecoration: 'none',
                      transition: 'color 0.3s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: '24px' }} />

        {/* Bottom Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.2)',
            }}
          >
            © {currentYear} SPORS
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.2)',
            }}
          >
            The Iterators — AlgoForge 2026
          </span>
        </div>
      </div>
    </footer>
  )
}
