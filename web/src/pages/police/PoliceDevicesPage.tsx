import { CSSProperties, useEffect, useState } from 'react'
import { useTheme } from '../../hooks/ThemeContext'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/Card'

type Device = {
  id: string
  imei_primary: string
  serial_number: string
  make: string
  model: string
  status: string
  last_seen_at: string | null
  last_seen_lat: number | null
  last_seen_lng: number | null
  owner_id: string
  profiles: {
    full_name: string
    phone_number: string | null
  } | null
  lost_reports: Array<{
    id: string
    reported_at: string
    police_complaint_number: string | null
    reward_amount: number | null
    last_known_address: string | null
  }>
}

export function PoliceDevicesPage() {
  const { theme } = useTheme()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'lost' | 'stolen'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)

  useEffect(() => {
    loadDevices()
  }, [filter])

  const loadDevices = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('devices')
        .select(`
          id,
          imei_primary,
          serial_number,
          make,
          model,
          status,
          last_seen_at,
          last_seen_lat,
          last_seen_lng,
          owner_id,
          profiles(full_name, phone_number),
          lost_reports(id, reported_at, police_complaint_number, reward_amount, last_known_address)
        `)

      if (filter === 'all') {
        query = query.in('status', ['lost', 'stolen'])
      } else {
        query = query.eq('status', filter)
      }

      const { data, error } = await query.order('last_seen_at', { ascending: false, nullsFirst: false })

      if (error) throw error
      setDevices(data as Device[])
    } catch (error) {
      console.error('Error loading devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDevices = devices.filter(device => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      device.imei_primary.toLowerCase().includes(search) ||
      device.serial_number.toLowerCase().includes(search) ||
      device.make.toLowerCase().includes(search) ||
      device.model.toLowerCase().includes(search) ||
      device.profiles?.full_name?.toLowerCase().includes(search) ||
      device.lost_reports[0]?.police_complaint_number?.toLowerCase().includes(search)
    )
  })

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
  }

  const containerStyle: CSSProperties = {
    paddingTop: '32px',
    paddingBottom: '32px',
    paddingLeft: '32px',
    paddingRight: '32px',
    maxWidth: '1600px',
    margin: '0 auto',
  }

  const headerStyle: CSSProperties = {
    marginBottom: '32px',
  }

  const titleStyle: CSSProperties = {
    fontSize: '32px',
    fontWeight: 700,
    color: theme.text,
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  }

  const toolbarStyle: CSSProperties = {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  }

  const searchBarStyle: CSSProperties = {
    flex: 1,
    minWidth: '300px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    backgroundColor: theme.bgSurfaceDim,
    border: `1px solid ${theme.border}`,
    borderRadius: '0px',
  }

  const searchInputStyle: CSSProperties = {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: theme.text,
  }

  const filterButtonStyle = (isActive: boolean): CSSProperties => ({
    padding: '10px 20px',
    borderRadius: '0px',
    backgroundColor: isActive ? theme.text : theme.bgSurfaceDim,
    color: isActive ? theme.textInverse : theme.textSecondary,
    border: `1px solid ${isActive ? theme.text : theme.border}`,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  })

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: selectedDevice ? '1fr 400px' : '1fr',
    gap: '24px',
  }

  const devicesListStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  }

  const deviceCardStyle = (isSelected: boolean): CSSProperties => ({
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: `2px solid ${isSelected ? theme.text : theme.border}`,
    backgroundColor: isSelected ? `${theme.text}08` : theme.bgSurface,
  })

  const detailsPanelStyle: CSSProperties = {
    position: 'sticky',
    top: '32px',
    height: 'fit-content',
    maxHeight: 'calc(100vh - 96px)',
    overflow: 'auto',
  }

  if (loading) {
    return (
      <div style={{ ...containerStyle, textAlign: 'center', paddingTop: '120px' }}>
        <span className="material-icons" style={{ fontSize: '48px', color: theme.text, animation: 'spin 1s linear infinite' }}>
          sync
        </span>
        <p style={{ marginTop: '16px', color: theme.textSecondary }}>Loading devices...</p>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          <span className="material-icons" style={{ fontSize: '40px', color: theme.error }}>
            devices
          </span>
          Lost & Stolen Devices
        </h1>
        <p style={{ fontSize: '14px', color: theme.textSecondary }}>
          Tracking {filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div style={toolbarStyle}>
        <div style={searchBarStyle}>
          <span className="material-icons" style={{ color: theme.textTertiary, fontSize: '22px' }}>
            search
          </span>
          <input
            type="text"
            placeholder="Search by IMEI, serial, owner, complaint number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={searchInputStyle}
          />
          {searchQuery && (
            <span 
              className="material-icons" 
              style={{ color: theme.textTertiary, fontSize: '20px', cursor: 'pointer' }}
              onClick={() => setSearchQuery('')}
            >
              close
            </span>
          )}
        </div>

        <button
          style={filterButtonStyle(filter === 'all')}
          onClick={() => setFilter('all')}
        >
          All ({devices.length})
        </button>
        <button
          style={filterButtonStyle(filter === 'lost')}
          onClick={() => setFilter('lost')}
        >
          Lost ({devices.filter(d => d.status === 'lost').length})
        </button>
        <button
          style={filterButtonStyle(filter === 'stolen')}
          onClick={() => setFilter('stolen')}
        >
          Stolen ({devices.filter(d => d.status === 'stolen').length})
        </button>
      </div>

      <div style={gridStyle}>
        <div style={devicesListStyle}>
          {filteredDevices.length === 0 ? (
            <Card style={{ padding: '60px', textAlign: 'center' }}>
              <span className="material-icons" style={{ fontSize: '64px', color: theme.textTertiary, marginBottom: '16px' }}>
                search_off
              </span>
              <h2 style={{ color: theme.text, marginBottom: '8px' }}>No devices found</h2>
              <p style={{ color: theme.textSecondary }}>
                {searchQuery ? 'Try adjusting your search terms' : 'No lost or stolen devices reported'}
              </p>
            </Card>
          ) : (
            filteredDevices.map((device) => {
              const report = device.lost_reports[0]
              const hasLocation = device.last_seen_lat && device.last_seen_lng

              return (
                <Card
                  key={device.id}
                  style={deviceCardStyle(selectedDevice?.id === device.id)}
                  onClick={() => setSelectedDevice(device)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: 600, color: theme.text, marginBottom: '4px' }}>
                        {device.make} {device.model}
                      </h3>
                      <div style={{ fontSize: '14px', color: theme.textSecondary }}>
                        <span className="material-icons" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>
                          person
                        </span>
                        {device.profiles?.full_name || 'Unknown Owner'}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '6px 14px',
                        borderRadius: '0px',
                        backgroundColor: device.status === 'stolen' ? `${theme.error}20` : `${theme.textSecondary}20`,
                        color: device.status === 'stolen' ? theme.error : theme.textSecondary,
                        fontSize: '12px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      {device.status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px' }}>
                      <div style={{ color: theme.textTertiary, marginBottom: '4px' }}>IMEI</div>
                      <div style={{ color: theme.text, fontWeight: 500, fontFamily: 'monospace' }}>
                        {device.imei_primary}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px' }}>
                      <div style={{ color: theme.textTertiary, marginBottom: '4px' }}>Serial Number</div>
                      <div style={{ color: theme.text, fontWeight: 500, fontFamily: 'monospace' }}>
                        {device.serial_number}
                      </div>
                    </div>
                  </div>

                  {report?.police_complaint_number && (
                    <div style={{ 
                      padding: '10px 14px', 
                      backgroundColor: theme.bgSurfaceDim, 
                      borderRadius: '0px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ fontSize: '12px', color: theme.textTertiary, marginBottom: '4px' }}>
                        Police Complaint Number
                      </div>
                      <div style={{ fontSize: '14px', color: theme.text, fontWeight: 600 }}>
                        {report.police_complaint_number}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${theme.border}` }}>
                    {hasLocation && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openInMaps(device.last_seen_lat!, device.last_seen_lng!)
                        }}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          backgroundColor: theme.text,
                          color: theme.textInverse,
                          border: 'none',
                          borderRadius: '0px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <span className="material-icons" style={{ fontSize: '18px' }}>location_on</span>
                        View Location
                      </button>
                    )}
                    {device.profiles?.phone_number && (
                      <a
                        href={`tel:${device.profiles.phone_number}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          backgroundColor: theme.text,
                          color: theme.textInverse,
                          border: 'none',
                          borderRadius: '0px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          textDecoration: 'none',
                        }}
                      >
                        <span className="material-icons" style={{ fontSize: '18px' }}>phone</span>
                        Call Owner
                      </a>
                    )}
                  </div>

                  {device.last_seen_at && (
                    <div style={{ fontSize: '12px', color: theme.textTertiary, marginTop: '12px' }}>
                      Last seen: {new Date(device.last_seen_at).toLocaleString()}
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>

        {selectedDevice && (
          <Card style={detailsPanelStyle}>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: theme.text }}>
                  Device Details
                </h2>
                <button
                  onClick={() => setSelectedDevice(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.textSecondary,
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  <span className="material-icons">close</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: theme.textTertiary, marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>
                    Device Information
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: theme.text, marginBottom: '8px' }}>
                    {selectedDevice.make} {selectedDevice.model}
                  </div>
                  <div style={{ fontSize: '14px', color: theme.textSecondary }}>
                    Status: <span style={{ fontWeight: 600, color: selectedDevice.status === 'stolen' ? theme.error : theme.textSecondary }}>
                      {selectedDevice.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div style={{ height: '1px', backgroundColor: theme.border }} />

                <div>
                  <div style={{ fontSize: '12px', color: theme.textTertiary, marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                    Owner Information
                  </div>
                  <div style={{ fontSize: '14px', color: theme.text, marginBottom: '6px' }}>
                    <span className="material-icons" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '8px', color: theme.text }}>
                      person
                    </span>
                    {selectedDevice.profiles?.full_name || 'Unknown'}
                  </div>
                  {selectedDevice.profiles?.phone_number && (
                    <div style={{ fontSize: '14px', color: theme.text }}>
                      <span className="material-icons" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '8px', color: theme.text }}>
                        phone
                      </span>
                      {selectedDevice.profiles.phone_number}
                    </div>
                  )}
                </div>

                <div style={{ height: '1px', backgroundColor: theme.border }} />

                <div>
                  <div style={{ fontSize: '12px', color: theme.textTertiary, marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                    Identifiers
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', color: theme.textTertiary, marginBottom: '4px' }}>IMEI Number</div>
                    <div style={{ fontSize: '14px', color: theme.text, fontWeight: 500, fontFamily: 'monospace' }}>
                      {selectedDevice.imei_primary}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: theme.textTertiary, marginBottom: '4px' }}>Serial Number</div>
                    <div style={{ fontSize: '14px', color: theme.text, fontWeight: 500, fontFamily: 'monospace' }}>
                      {selectedDevice.serial_number}
                    </div>
                  </div>
                </div>

                {selectedDevice.lost_reports[0] && (
                  <>
                    <div style={{ height: '1px', backgroundColor: theme.border }} />
                    <div>
                      <div style={{ fontSize: '12px', color: theme.textTertiary, marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                        Report Information
                      </div>
                      {selectedDevice.lost_reports[0].police_complaint_number && (
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ fontSize: '12px', color: theme.textTertiary, marginBottom: '4px' }}>Complaint Number</div>
                          <div style={{ fontSize: '14px', color: theme.text, fontWeight: 600 }}>
                            {selectedDevice.lost_reports[0].police_complaint_number}
                          </div>
                        </div>
                      )}
                      {selectedDevice.lost_reports[0].reward_amount && (
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ fontSize: '12px', color: theme.textTertiary, marginBottom: '4px' }}>Reward Amount</div>
                          <div style={{ fontSize: '14px', color: theme.text, fontWeight: 600 }}>
                            ₹{selectedDevice.lost_reports[0].reward_amount.toLocaleString()}
                          </div>
                        </div>
                      )}
                      {selectedDevice.lost_reports[0].last_known_address && (
                        <div>
                          <div style={{ fontSize: '12px', color: theme.textTertiary, marginBottom: '4px' }}>Last Known Location</div>
                          <div style={{ fontSize: '14px', color: theme.text }}>
                            {selectedDevice.lost_reports[0].last_known_address}
                          </div>
                        </div>
                      )}
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '12px', color: theme.textTertiary, marginBottom: '4px' }}>Reported At</div>
                        <div style={{ fontSize: '14px', color: theme.text }}>
                          {new Date(selectedDevice.lost_reports[0].reported_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {(selectedDevice.last_seen_lat && selectedDevice.last_seen_lng) && (
                  <>
                    <div style={{ height: '1px', backgroundColor: theme.border }} />
                    <div>
                      <div style={{ fontSize: '12px', color: theme.textTertiary, marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                        Location Tracking
                      </div>
                      <button
                        onClick={() => openInMaps(selectedDevice.last_seen_lat!, selectedDevice.last_seen_lng!)}
                        style={{
                          width: '100%',
                          padding: '14px',
                          backgroundColor: theme.text,
                          color: theme.textInverse,
                          border: 'none',
                          borderRadius: '0px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        <span className="material-icons" style={{ fontSize: '20px' }}>map</span>
                        Open in Google Maps
                      </button>
                      {selectedDevice.last_seen_at && (
                        <div style={{ fontSize: '12px', color: theme.textTertiary, marginTop: '8px', textAlign: 'center' }}>
                          Last seen: {new Date(selectedDevice.last_seen_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
