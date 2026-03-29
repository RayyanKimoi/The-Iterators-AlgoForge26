import { CSSProperties, useEffect, useState } from 'react'
import { Colors } from '../../lib/colors'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/Card'
import { useNavigate } from 'react-router-dom'

type DashboardStats = {
  totalLostDevices: number
  activeReports: number
  totalChats: number
  devicesRecovered: number
  recentAlerts: number
  totalUsers: number
}

type RecentActivity = {
  id: string
  type: 'report' | 'chat' | 'beacon' | 'recovery'
  title: string
  description: string
  timestamp: string
  icon: string
  color: string
}

export function PoliceDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    totalLostDevices: 0,
    activeReports: 0,
    totalChats: 0,
    devicesRecovered: 0,
    recentAlerts: 0,
    totalUsers: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Get all stats in parallel
      const [
        lostDevicesRes,
        activeReportsRes,
        chatsRes,
        recoveredRes,
        alertsRes,
        usersRes,
      ] = await Promise.all([
        supabase.from('devices').select('*', { count: 'exact', head: true }).in('status', ['lost', 'stolen']),
        supabase.from('lost_reports').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('chat_rooms').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('devices').select('*', { count: 'exact', head: true }).in('status', ['found', 'recovered']),
        supabase.from('beacon_logs').select('*', { count: 'exact', head: true }).gte('reported_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'civilian'),
      ])

      setStats({
        totalLostDevices: lostDevicesRes.count || 0,
        activeReports: activeReportsRes.count || 0,
        totalChats: chatsRes.count || 0,
        devicesRecovered: recoveredRes.count || 0,
        recentAlerts: alertsRes.count || 0,
        totalUsers: usersRes.count || 0,
      })

      // Load recent activity
      await loadRecentActivity()
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentActivity = async () => {
    const activities: RecentActivity[] = []

    // Recent lost reports
    const { data: reports } = await supabase
      .from('lost_reports')
      .select('id, reported_at, devices(make, model)')
      .order('reported_at', { ascending: false })
      .limit(3)

    reports?.forEach((report: any) => {
      activities.push({
        id: report.id,
        type: 'report',
        title: 'New Lost Report',
        description: `${report.devices?.make} ${report.devices?.model}`,
        timestamp: report.reported_at,
        icon: 'report',
        color: Colors.error,
      })
    })

    // Recent beacon detections
    const { data: beacons } = await supabase
      .from('beacon_logs')
      .select('id, reported_at, device_id, devices(make, model)')
      .order('reported_at', { ascending: false })
      .limit(3)

    beacons?.forEach((beacon: any) => {
      activities.push({
        id: beacon.id,
        type: 'beacon',
        title: 'Device Detected',
        description: `${beacon.devices?.make} ${beacon.devices?.model}`,
        timestamp: beacon.reported_at,
        icon: 'my_location',
        color: Colors.secondary,
      })
    })

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setRecentActivity(activities.slice(0, 8))
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
    color: Colors.onSurface,
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  }

  const subtitleStyle: CSSProperties = {
    fontSize: '16px',
    color: Colors.onSurfaceVariant,
  }

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  }

  const statCardStyle: CSSProperties = {
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: `1px solid ${Colors.outlineVariant}`,
  }

  const activitySectionStyle: CSSProperties = {
    marginTop: '32px',
  }

  const activityListStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  }

  const activityItemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    borderLeft: `3px solid ${Colors.primary}`,
  }

  if (loading) {
    return (
      <div style={{ ...containerStyle, textAlign: 'center', paddingTop: '120px' }}>
        <span className="material-icons" style={{ fontSize: '48px', color: Colors.primary, animation: 'spin 1s linear infinite' }}>
          sync
        </span>
        <p style={{ marginTop: '16px', color: Colors.onSurfaceVariant }}>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          <span className="material-icons" style={{ fontSize: '40px', color: Colors.primary }}>
            local_police
          </span>
          Police Command Center
        </h1>
        <p style={subtitleStyle}>Real-time monitoring and device recovery operations</p>
      </div>

      <div style={gridStyle}>
        <Card 
          style={statCardStyle}
          onClick={() => navigate('/police/devices')}
          onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${Colors.error}40` }}
          onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '14px', 
              backgroundColor: `${Colors.error}20`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <span className="material-icons" style={{ fontSize: '28px', color: Colors.error }}>warning</span>
            </div>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: Colors.onSurface }}>{stats.totalLostDevices}</div>
              <div style={{ fontSize: '14px', color: Colors.onSurfaceVariant, fontWeight: 500 }}>Lost Devices</div>
            </div>
          </div>
        </Card>

        <Card 
          style={statCardStyle}
          onClick={() => navigate('/police/reports')}
          onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${Colors.primary}40` }}
          onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '14px', 
              backgroundColor: `${Colors.primary}20`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <span className="material-icons" style={{ fontSize: '28px', color: Colors.primary }}>description</span>
            </div>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: Colors.onSurface }}>{stats.activeReports}</div>
              <div style={{ fontSize: '14px', color: Colors.onSurfaceVariant, fontWeight: 500 }}>Active Reports</div>
            </div>
          </div>
        </Card>

        <Card 
          style={statCardStyle}
          onClick={() => navigate('/police/chats')}
          onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${Colors.tertiary}40` }}
          onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '14px', 
              backgroundColor: `${Colors.tertiary}20`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <span className="material-icons" style={{ fontSize: '28px', color: Colors.tertiary }}>forum</span>
            </div>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: Colors.onSurface }}>{stats.totalChats}</div>
              <div style={{ fontSize: '14px', color: Colors.onSurfaceVariant, fontWeight: 500 }}>Active Chats</div>
            </div>
          </div>
        </Card>

        <Card 
          style={statCardStyle}
          onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${Colors.secondary}40` }}
          onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '14px', 
              backgroundColor: `${Colors.secondary}20`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <span className="material-icons" style={{ fontSize: '28px', color: Colors.secondary }}>check_circle</span>
            </div>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: Colors.onSurface }}>{stats.devicesRecovered}</div>
              <div style={{ fontSize: '14px', color: Colors.onSurfaceVariant, fontWeight: 500 }}>Recovered</div>
            </div>
          </div>
        </Card>

        <Card 
          style={statCardStyle}
          onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${Colors.accent}40` }}
          onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '14px', 
              backgroundColor: `${Colors.accent}20`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <span className="material-icons" style={{ fontSize: '28px', color: Colors.accent }}>notifications_active</span>
            </div>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: Colors.onSurface }}>{stats.recentAlerts}</div>
              <div style={{ fontSize: '14px', color: Colors.onSurfaceVariant, fontWeight: 500 }}>Alerts (24h)</div>
            </div>
          </div>
        </Card>

        <Card 
          style={statCardStyle}
          onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${Colors.primary}40` }}
          onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '14px', 
              backgroundColor: `${Colors.primary}20`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <span className="material-icons" style={{ fontSize: '28px', color: Colors.primary }}>people</span>
            </div>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: Colors.onSurface }}>{stats.totalUsers}</div>
              <div style={{ fontSize: '14px', color: Colors.onSurfaceVariant, fontWeight: 500 }}>Registered Users</div>
            </div>
          </div>
        </Card>
      </div>

      <div style={activitySectionStyle}>
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: Colors.onSurface, marginBottom: '20px' }}>
          Recent Activity
        </h2>
        {recentActivity.length === 0 ? (
          <Card style={{ padding: '40px', textAlign: 'center' }}>
            <span className="material-icons" style={{ fontSize: '48px', color: Colors.outline, marginBottom: '12px' }}>
              inbox
            </span>
            <p style={{ color: Colors.onSurfaceVariant }}>No recent activity</p>
          </Card>
        ) : (
          <div style={activityListStyle}>
            {recentActivity.map((activity) => (
              <Card key={activity.id} style={activityItemStyle}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: `${activity.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span className="material-icons" style={{ fontSize: '22px', color: activity.color }}>
                    {activity.icon}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: Colors.onSurface, marginBottom: '4px' }}>
                    {activity.title}
                  </div>
                  <div style={{ fontSize: '14px', color: Colors.onSurfaceVariant }}>
                    {activity.description}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: Colors.outline }}>
                  {new Date(activity.timestamp).toLocaleString()}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
