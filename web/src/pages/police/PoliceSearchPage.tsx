import { CSSProperties, useState } from 'react'
import { useTheme } from '../../hooks/ThemeContext'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'

type SearchResult = {
  type: 'device' | 'report' | 'user'
  id: string
  title: string
  subtitle: string
  details: string[]
  data: any
}

export function PoliceSearchPage() {
  const { theme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'imei' | 'serial' | 'complaint' | 'phone'>('all')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const performSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setSearched(true)
    const results: SearchResult[] = []

    try {
      // Search devices
      if (searchType === 'all' || searchType === 'imei' || searchType === 'serial') {
        const { data: devices } = await supabase
          .from('devices')
          .select('*, profiles(full_name, phone_number)')
          .or(`imei_primary.ilike.%${searchQuery}%,serial_number.ilike.%${searchQuery}%,make.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%`)
          .limit(20)

        devices?.forEach((device: any) => {
          results.push({
            type: 'device',
            id: device.id,
            title: `${device.make} ${device.model}`,
            subtitle: `Status: ${device.status.toUpperCase()}`,
            details: [
              `IMEI: ${device.imei_primary}`,
              `Serial: ${device.serial_number}`,
              `Owner: ${device.profiles?.full_name || 'Unknown'}`,
            ],
            data: device,
          })
        })
      }

      // Search reports
      if (searchType === 'all' || searchType === 'complaint') {
        const { data: reports } = await supabase
          .from('lost_reports')
          .select('*, devices(make, model, imei_primary), profiles(full_name, phone_number)')
          .or(`police_complaint_number.ilike.%${searchQuery}%,incident_description.ilike.%${searchQuery}%`)
          .limit(20)

        reports?.forEach((report: any) => {
          results.push({
            type: 'report',
            id: report.id,
            title: report.police_complaint_number || 'No Complaint Number',
            subtitle: `${report.devices?.make} ${report.devices?.model}`,
            details: [
              `Owner: ${report.profiles?.full_name || 'Unknown'}`,
              `Status: ${report.is_active ? 'Active' : 'Resolved'}`,
              `Reported: ${new Date(report.reported_at).toLocaleDateString()}`,
            ],
            data: report,
          })
        })
      }

      // Search users
      if (searchType === 'all' || searchType === 'phone') {
        const { data: users } = await supabase
          .from('profiles')
          .select('*')
          .or(`full_name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`)
          .eq('role', 'civilian')
          .limit(20)

        users?.forEach((user: any) => {
          results.push({
            type: 'user',
            id: user.id,
            title: user.full_name || 'Unknown User',
            subtitle: user.phone_number || 'No phone number',
            details: [
              `Aadhaar: ${user.aadhaar_verified ? 'Verified' : 'Not Verified'}`,
              `Joined: ${new Date(user.created_at).toLocaleDateString()}`,
            ],
            data: user,
          })
        })
      }

      setResults(results)
    } catch (error) {
      console.error('Search error:', error)
      alert('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const containerStyle: CSSProperties = {
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
  }

  const headerStyle: CSSProperties = {
    marginBottom: '32px',
  }

  const titleStyle: CSSProperties = {
    fontSize: '32px',
    fontWeight: 700,
    color: theme.text,
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  }

  const searchBoxStyle: CSSProperties = {
    marginBottom: '32px',
  }

  const filterButtonsStyle: CSSProperties = {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  }

  const filterButtonStyle = (isActive: boolean): CSSProperties => ({
    padding: '8px 18px',
    borderRadius: '0px',
    backgroundColor: isActive ? theme.text : theme.bgSurfaceDim,
    color: isActive ? theme.textInverse : theme.textSecondary,
    border: `1px solid ${isActive ? theme.text : theme.border}`,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  })

  const searchFormStyle: CSSProperties = {
    display: 'flex',
    gap: '12px',
  }

  const resultsStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  }

  const resultCardStyle: CSSProperties = {
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'device': return 'smartphone'
      case 'report': return 'description'
      case 'user': return 'person'
      default: return 'search'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'device': return theme.text
      case 'report': return theme.error
      case 'user': return theme.text
      default: return theme.textTertiary
    }
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          <span className="material-icons" style={{ fontSize: '40px', color: theme.text }}>
            search
          </span>
          Advanced Search
        </h1>
        <p style={{ fontSize: '14px', color: theme.textSecondary }}>
          Search by IMEI, serial number, complaint number, phone number, or owner name
        </p>
      </div>

      <Card style={searchBoxStyle}>
        <div style={{ padding: '24px' }}>
          <div style={filterButtonsStyle}>
            {[
              { value: 'all', label: 'All' },
              { value: 'imei', label: 'IMEI' },
              { value: 'serial', label: 'Serial Number' },
              { value: 'complaint', label: 'Complaint Number' },
              { value: 'phone', label: 'Phone Number' },
            ].map((filter) => (
              <button
                key={filter.value}
                style={filterButtonStyle(searchType === filter.value)}
                onClick={() => setSearchType(filter.value as any)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div style={searchFormStyle}>
            <div style={{ flex: 1 }}>
              <Input
                placeholder={`Search ${searchType === 'all' ? 'anything' : searchType}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') performSearch()
                }}
                icon="search"
                fullWidth
              />
            </div>
            <Button
              onClick={performSearch}
              loading={loading}
              disabled={!searchQuery.trim()}
              size="large"
            >
              Search
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <span className="material-icons" style={{ fontSize: '48px', color: theme.text, animation: 'spin 1s linear infinite' }}>
            sync
          </span>
          <p style={{ marginTop: '16px', color: theme.textSecondary }}>Searching...</p>
        </div>
      ) : searched && results.length === 0 ? (
        <Card style={{ padding: '60px', textAlign: 'center' }}>
          <span className="material-icons" style={{ fontSize: '64px', color: theme.textTertiary, marginBottom: '16px' }}>
            search_off
          </span>
          <h2 style={{ color: theme.text, marginBottom: '8px' }}>No results found</h2>
          <p style={{ color: theme.textSecondary }}>
            Try different search terms or filter options
          </p>
        </Card>
      ) : results.length > 0 ? (
        <>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: theme.text, marginBottom: '16px' }}>
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </h2>
          <div style={resultsStyle}>
            {results.map((result) => (
              <Card
                key={`${result.type}-${result.id}`}
                style={resultCardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = `0 4px 16px ${getTypeColor(result.type)}30`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '0px',
                      backgroundColor: `${getTypeColor(result.type)}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: '28px', color: getTypeColor(result.type) }}>
                      {getTypeIcon(result.type)}
                    </span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: theme.text, marginBottom: '4px' }}>
                          {result.title}
                        </h3>
                        <p style={{ fontSize: '14px', color: theme.textSecondary }}>
                          {result.subtitle}
                        </p>
                      </div>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '0px',
                          backgroundColor: `${getTypeColor(result.type)}20`,
                          color: getTypeColor(result.type),
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {result.type}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: theme.textSecondary }}>
                      {result.details.map((detail, index) => (
                        <span key={index}>
                          {detail}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card style={{ padding: '60px', textAlign: 'center' }}>
          <span className="material-icons" style={{ fontSize: '64px', color: theme.textTertiary, marginBottom: '16px' }}>
            manage_search
          </span>
          <h2 style={{ color: theme.text, marginBottom: '8px' }}>Start Searching</h2>
          <p style={{ color: theme.textSecondary }}>
            Enter search terms above to find devices, reports, or users
          </p>
        </Card>
      )}
    </div>
  )
}
