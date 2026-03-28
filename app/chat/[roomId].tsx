import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ErrorState } from '../../components/ui/ErrorState'
import { Header } from '../../components/ui/Header'
import { Skeleton } from '../../components/ui/Skeleton'
import { Toast } from '../../components/ui/Toast'
import { Colors } from '../../constants/colors'
import { FontFamily } from '../../constants/typography'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { bleService } from '../../services/ble.service'

type ChatRoomRecord = {
  id: string
  owner_id: string
  device_id: string
  is_active: boolean
  devices:
    | {
        make: string
        model: string
        imei_primary: string
      }
    | {
        make: string
        model: string
        imei_primary: string
      }[]
    | null
}

type ChatMessage = {
  id: string
  room_id: string
  sender_role: 'owner' | 'finder' | 'system'
  message_text?: string | null
  content?: string | null
  is_read: boolean
  sent_at: string
}

function normalizeDevice(
  device: ChatRoomRecord['devices']
): { make: string; model: string; imei_primary: string } | null {
  if (!device) {
    return null
  }

  if (Array.isArray(device)) {
    return device[0] ?? null
  }

  return device
}

function formatStamp(dateIso: string) {
  const date = new Date(dateIso)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatRoomScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const params = useLocalSearchParams<{ roomId: string }>()
  const roomId = params.roomId

  const [room, setRoom] = useState<ChatRoomRecord | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const scrollRef = useRef<ScrollView | null>(null)

  const role = useMemo<'owner' | 'finder'>(() => {
    if (room?.owner_id && user?.id === room.owner_id) {
      return 'owner'
    }

    return 'finder'
  }, [room?.owner_id, user?.id])

  const markIncomingAsRead = useCallback(
    async (nextRole: 'owner' | 'finder') => {
      if (!roomId) {
        return
      }

      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('room_id', roomId)
        .eq('is_read', false)
        .neq('sender_role', nextRole)
    },
    [roomId]
  )

  const fetchRoomAndMessages = useCallback(async () => {
    if (!roomId) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // First try loading room with device join
      let roomData: ChatRoomRecord | null = null
      const { data: roomWithDevice, error: roomError } = await supabase
        .from('chat_rooms')
        .select('id, owner_id, device_id, is_active, devices(make, model, imei_primary)')
        .eq('id', roomId)
        .maybeSingle()

      if (roomError) {
        console.log('[SPORS-CHAT] Room query error:', roomError.message)
        // Try without the device join as fallback
        const { data: roomBasic, error: roomBasicError } = await supabase
          .from('chat_rooms')
          .select('id, owner_id, device_id, is_active')
          .eq('id', roomId)
          .maybeSingle()

        if (roomBasicError || !roomBasic) {
          throw new Error(roomBasicError?.message ?? 'Chat room not found.')
        }

        roomData = { ...roomBasic, devices: null } as ChatRoomRecord
      } else {
        roomData = roomWithDevice as ChatRoomRecord | null
      }

      if (!roomData) {
        throw new Error('This chat room no longer exists.')
      }

      // Load messages
      let normalizedMessages: ChatMessage[] = []
      const { data: msgData, error: msgError } = await supabase
        .from('chat_messages')
        .select('id, room_id, sender_role, message_text, is_read, sent_at')
        .eq('room_id', roomId)
        .order('sent_at', { ascending: true })

      if (!msgError) {
        normalizedMessages = ((msgData as ChatMessage[]) ?? []).map((message) => ({
          ...message,
          message_text: message.message_text ?? message.content ?? '',
        }))
      } else if (msgError.message?.toLowerCase().includes('message_text')) {
        // Fallback: try legacy column name
        const { data: legacyData } = await supabase
          .from('chat_messages')
          .select('id, room_id, sender_role, content, is_read, sent_at')
          .eq('room_id', roomId)
          .order('sent_at', { ascending: true })

        if (legacyData) {
          normalizedMessages = ((legacyData as ChatMessage[]) ?? []).map((message) => ({
            ...message,
            message_text: message.message_text ?? message.content ?? '',
          }))
        }
      } else {
        console.log('[SPORS-CHAT] Messages query error:', msgError.message)
      }

      setRoom(roomData)
      setMessages(normalizedMessages)

      const resolvedRole = user?.id === roomData.owner_id ? 'owner' : 'finder'
      await markIncomingAsRead(resolvedRole)
    } catch (nextError) {
      console.log('[SPORS-CHAT] Fetch error:', nextError)
      setError(nextError instanceof Error ? nextError.message : 'Unable to load this room.')
    } finally {
      setLoading(false)
    }
  }, [markIncomingAsRead, roomId, user?.id])

  useEffect(() => {
    void fetchRoomAndMessages()
  }, [fetchRoomAndMessages])

  useEffect(() => {
    if (!roomId) {
      return
    }

    const channel = supabase
      .channel(`chat-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const incoming = payload.new as ChatMessage
          const normalizedIncoming = {
            ...incoming,
            message_text: incoming.message_text ?? incoming.content ?? '',
          }

          setMessages((current) => {
            if (current.some((msg) => msg.id === normalizedIncoming.id)) {
              return current
            }
            return [...current, normalizedIncoming]
          })

          if (normalizedIncoming.sender_role !== role) {
            void markIncomingAsRead(role)
          }

          setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true })
          }, 30)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [markIncomingAsRead, role, roomId])

  const sendMessage = useCallback(async () => {
    const text = messageText.trim()
    if (!roomId || !text || sending || !room?.is_active) {
      return
    }

    setSending(true)
    try {
      let insertResponse = await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_role: role,
        message_text: text,
        is_read: false,
      })

      if (insertResponse.error?.message?.toLowerCase().includes('message_text')) {
        insertResponse = await supabase.from('chat_messages').insert({
          room_id: roomId,
          sender_role: role,
          content: text,
          is_read: false,
        })
      }

      if (insertResponse.error) {
        throw insertResponse.error
      }

      setMessageText('')
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true })
      }, 30)
    } catch (nextError) {
      setToast({
        message: nextError instanceof Error ? nextError.message : 'Unable to send message.',
        type: 'error',
      })
    } finally {
      setSending(false)
    }
  }, [messageText, role, room?.is_active, roomId, sending])

  const shareLocation = useCallback(async () => {
    if (!room?.device_id) {
      return
    }

    try {
      await bleService.reportLocationForDevice(room.device_id, null)
      setToast({ message: 'Location shared with owner.', type: 'success' })
    } catch (nextError) {
      setToast({
        message: nextError instanceof Error ? nextError.message : 'Unable to share location.',
        type: 'error',
      })
    }
  }, [room?.device_id])

  const closeRecovery = useCallback(async () => {
    if (!room?.device_id || !roomId) {
      return
    }

    try {
      const { error: deviceError } = await supabase
        .from('devices')
        .update({
          status: 'recovered',
          is_ble_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', room.device_id)

      if (deviceError) {
        throw deviceError
      }

      const { error: roomError } = await supabase
        .from('chat_rooms')
        .update({ is_active: false })
        .eq('id', roomId)

      if (roomError) {
        throw roomError
      }

      await supabase
        .from('lost_reports')
        .update({ is_active: false })
        .eq('device_id', room.device_id)
        .eq('is_active', true)

      setRoom((current) => (current ? { ...current, is_active: false } : current))
      setToast({ message: 'Marked as found and chat closed.', type: 'success' })
    } catch (nextError) {
      setToast({
        message: nextError instanceof Error ? nextError.message : 'Unable to close recovery flow.',
        type: 'error',
      })
    }
  }, [room?.device_id, roomId])

  const device = normalizeDevice(room?.devices ?? null)

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Secure Chat" onBackPress={() => router.back()} rightIcon="verified-user" />

      <Toast
        visible={!!toast}
        message={toast?.message ?? ''}
        type={toast?.type ?? 'info'}
        onHide={() => setToast(null)}
      />

      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.metaBar}>
          {loading ? (
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="52%" height={12} borderRadius={8} />
              <Skeleton width="30%" height={10} borderRadius={8} />
            </View>
          ) : (
            <>
              <View>
                <Text style={styles.deviceTitle}>{`${device?.make ?? 'Unknown'} ${device?.model ?? 'Device'}`}</Text>
                <Text style={styles.deviceMeta}>{`IMEI •••• ${device?.imei_primary?.slice(-4) ?? '----'}`}</Text>
              </View>

              <View style={[styles.statusPill, !room?.is_active && styles.statusPillClosed]}>
                <Text style={[styles.statusPillText, !room?.is_active && styles.statusPillTextClosed]}>
                  {room?.is_active ? 'Active' : 'Closed'}
                </Text>
              </View>
            </>
          )}
        </View>

        {error ? <ErrorState message={error} onRetry={() => void fetchRoomAndMessages()} /> : null}

        {!error ? (
          <ScrollView
            ref={scrollRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          >
            {!room?.is_active ? (
              <View style={styles.systemMessageWrap}>
                <Text style={styles.systemMessageText}>This room has been closed after recovery.</Text>
              </View>
            ) : null}

            {messages.map((message) => {
              if (message.sender_role === 'system') {
                return (
                  <View key={message.id} style={styles.systemMessageWrap}>
                    <Text style={styles.systemMessageText}>{message.message_text}</Text>
                  </View>
                )
              }

              const mine = message.sender_role === role
              return (
                <View key={message.id} style={[styles.messageWrap, mine ? styles.messageMineWrap : styles.messageOtherWrap]}>
                  <View style={[styles.messageBubble, mine ? styles.messageMine : styles.messageOther]}>
                    <Text style={[styles.messageText, mine ? styles.messageTextMine : styles.messageTextOther]}>
                      {message.message_text}
                    </Text>
                  </View>
                  <Text style={styles.messageTime}>{formatStamp(message.sent_at)}</Text>
                </View>
              )
            })}

            {!messages.length && !loading ? (
              <View style={styles.systemMessageWrap}>
                <Text style={styles.systemMessageText}>No messages yet. Start with a quick hello.</Text>
              </View>
            ) : null}
          </ScrollView>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable style={styles.actionButton} onPress={() => void shareLocation()}>
            <MaterialIcons name="my-location" size={16} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Share Location</Text>
          </Pressable>

          <Pressable style={styles.actionButtonDanger} onPress={() => void closeRecovery()}>
            <MaterialIcons name="check-circle" size={16} color={Colors.secondary} />
            <Text style={styles.actionButtonDangerText}>Mark Found</Text>
          </Pressable>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder={room?.is_active ? 'Type your message...' : 'Room is closed'}
            placeholderTextColor={Colors.outline}
            style={styles.input}
            editable={!!room?.is_active && !sending}
            multiline
            maxLength={500}
          />

          <Pressable
            style={[styles.sendButton, (!messageText.trim() || !room?.is_active || sending) && styles.sendButtonDisabled]}
            onPress={() => void sendMessage()}
            disabled={!messageText.trim() || !room?.is_active || sending}
          >
            <MaterialIcons name="send" size={18} color={Colors.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardWrap: {
    flex: 1,
  },
  metaBar: {
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  deviceTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingSemiBold,
    fontSize: 14,
  },
  deviceMeta: {
    marginTop: 2,
    color: Colors.outline,
    fontFamily: FontFamily.monoMedium,
    fontSize: 10,
  },
  statusPill: {
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(70,241,187,0.18)',
  },
  statusPillClosed: {
    backgroundColor: 'rgba(255,78,78,0.18)',
  },
  statusPillText: {
    color: Colors.secondary,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
  },
  statusPillTextClosed: {
    color: Colors.error,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  messageWrap: {
    gap: 2,
  },
  messageMineWrap: {
    alignItems: 'flex-end',
  },
  messageOtherWrap: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageMine: {
    backgroundColor: Colors.primary,
    borderTopRightRadius: 5,
  },
  messageOther: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderTopLeftRadius: 5,
  },
  messageText: {
    fontFamily: FontFamily.bodyRegular,
    fontSize: 14,
    lineHeight: 19,
  },
  messageTextMine: {
    color: Colors.onPrimary,
  },
  messageTextOther: {
    color: Colors.onSurface,
  },
  messageTime: {
    color: Colors.outline,
    fontFamily: FontFamily.monoMedium,
    fontSize: 10,
  },
  systemMessageWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  systemMessageText: {
    color: Colors.outline,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  actionRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionButtonText: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
  },
  actionButtonDanger: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(70,241,187,0.36)',
    backgroundColor: 'rgba(70,241,187,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionButtonDangerText: {
    color: Colors.secondary,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
  },
  inputRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    color: Colors.onSurface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
})
