import { CSSProperties, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/ThemeContext'
import { Card } from '../components/Card'

type RoomRecord = {
  id: string
  owner_id: string
  device_id: string
  is_active: boolean
  created_at: string
  devices: {
    make: string
    model: string
    imei_primary: string
    status: string
  } | null
}

type ChatMessage = {
  id: string
  room_id: string
  sender_role: 'owner' | 'finder' | 'system'
  content: string | null
  is_read: boolean
  sent_at: string
}

type RoomItem = {
  id: string
  deviceId: string
  isActive: boolean
  createdAt: string
  ownerId: string
  role: 'owner' | 'finder'
  make: string
  model: string
  imeiTail: string
  status: string
  lastMessage: string
  lastSentAt: string
  unreadCount: number
}

function getRelativeTime(dateIso: string) {
  const diffMs = Date.now() - new Date(dateIso).getTime()
  const mins = Math.max(1, Math.floor(diffMs / 60000))
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function ChatListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme } = useTheme()
  const [rooms, setRooms] = useState<RoomItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRooms = useCallback(async () => {
    if (!user?.id) {
      setRooms([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: ownerRooms, error: ownerError } = await supabase
        .from('chat_rooms')
        .select('id, owner_id, device_id, is_active, created_at, devices(make, model, imei_primary, status)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (ownerError) throw ownerError

      const roomItems: RoomItem[] = []

      for (const room of (ownerRooms || []) as RoomRecord[]) {
        const device = room.devices
        
        const { data: lastMsg } = await supabase
          .from('chat_messages')
          .select('content, sent_at')
          .eq('room_id', room.id)
          .order('sent_at', { ascending: false })
          .limit(1)
          .single()

        const { count } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .eq('is_read', false)
          .neq('sender_role', 'owner')

        roomItems.push({
          id: room.id,
          deviceId: room.device_id,
          isActive: room.is_active,
          createdAt: room.created_at,
          ownerId: room.owner_id,
          role: 'owner',
          make: device?.make || 'Unknown',
          model: device?.model || 'Device',
          imeiTail: device?.imei_primary?.slice(-4) || '----',
          status: device?.status || 'unknown',
          lastMessage: lastMsg?.content || 'No messages yet',
          lastSentAt: lastMsg?.sent_at || room.created_at,
          unreadCount: count || 0,
        })
      }

      setRooms(roomItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chats')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchRooms()

    const channel = supabase
      .channel('chat_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => { fetchRooms() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, () => { fetchRooms() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchRooms])

  const containerStyle: CSSProperties = {
    padding: '40px',
    maxWidth: '1000px',
    margin: '0 auto',
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <div style={{ width: '24px', height: '24px', border: `2px solid ${theme.border}`, borderTopColor: theme.text, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: theme.textTertiary, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading chats...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <header style={{ marginBottom: '40px', backgroundColor: theme.bgSurfaceDim, padding: '32px', border: `1px solid ${theme.border}` }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: theme.text, marginBottom: '12px', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="material-icons" style={{ fontSize: '36px', color: theme.text }}>chat</span>
          Messages
        </h1>
        <p style={{ color: theme.textSecondary, fontSize: '16px' }}>
          Anonymous conversations for device recovery
        </p>
      </header>

      {error && (
        <Card variant="elevated" style={{ backgroundColor: theme.errorBg, marginBottom: '24px', border: `2px solid ${theme.errorBorder}`, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="material-icons" style={{ color: theme.error }}>error</span>
            <p style={{ color: theme.error, fontWeight: 600 }}>{error}</p>
          </div>
        </Card>
      )}

      {rooms.length === 0 ? (
        <Card variant="elevated" style={{ textAlign: 'center', padding: '80px 40px', backgroundColor: theme.bgSurfaceDim }}>
          <span className="material-icons" style={{ fontSize: '96px', color: theme.text, marginBottom: '24px', display: 'block', opacity: 0.5 }}>
            chat_bubble_outline
          </span>
          <h2 style={{ color: theme.text, marginBottom: '12px', fontSize: '28px', fontWeight: 700 }}>No active chats</h2>
          <p style={{ fontSize: '16px', maxWidth: '500px', margin: '0 auto', color: theme.textSecondary }}>
            When someone finds your lost device, a chat will appear here for coordination.
          </p>
        </Card>
      ) : (
        <div>
          {rooms.map((room) => (
            <Card
              key={room.id}
              variant="elevated"
              style={{
                display: 'flex', alignItems: 'center', gap: '20px', padding: '24px',
                marginBottom: '16px', cursor: 'pointer', opacity: room.isActive ? 1 : 0.7,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onClick={() => navigate(`/chat/${room.id}`)}
            >
              <div style={{
                width: '64px', height: '64px', backgroundColor: theme.bgSurfaceDim,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                border: `2px solid ${theme.border}`,
              }}>
                <span className="material-icons" style={{ color: theme.text, fontSize: '32px' }}>smartphone</span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ color: theme.text, fontSize: '20px', fontWeight: 700, letterSpacing: '-0.2px' }}>{room.make} {room.model}</h3>
                  <span style={{ color: theme.textSecondary, fontSize: '13px', fontWeight: 600 }}>{getRelativeTime(room.lastSentAt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <p style={{ color: theme.textSecondary, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                    {room.lastMessage}
                  </p>
                  {room.unreadCount > 0 && (
                    <span style={{
                      backgroundColor: theme.primary, color: theme.textInverse,
                      fontSize: '13px', fontWeight: 700, padding: '4px 12px', minWidth: '24px', textAlign: 'center',
                    }}>
                      {room.unreadCount}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <span style={{
                    fontSize: '12px', fontWeight: 600, color: theme.textSecondary,
                    backgroundColor: theme.bgSurfaceDim, padding: '4px 12px',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    IMEI ···· {room.imeiTail}
                  </span>
                  <span style={{
                    fontSize: '12px', fontWeight: 700,
                    color: room.isActive ? theme.text : theme.error,
                    backgroundColor: room.isActive ? theme.bgSurfaceDim : theme.errorBg,
                    padding: '4px 12px',
                    border: `2px solid ${room.isActive ? theme.border : theme.errorBorder}`,
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    {room.isActive ? 'Active' : 'Closed'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
