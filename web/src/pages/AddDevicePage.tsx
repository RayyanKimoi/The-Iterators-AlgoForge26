import { CSSProperties, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDevices, isValidIMEI } from '../hooks/useDevices'
import { useTheme } from '../hooks/ThemeContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Input } from '../components/Input'

const BRANDS = [
  'Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Oppo', 'Vivo',
  'Realme', 'Motorola', 'Nokia', 'Sony', 'LG', 'Huawei', 'Other',
]

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh',
]

const COLORS = [
  { name: 'Black', value: '#1a1a1a' }, { name: 'White', value: '#f5f5f5' },
  { name: 'Silver', value: '#c0c0c0' }, { name: 'Gold', value: '#ffd700' },
  { name: 'Rose Gold', value: '#e8b4b8' }, { name: 'Blue', value: '#4a90d9' },
  { name: 'Green', value: '#4caf50' }, { name: 'Red', value: '#ef5350' },
  { name: 'Purple', value: '#9c27b0' },
]

export function AddDevicePage() {
  const navigate = useNavigate()
  const { addDevice } = useDevices()
  const { theme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [state, setState] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [imeiPrimary, setImeiPrimary] = useState('')
  const [imeiSecondary, setImeiSecondary] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [color, setColor] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')

  const imei1Valid = imeiPrimary.length === 15 && isValidIMEI(imeiPrimary)
  const imei2Valid = !imeiSecondary || (imeiSecondary.length === 15 && isValidIMEI(imeiSecondary))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!imei1Valid) { setError('Primary IMEI is invalid.'); setLoading(false); return }
    if (!imei2Valid) { setError('Secondary IMEI is invalid.'); setLoading(false); return }

    try {
      const { error } = await addDevice({
        state, make, model, imei_primary: imeiPrimary,
        imei_secondary: imeiSecondary || null, serial_number: serialNumber,
        color: color || null, purchase_date: purchaseDate || null,
      })
      if (error) throw error
      navigate('/devices')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add device')
    } finally {
      setLoading(false)
    }
  }

  const selectStyle: CSSProperties = {
    width: '100%', padding: '12px 16px', backgroundColor: theme.inputBg,
    border: `1px solid ${theme.inputBorder}`, color: theme.inputText,
    fontSize: '14px', cursor: 'pointer', fontFamily: "'Space Grotesk', system-ui, sans-serif",
    fontWeight: 500, paddingRight: '40px',
  }

  const labelStyle: CSSProperties = {
    fontSize: '11px', fontWeight: 500, color: theme.textSecondary,
    marginBottom: '6px', display: 'block', textTransform: 'uppercase',
    letterSpacing: '0.15em', fontFamily: "'JetBrains Mono', monospace",
  }

  const imeiStatusStyle = (isValid: boolean, value: string): CSSProperties => ({
    fontSize: '13px', marginTop: '8px', fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: '6px',
    color: !value ? theme.textSecondary : isValid ? theme.text : theme.error,
  })

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <span style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.2em', color: theme.textTertiary, textTransform: 'uppercase', marginBottom: '8px' }}>[ 02 — Register ]</span>
        <h1 style={{ fontSize: '32px', fontWeight: 600, color: theme.text, marginBottom: '8px', letterSpacing: '-0.02em', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Register New Device</h1>
        <p style={{ color: theme.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>Add your device to SPORS to protect it and enable recovery features</p>
      </div>

      <Card variant="elevated" padding="32px">
        {error && (
          <div style={{ backgroundColor: theme.errorBg, color: theme.error, padding: '16px 20px', fontSize: '14px', border: `2px solid ${theme.errorBorder}`, display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600, marginBottom: '24px' }}>
            <span className="material-icons">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div>
              <label style={labelStyle}>State *</label>
              <select style={selectStyle} value={state} onChange={(e) => setState(e.target.value)} required>
                <option value="">Select state</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Brand *</label>
              <select style={selectStyle} value={make} onChange={(e) => setMake(e.target.value)} required>
                <option value="">Select brand</option>
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <Input label="Model *" placeholder="e.g., iPhone 15 Pro" value={model} onChange={(e) => setModel(e.target.value)} required />
            <Input label="Serial Number *" placeholder="Device serial number" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div>
              <Input label="Primary IMEI *" placeholder="15-digit IMEI" value={imeiPrimary} onChange={(e) => setImeiPrimary(e.target.value.replace(/\D/g, '').slice(0, 15))} maxLength={15} required />
              <div style={imeiStatusStyle(imei1Valid, imeiPrimary)}>
                {!imeiPrimary ? (<><span className="material-icons" style={{ fontSize: '16px' }}>info</span>Enter 15-digit IMEI</>) : imei1Valid ? (<><span className="material-icons" style={{ fontSize: '16px' }}>check_circle</span>Valid IMEI</>) : (<><span className="material-icons" style={{ fontSize: '16px' }}>error</span>Invalid IMEI</>)}
              </div>
            </div>
            <div>
              <Input label="Secondary IMEI (Dual SIM)" placeholder="15-digit IMEI (optional)" value={imeiSecondary} onChange={(e) => setImeiSecondary(e.target.value.replace(/\D/g, '').slice(0, 15))} maxLength={15} />
              <div style={imeiStatusStyle(imei2Valid, imeiSecondary)}>
                {!imeiSecondary ? (<><span className="material-icons" style={{ fontSize: '16px' }}>info</span>Optional for dual SIM phones</>) : imei2Valid ? (<><span className="material-icons" style={{ fontSize: '16px' }}>check_circle</span>Valid IMEI</>) : (<><span className="material-icons" style={{ fontSize: '16px' }}>error</span>Invalid IMEI</>)}
              </div>
            </div>
          </div>

          <Input label="Purchase Date (Optional)" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />

          <div>
            <label style={labelStyle}>Device Color (Optional)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
              {COLORS.map((c) => (
                <div key={c.name} style={{ width: '40px', height: '40px', backgroundColor: c.value, cursor: 'pointer', border: color === c.value ? `3px solid ${theme.text}` : `1px solid ${theme.border}`, transition: 'all 0.2s ease' }}
                  onClick={() => setColor(color === c.value ? '' : c.value)} title={c.name}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                />
              ))}
            </div>
          </div>

          <Card variant="outlined" style={{ padding: '20px', marginTop: '8px', backgroundColor: theme.bgSurfaceDim }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: theme.bgSurfaceHover, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-icons" style={{ color: theme.textSecondary, fontSize: '24px' }}>info</span>
              </div>
              <div>
                <p style={{ color: theme.text, fontSize: '14px', marginBottom: '12px', fontWeight: 700 }}>How to find your IMEI:</p>
                <ul style={{ color: theme.textSecondary, fontSize: '14px', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
                  <li>Dial <strong>*#06#</strong> on your phone</li>
                  <li>Check <strong>Settings → About Phone → IMEI</strong></li>
                  <li>Look on the original box or receipt</li>
                </ul>
              </div>
            </div>
          </Card>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <Button variant="ghost" onClick={() => navigate('/devices')} style={{ border: `1px solid ${theme.border}` }} icon="close">Cancel</Button>
            <Button type="submit" variant="outline" loading={loading} disabled={!imei1Valid || !imei2Valid} icon="check_circle" size="large">Register Device</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
