import { CSSProperties, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../hooks/ThemeContext'
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
  const { theme } = useTheme()
  const [stats, setStats] = useState<DashboardStats>({
    totalLostDevices: 0, activeReports: 0, totalChats: 0,
    devicesRecovered: 0, recentAlerts: 0, totalUsers: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboardData() }, [])

  const loadDashboardData = async () => {
    try {
      const [lostDevicesRes, activeReportsRes, chatsRes, recoveredRes, alertsRes, usersRes] = await Promise.all([
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

      await loadRecentActivity()
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentActivity = async () => {
    const activities: RecentActivity[] = []

    const { data: reports } = await supabase
      .from('lost_reports')
      .select('id, reported_at, devices(make, model)')
      .order('reported_at', { ascending: false })
      .limit(3)

    reports?.forEach((report: any) => {
      activities.push({
        id: report.id, type: 'report', title: 'New Lost Report',
        description: `${report.devices?.make} ${report.devices?.model}`,
        timestamp: report.reported_at, icon: 'report', color: theme.error,
      })
    })

    const { data: beacons } = await supabase
      .from('beacon_logs')
      .select('id, reported_at, device_id, devices(make, model)')
      .order('reported_at', { ascending: false })
      .limit(3)

    beacons?.forEach((beacon: any) => {
      activities.push({
        id: beacon.id, type: 'beacon', title: 'Device Detected',
        description: `${beacon.devices?.make} ${beacon.devices?.model}`,
        timestamp: beacon.reported_at, icon: 'my_location', color: theme.text,
      })
    })

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setRecentActivity(activities.slice(0, 8))
  }

  const statCards = [
    { label: 'Lost Devices', value: stats.totalLostDevices, icon: 'warning', color: theme.error, path: '/police/devices' },
    { label: 'Active Reports', value: stats.activeReports, icon: 'description', color: theme.text, path: '/police/reports' },
    { label: 'Active Chats', value: stats.totalChats, icon: 'forum', color: theme.textSecondary, path: '/police/chats' },
    { label: 'Recovered', value: stats.devicesRecovered, icon: 'check_circle', color: theme.text },
    { label: 'Alerts (24h)', value: stats.recentAlerts, icon: 'notifications_active', color: theme.text },
    { label: 'Registered Users', value: stats.totalUsers, icon: 'people', color: theme.text },
  ]

  if (loading) {
    return (
      <div style={{ padding: '120px 32px 32px', maxWidth: '1600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ width: '24px', height: '24px', border: `2px solid ${theme.border}`, borderTopColor: theme.text, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: theme.textTertiary, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <span style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.2em', color: theme.textTertiary, textTransform: 'uppercase', marginBottom: '8px' }}>[ Police — Command Center ]</span>
        <h1 style={{ fontSize: '32px', fontWeight: 600, color: theme.text, marginBottom: '4px', fontFamily: "'Space Grotesk', system-ui, sans-serif", letterSpacing: '-0.02em' }}>Dashboard</h1>
        <p style={{ fontSize: '14px', color: theme.textSecondary }}>Real-time monitoring and device recovery operations</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {statCards.map((stat, i) => (
          <Card
            key={i}
            style={{ padding: '24px', cursor: stat.path ? 'pointer' : 'default', border: `1px solid ${theme.border}` }}
            onClick={stat.path ? () => navigate(stat.path!) : undefined}
            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${stat.color}20` }}
            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '56px', height: '56px', backgroundColor: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-icons" style={{ fontSize: '28px', color: stat.color }}>{stat.icon}</span>
              </div>
              <div>
                <div style={{ fontSize: '36px', fontWeight: 700, color: theme.text }}>{stat.value}</div>
                <div style={{ fontSize: '14px', color: theme.textSecondary, fontWeight: 500 }}>{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: theme.text, marginBottom: '20px' }}>Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <Card style={{ padding: '40px', textAlign: 'center' }}>
            <span className="material-icons" style={{ fontSize: '48px', color: theme.textTertiary, marginBottom: '12px' }}>inbox</span>
            <p style={{ color: theme.textSecondary }}>No recent activity</p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivity.map((activity) => (
              <Card key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderLeft: `3px solid ${theme.text}` }}>
                <div style={{ width: '40px', height: '40px', backgroundColor: `${activity.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-icons" style={{ fontSize: '22px', color: activity.color }}>{activity.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: theme.text, marginBottom: '4px' }}>{activity.title}</div>
                  <div style={{ fontSize: '14px', color: theme.textSecondary }}>{activity.description}</div>
                </div>
                <div style={{ fontSize: '12px', color: theme.textTertiary }}>{new Date(activity.timestamp).toLocaleString()}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
