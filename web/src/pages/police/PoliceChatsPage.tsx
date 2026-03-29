import { CSSProperties, useEffect, useState } from 'react'
import { Colors } from '../../lib/colors'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { analyzeChat, ChatAnalysis } from '../../services/aiService'

type ChatRoomData = {
  id: string
  owner_id: string
  device_id: string
  is_active: boolean
  created_at: string
  devices: {
    make: string
    model: string
    imei_primary: string
  } | null
  profiles: {
    full_name: string
    phone_number: string | null
  } | null
}

type ChatMessage = {
  id: string
  room_id: string
  sender_role: string
  content: string
  sent_at: string
}

export function PoliceChatsPage() {
  const [rooms, setRooms] = useState<ChatRoomData[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [analysis, setAnalysis] = useState<ChatAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState('')

  useEffect(() => {
    loadRooms()
  }, [])

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom)
      setAnalysis(null)
      setAnalysisError('')
    }
  }, [selectedRoom])

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          owner_id,
          device_id,
          is_active,
          created_at,
          devices(make, model, imei_primary),
          profiles(full_name, phone_number)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      const transformedData = (data as any[]).map(room => ({
        ...room,
        devices: Array.isArray(room.devices) ? room.devices[0] : room.devices,
        profiles: Array.isArray(room.profiles) ? room.profiles[0] : room.profiles,
      }))
      setRooms(transformedData as unknown as ChatRoomData[])
    } catch (error) {
      console.error('Error loading rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (roomId: string) => {
    setMessagesLoading(true)
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, room_id, sender_role, content, sent_at')
        .eq('room_id', roomId)
        .order('sent_at', { ascending: true })

      if (error) throw error
      setMessages(data as ChatMessage[])
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleAnalyzeChat = async () => {
    if (messages.length === 0) return
    setAnalysisLoading(true)
    setAnalysisError('')
    try {
      const result = await analyzeChat(messages)
      setAnalysis(result)
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Analysis failed')
    } finally {
      setAnalysisLoading(false)
    }
  }

  const containerStyle: CSSProperties = {
    display: 'flex',
    height: 'calc(100vh - 48px)',
    maxWidth: '1600px',
    margin: '0 auto',
    gap: '24px',
    padding: '24px',
  }

  const sidebarStyle: CSSProperties = {
    width: '380px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  }

  const headerStyle: CSSProperties = {
    marginBottom: '8px',
  }

  const titleStyle: CSSProperties = {
    fontSize: '28px',
    fontWeight: 700,
    color: Colors.onSurface,
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  }

  const roomListStyle: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  }

  const roomCardStyle = (isSelected: boolean, isActive: boolean): CSSProperties => ({
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: `2px solid ${isSelected ? Colors.primary : Colors.outlineVariant}`,
    backgroundColor: isSelected ? `${Colors.primary}10` : Colors.surfaceContainer,
    opacity: isActive ? 1 : 0.7,
  })

  const chatAreaStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: '16px',
    border: `1px solid ${Colors.outlineVariant}`,
    overflow: 'hidden',
  }

  const chatHeaderStyle: CSSProperties = {
    padding: '20px 24px',
    borderBottom: `1px solid ${Colors.outlineVariant}`,
    backgroundColor: Colors.surfaceContainerLow,
  }

  const messagesContainerStyle: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  }

  const messageBubbleStyle = (role: string): CSSProperties => ({
    maxWidth: role === 'system' ? '100%' : '70%',
    padding: role === 'system' ? '10px 16px' : '12px 16px',
    borderRadius: role === 'system' ? '8px' : role === 'owner' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    backgroundColor: role === 'system' 
      ? Colors.surfaceContainerHigh 
      : role === 'owner' 
        ? Colors.primaryContainer 
        : Colors.surfaceContainerHighest,
    color: role === 'system' ? Colors.onSurfaceVariant : Colors.onSurface,
    alignSelf: role === 'system' ? 'center' : role === 'owner' ? 'flex-start' : 'flex-end',
    fontSize: role === 'system' ? '13px' : '15px',
    fontStyle: role === 'system' ? 'italic' : 'normal',
  })

  const selectedRoomData = rooms.find(r => r.id === selectedRoom)

  if (loading) {
    return (
      <div style={{ ...containerStyle, justifyContent: 'center', alignItems: 'center' }}>
        <span className="material-icons" style={{ fontSize: '48px', color: Colors.primary, animation: 'spin 1s linear infinite' }}>
          sync
        </span>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={sidebarStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>
            <span className="material-icons" style={{ fontSize: '32px', color: Colors.primary }}>
              forum
            </span>
            All Chats
          </h1>
          <p style={{ fontSize: '14px', color: Colors.onSurfaceVariant }}>
            Monitoring {rooms.length} conversation{rooms.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={roomListStyle}>
          {rooms.length === 0 ? (
            <Card style={{ padding: '40px', textAlign: 'center' }}>
              <span className="material-icons" style={{ fontSize: '48px', color: Colors.outline, marginBottom: '12px' }}>
                chat_bubble_outline
              </span>
              <p style={{ color: Colors.onSurfaceVariant }}>No active chats</p>
            </Card>
          ) : (
            rooms.map((room) => (
              <Card
                key={room.id}
                style={roomCardStyle(selectedRoom === room.id, room.is_active)}
                onClick={() => setSelectedRoom(room.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, color: Colors.onSurface, fontSize: '16px' }}>
                    {room.devices?.make} {room.devices?.model}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: room.is_active ? `${Colors.secondary}20` : `${Colors.error}20`,
                      color: room.is_active ? Colors.secondary : Colors.error,
                      fontWeight: 600,
                    }}
                  >
                    {room.is_active ? 'Active' : 'Closed'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: Colors.onSurfaceVariant, marginBottom: '8px' }}>
                  <span className="material-icons" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>
                    person
                  </span>
                  {room.profiles?.full_name || 'Unknown Owner'}
                </div>
                {room.profiles?.phone_number && (
                  <div style={{ fontSize: '13px', color: Colors.onSurfaceVariant, marginBottom: '8px' }}>
                    <span className="material-icons" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>
                      phone
                    </span>
                    {room.profiles.phone_number}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: Colors.outline }}>
                  IMEI: ···· {room.devices?.imei_primary?.slice(-4) || '----'}
                </div>
                <div style={{ fontSize: '12px', color: Colors.outline, marginTop: '4px' }}>
                  Created: {new Date(room.created_at).toLocaleDateString()}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <div style={chatAreaStyle}>
        {!selectedRoom ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '40px' }}>
            <span className="material-icons" style={{ fontSize: '64px', color: Colors.outline, marginBottom: '16px' }}>
              chat
            </span>
            <h2 style={{ color: Colors.onSurface, marginBottom: '8px' }}>Select a Chat</h2>
            <p style={{ color: Colors.onSurfaceVariant, textAlign: 'center' }}>
              Choose a conversation from the list to view messages
            </p>
          </div>
        ) : (
          <>
            <div style={chatHeaderStyle}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: Colors.onSurface, marginBottom: '8px' }}>
                {selectedRoomData?.devices?.make} {selectedRoomData?.devices?.model}
              </h2>
              <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: Colors.onSurfaceVariant }}>
                <span>
                  <span className="material-icons" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '4px' }}>
                    person
                  </span>
                  Owner: {selectedRoomData?.profiles?.full_name || 'Unknown'}
                </span>
                {selectedRoomData?.profiles?.phone_number && (
                  <span>
                    <span className="material-icons" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '4px' }}>
                      phone
                    </span>
                    {selectedRoomData.profiles.phone_number}
                  </span>
                )}
              </div>
            </div>

            {/* AI Analysis Section */}
            {(analysis || analysisLoading || analysisError) && (
              <div style={{ padding: '24px', borderBottom: `1px solid ${Colors.outlineVariant}`, backgroundColor: `${Colors.surfaceContainerHigh}50` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: Colors.primary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-icons">auto_awesome</span>
                    AI Chat Analysis
                  </h3>
                  {analysis && (
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: analysis.riskLevel === 'High' ? Colors.errorContainer : analysis.riskLevel === 'Medium' ? `${Colors.secondary}30` : `${Colors.primary}30`,
                      color: analysis.riskLevel === 'High' ? Colors.error : analysis.riskLevel === 'Medium' ? Colors.secondary : Colors.primary,
                      border: `1px solid ${analysis.riskLevel === 'High' ? Colors.error : 'transparent'}`
                    }}>
                      RISK: {analysis.riskLevel.toUpperCase()}
                    </span>
                  )}
                </div>

                {analysisLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <span className="material-icons" style={{ fontSize: '32px', color: Colors.primary, animation: 'spin 1s linear infinite' }}>sync</span>
                    <p style={{ marginTop: '8px', fontSize: '14px', color: Colors.onSurfaceVariant }}>Analyzing conversation with Groq AI...</p>
                  </div>
                ) : analysisError ? (
                  <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: `${Colors.error}15`, color: Colors.error, fontSize: '14px', textAlign: 'center' }}>
                    {analysisError}
                  </div>
                ) : analysis && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: Colors.onSurfaceVariant, marginBottom: '6px', textTransform: 'uppercase' }}>Summary</div>
                      <p style={{ fontSize: '15px', color: Colors.onSurface, lineHeight: '1.5' }}>{analysis.summary}</p>
                    </div>

                    {analysis.redFlags.length > 0 && (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: Colors.error, marginBottom: '6px', textTransform: 'uppercase' }}>Red Flags</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {analysis.redFlags.map((flag, idx) => (
                            <span key={idx} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', backgroundColor: `${Colors.error}10`, border: `1px solid ${Colors.error}30`, color: Colors.error }}>
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {analysis.actionableInsights.location && (
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: Colors.onSurfaceVariant, marginBottom: '4px', textTransform: 'uppercase' }}>Location</div>
                          <div style={{ fontSize: '14px', color: Colors.onSurface }}>{analysis.actionableInsights.location}</div>
                        </div>
                      )}
                      {analysis.actionableInsights.meetingTime && (
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: Colors.onSurfaceVariant, marginBottom: '4px', textTransform: 'uppercase' }}>Meeting Time</div>
                          <div style={{ fontSize: '14px', color: Colors.onSurface }}>{analysis.actionableInsights.meetingTime}</div>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: Colors.surfaceContainerHighest, borderLeft: `4px solid ${Colors.primary}` }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: Colors.primary, marginBottom: '4px', textTransform: 'uppercase' }}>Officer Recommendation</div>
                      <p style={{ fontSize: '14px', color: Colors.onSurface }}>{analysis.recommendation}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={messagesContainerStyle}>
              {messagesLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <span className="material-icons" style={{ fontSize: '32px', color: Colors.primary, animation: 'spin 1s linear infinite' }}>
                    sync
                  </span>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: Colors.onSurfaceVariant }}>
                  <span className="material-icons" style={{ fontSize: '48px', color: Colors.outline, marginBottom: '12px' }}>
                    chat_bubble_outline
                  </span>
                  <p>No messages in this conversation</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender_role === 'system' ? 'center' : msg.sender_role === 'owner' ? 'flex-start' : 'flex-end' }}>
                    <div style={messageBubbleStyle(msg.sender_role)}>
                      <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: msg.sender_role === 'system' ? Colors.onSurfaceVariant : Colors.primary }}>
                        {msg.sender_role === 'owner' ? 'Owner' : msg.sender_role === 'finder' ? 'Finder' : 'System'}
                      </div>
                      {msg.content}
                    </div>
                    {msg.sender_role !== 'system' && (
                      <span style={{ fontSize: '11px', color: Colors.outline, marginTop: '4px' }}>
                        {new Date(msg.sent_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: `1px solid ${Colors.outlineVariant}`, backgroundColor: Colors.surfaceContainerLow, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '13px', color: Colors.onSurfaceVariant, fontStyle: 'italic' }}>
                <span className="material-icons" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>
                  visibility
                </span>
                Monitoring mode - Read-only access
              </p>
              <Button 
                onClick={handleAnalyzeChat} 
                loading={analysisLoading} 
                disabled={messages.length === 0} 
                icon="auto_awesome"
                size="small"
              >
                Analyze Conversation
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
