import { CSSProperties, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDevices, Device } from '../hooks/useDevices'
import { useTheme } from '../hooks/ThemeContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'

export function DevicesPage() {
  const navigate = useNavigate()
  const { devices, loading, error: devicesError, markAsLost, markAsFound, deleteDevice } = useDevices()
  const { theme } = useTheme()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)

  const handleMarkLost = async (device: Device) => {
    setActionLoading(device.id)
    await markAsLost(device.id)
    setActionLoading(null)
  }

  const handleMarkFound = async (device: Device) => {
    setActionLoading(device.id)
    await markAsFound(device.id)
    setActionLoading(null)
  }

  const handleDelete = async (id: string) => {
    setActionLoading(id)
    await deleteDevice(id)
    setActionLoading(null)
    setConfirmDelete(null)
  }

  const containerStyle: CSSProperties = {
    padding: '48px',
    maxWidth: '1200px',
    margin: '0 auto',
  }

  const statusBadgeStyle = (status: string): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontFamily: "'JetBrains Mono', monospace",
    backgroundColor: status === 'lost' || status === 'stolen' ? theme.errorBg : theme.bgSurfaceDim,
    color: status === 'lost' || status === 'stolen' ? theme.error : theme.text,
    border: `1px solid ${status === 'lost' || status === 'stolen' ? theme.errorBorder : theme.border}`,
  })

  const infoRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: `1px solid ${theme.border}`,
  }

  const labelStyle: CSSProperties = {
    color: theme.textSecondary,
    fontSize: '13px',
    fontFamily: "'JetBrains Mono', monospace",
  }

  const valueStyle: CSSProperties = {
    color: theme.text,
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: "'JetBrains Mono', monospace",
  }

  const modalOverlayStyle: CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: theme.modalOverlay,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  }

  const modalStyle: CSSProperties = {
    backgroundColor: theme.modalBg,
    padding: '32px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    border: `1px solid ${theme.border}`,
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <div style={{ width: '24px', height: '24px', border: `2px solid ${theme.border}`, borderTopColor: theme.text, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: theme.textTertiary, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading devices...</div>
        </div>
      </div>
    )
  }

  if (devicesError) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <span className="material-icons" style={{ fontSize: '48px', color: theme.error, marginBottom: '16px' }}>error_outline</span>
          <h2 style={{ color: theme.text, marginBottom: '8px' }}>Failed to load devices</h2>
          <p style={{ color: theme.textSecondary, marginBottom: '24px', fontSize: '14px' }}>{devicesError}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
        <div>
          <span style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.2em', color: theme.textTertiary, textTransform: 'uppercase', marginBottom: '8px' }}>
            [ 01 — Devices ]
          </span>
          <h1 style={{ fontSize: '32px', fontWeight: 600, color: theme.text, fontFamily: "'Space Grotesk', system-ui, sans-serif", letterSpacing: '-0.02em' }}>
            My Devices
          </h1>
        </div>
        <Button variant="outline" onClick={() => navigate('/add-device')} icon="add_circle">
          Register New Device
        </Button>
      </header>

      {devices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 40px', border: `1px solid ${theme.border}`, backgroundColor: theme.bgSurface }}>
          <span className="material-icons" style={{ fontSize: '48px', color: theme.border, display: 'block', marginBottom: '20px' }}>devices</span>
          <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: '24px', fontWeight: 600, color: theme.text, marginBottom: '8px' }}>No devices yet</h2>
          <p style={{ fontSize: '14px', color: theme.textSecondary, marginBottom: '28px', maxWidth: '400px', margin: '0 auto 28px', lineHeight: 1.6 }}>
            Register your first device to begin tracking and securing your electronics.
          </p>
          <Button onClick={() => navigate('/add-device')}>Register Your First Device</Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1px', border: `1px solid ${theme.border}`, backgroundColor: theme.border }}>
          {devices.map((device) => (
            <Card key={device.id} style={{ borderRadius: 0, border: 'none' }} hoverable={false}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: theme.bgSurfaceDim, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${theme.border}` }}>
                      <span className="material-icons" style={{ fontSize: '22px', color: theme.text }}>smartphone</span>
                    </div>
                    <div>
                      <h3 style={{ fontFamily: "'Space Grotesk'", color: theme.text, fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                        {device.make} {device.model}
                      </h3>
                      <div style={statusBadgeStyle(device.status)}>
                        <span className="material-icons" style={{ fontSize: '14px' }}>
                          {device.status === 'lost' || device.status === 'stolen' ? 'warning' : 'verified'}
                        </span>
                        {device.status}
                      </div>
                    </div>
                  </div>
                </div>
                {device.color && (
                  <div style={{ width: '24px', height: '24px', backgroundColor: device.color, border: `1px solid ${theme.border}` }} />
                )}
              </div>

              <div style={infoRowStyle}>
                <span style={labelStyle}>SPORS Key</span>
                <span style={valueStyle}>{device.spors_key || '—'}</span>
              </div>
              <div style={infoRowStyle}>
                <span style={labelStyle}>Primary IMEI</span>
                <span style={valueStyle}>{device.imei_primary}</span>
              </div>
              {device.imei_secondary && (
                <div style={infoRowStyle}>
                  <span style={labelStyle}>Secondary IMEI</span>
                  <span style={valueStyle}>{device.imei_secondary}</span>
                </div>
              )}
              <div style={infoRowStyle}>
                <span style={labelStyle}>Serial Number</span>
                <span style={valueStyle}>{device.serial_number}</span>
              </div>
              <div style={{ ...infoRowStyle, borderBottom: 'none' }}>
                <span style={labelStyle}>Registered</span>
                <span style={valueStyle}>{new Date(device.created_at).toLocaleDateString()}</span>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                <Button variant="ghost" size="small" onClick={() => setSelectedDevice(device)} icon="info" fullWidth
                  style={{ border: `1px solid ${theme.border}` }}>
                  View Details
                </Button>
                {device.status === 'lost' || device.status === 'stolen' ? (
                  <Button variant="outline" size="small" onClick={() => handleMarkFound(device)}
                    loading={actionLoading === device.id} icon="check_circle" fullWidth>
                    Mark Found
                  </Button>
                ) : (
                  <Button variant="danger" size="small" onClick={() => handleMarkLost(device)}
                    loading={actionLoading === device.id} icon="warning" fullWidth>
                    Report Lost
                  </Button>
                )}
                <Button variant="ghost" size="small" onClick={() => setConfirmDelete(device.id)} icon="delete"
                  style={{ color: theme.error, border: `1px solid ${theme.error}` }} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Device Details Modal */}
      {selectedDevice && (
        <div style={modalOverlayStyle} onClick={() => setSelectedDevice(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: '20px', fontWeight: 600, color: theme.text }}>Device Details</h2>
              <button onClick={() => setSelectedDevice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textSecondary }}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: theme.bgSurfaceDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: `1px solid ${theme.border}` }}>
                <span className="material-icons" style={{ fontSize: '32px', color: theme.text }}>smartphone</span>
              </div>
              <h3 style={{ fontFamily: "'Space Grotesk'", color: theme.text, marginBottom: '8px' }}>
                {selectedDevice.make} {selectedDevice.model}
              </h3>
              <span style={statusBadgeStyle(selectedDevice.status)}>
                {selectedDevice.status.charAt(0).toUpperCase() + selectedDevice.status.slice(1)}
              </span>
            </div>

            <div style={{ backgroundColor: theme.bgSurfaceDim, padding: '16px', border: `1px solid ${theme.border}` }}>
              {[
                ['State', selectedDevice.state || '—'],
                ['SPORS Key', selectedDevice.spors_key || '—'],
                ['Primary IMEI', selectedDevice.imei_primary],
                ['Secondary IMEI', selectedDevice.imei_secondary || '—'],
                ['Serial Number', selectedDevice.serial_number],
                ['Color', selectedDevice.color || '—'],
                ['Purchase Date', selectedDevice.purchase_date ? new Date(selectedDevice.purchase_date).toLocaleDateString() : '—'],
                ['BLE Active', selectedDevice.is_ble_active ? 'Yes' : 'No'],
                ['Last Seen', selectedDevice.last_seen_at ? new Date(selectedDevice.last_seen_at).toLocaleString() : 'Never'],
                ['Registered', new Date(selectedDevice.created_at).toLocaleString()],
              ].map(([label, value], i, arr) => (
                <div key={label} style={{ ...infoRowStyle, borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${theme.border}` }}>
                  <span style={labelStyle}>{label}</span>
                  <span style={valueStyle}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              {selectedDevice.status === 'lost' || selectedDevice.status === 'stolen' ? (
                <Button variant="outline" fullWidth onClick={() => { handleMarkFound(selectedDevice); setSelectedDevice(null) }}
                  loading={actionLoading === selectedDevice.id}>Mark as Found</Button>
              ) : (
                <Button variant="danger" fullWidth onClick={() => { handleMarkLost(selectedDevice); setSelectedDevice(null) }}
                  loading={actionLoading === selectedDevice.id}>Report Lost</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div style={modalOverlayStyle} onClick={() => setConfirmDelete(null)}>
          <div style={{ ...modalStyle, maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Space Grotesk'", color: theme.text, marginBottom: '8px', fontSize: '18px' }}>Delete Device?</h3>
            <p style={{ color: theme.textSecondary, marginBottom: '20px', fontSize: '14px', lineHeight: 1.6 }}>
              This action cannot be undone. The device will be removed from your account.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)} style={{ border: `1px solid ${theme.border}` }}>Cancel</Button>
              <Button variant="danger" onClick={() => handleDelete(confirmDelete)} loading={actionLoading === confirmDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
