import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AadhaarVerifyModal } from '../../components/spors/AadhaarVerifyModal'
import { Skeleton } from '../../components/ui/Skeleton'
import { Colors } from '../../constants/colors'
import { FontFamily } from '../../constants/typography'
import { useAuth } from '../../hooks/useAuth'
import { useDevices } from '../../hooks/useDevices'
import { useSubscription } from '../../hooks/useSubscription'
import { supabase } from '../../lib/supabase'

function daysSince(dateIso?: string) {
  if (!dateIso) {
    return 0
  }

  const ms = Date.now() - new Date(dateIso).getTime()
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

function GroupLabel({ label }: { label: string }) {
  return <Text style={styles.groupLabel}>{label}</Text>
}

type RowProps = {
  label: string
  onPress?: () => void
  isDanger?: boolean
  value?: boolean
  onToggle?: (value: boolean) => void
}

function SettingRow({ label, onPress, isDanger, value, onToggle }: RowProps) {
  return (
    <Pressable style={styles.settingRow} onPress={onPress} disabled={!onPress}>
      <Text style={[styles.settingLabel, isDanger && styles.settingLabelDanger]}>{label}</Text>
      {typeof value === 'boolean' && onToggle ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#414753', true: 'rgba(61,142,255,0.42)' }}
          thumbColor={value ? Colors.primary : '#a1a7b3'}
        />
      ) : (
        <MaterialIcons name="chevron-right" size={20} color={Colors.outline} />
      )}
    </Pressable>
  )
}

export default function ProfileScreen() {
  const router = useRouter()
  const { profile, signOut, user, loading } = useAuth()
  const { devices } = useDevices()
  const sub = useSubscription()

  const [reportsCount, setReportsCount] = useState(0)
  const [loadingReports, setLoadingReports] = useState(false)
  const [aadhaarModalVisible, setAadhaarModalVisible] = useState(false)

  useEffect(() => {
    const loadReportsCount = async () => {
      if (!user?.id) {
        setReportsCount(0)
        return
      }

      setLoadingReports(true)
      const { count } = await supabase
        .from('lost_reports')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id)

      setReportsCount(count ?? 0)
      setLoadingReports(false)
    }

    void loadReportsCount()
  }, [user?.id])

  const initials = useMemo(() => {
    const source = profile?.full_name?.trim() || user?.email || 'SPORS'
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
  }, [profile?.full_name, user?.email])

  const signOutNow = async () => {
    await signOut()
    router.replace('/(auth)/onboarding')
  }

  const deleteAccountRequest = () => {
    Alert.alert(
      'Delete Account',
      'Account deletion requires a secure server flow and cannot be completed from this demo client yet.',
      [{ text: 'OK' }]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <LinearGradient
            colors={[Colors.primary, Colors.inversePrimary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarCircle}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>

          <Text style={styles.name}>{profile?.full_name || 'SPORS User'}</Text>
          <Text style={styles.email}>{user?.email || 'No email linked'}</Text>

          <Pressable
            style={[
              styles.identityBadge,
              {
                backgroundColor: profile?.aadhaar_verified
                  ? 'rgba(70,241,187,0.16)'
                  : 'rgba(255,185,95,0.16)',
              },
            ]}
            onPress={() => {
              if (!profile?.aadhaar_verified) {
                setAadhaarModalVisible(true)
              }
            }}
          >
            <MaterialIcons
              name="shield"
              size={16}
              color={profile?.aadhaar_verified ? Colors.secondary : Colors.tertiary}
            />
            <Text
              style={[
                styles.identityText,
                { color: profile?.aadhaar_verified ? Colors.secondary : Colors.tertiary },
              ]}
            >
              {profile?.aadhaar_verified ? 'Identity Verified' : 'Verify Identity'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            {loading ? (
              <Skeleton width={44} height={26} borderRadius={8} />
            ) : (
              <Text style={styles.statValue}>{devices.length}</Text>
            )}
            <Text style={styles.statLabel}>Devices Registered</Text>
          </View>
          <View style={styles.statCard}>
            {loadingReports ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={styles.statValue}>{reportsCount}</Text>
            )}
            <Text style={styles.statLabel}>Reports Filed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{daysSince(profile?.created_at)}</Text>
            <Text style={styles.statLabel}>Days Active</Text>
          </View>
        </View>

        <GroupLabel label="SUBSCRIPTION" />
        <View style={styles.groupWrap}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Current Plan</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 6,
                    backgroundColor: sub.isPaid
                      ? 'rgba(70,241,187,0.15)'
                      : 'rgba(170,199,255,0.15)',
                  }}
                >
                  <Text
                    style={{
                      color: sub.isPaid ? Colors.secondary : Colors.primary,
                      fontFamily: FontFamily.headingSemiBold,
                      fontSize: 11,
                    }}
                  >
                    {sub.currentPlan.name.toUpperCase()}
                  </Text>
                </View>
                {sub.isTrialActive && (
                  <Text
                    style={{
                      color: Colors.tertiary,
                      fontFamily: FontFamily.bodyRegular,
                      fontSize: 11,
                    }}
                  >
                    Trial • {sub.trialDaysRemaining}d left
                  </Text>
                )}
              </View>
            </View>
            <MaterialIcons name="workspace-premium" size={20} color={sub.isPaid ? Colors.secondary : Colors.outline} />
          </View>
          <SettingRow label="Manage Plan" onPress={() => router.push('/subscription')} />
        </View>

        <GroupLabel label="ACCOUNT" />
        <View style={styles.groupWrap}>
          <SettingRow label="Edit Profile" onPress={() => router.push('/edit-profile')} />
          <SettingRow label="Verify Aadhaar" onPress={() => setAadhaarModalVisible(true)} />
          <SettingRow label="Settings" onPress={() => router.push('/settings')} />
          <SettingRow label="Change Password" onPress={() => router.push('/change-password')} />
        </View>

        <GroupLabel label="RECOVERY" />
        <View style={styles.groupWrap}>
          <SettingRow label="Open Anonymous Chat" onPress={() => router.push('/(tabs)/chat')} />
          <SettingRow label="Open Device Scanner" onPress={() => router.push('/(tabs)/scanner')} />
          <SettingRow label="Open Alerts" onPress={() => router.push('/(tabs)/alerts')} />
        </View>

        <GroupLabel label="APP" />
        <View style={styles.groupWrap}>
          <SettingRow label="About SPORS" onPress={() => router.push('/about')} />
          <SettingRow label="Privacy Policy" onPress={() => router.push('/privacy-policy')} />
          <SettingRow label="Report a Bug" onPress={() => router.push('/report-bug')} />
        </View>

        <View style={styles.disclaimerCard}>
          <MaterialIcons name="info-outline" size={18} color={Colors.tertiary} />
          <Text style={styles.disclaimerText}>
            SPORS is a device tracking aid and does not guarantee device recovery. Always report 
            theft to local authorities. Use caution when meeting to recover devices.
          </Text>
        </View>

        <GroupLabel label="DANGER ZONE" />
        <View style={styles.groupWrap}>
          <SettingRow label="Sign Out" isDanger onPress={() => void signOutNow()} />
          <SettingRow label="Delete Account" isDanger onPress={deleteAccountRequest} />
        </View>
      </ScrollView>

      <AadhaarVerifyModal visible={aadhaarModalVisible} onClose={() => setAadhaarModalVisible(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 120,
    gap: 16,
  },
  hero: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.onPrimary,
    fontFamily: FontFamily.headingBold,
    fontSize: 24,
  },
  name: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
  },
  email: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 14,
  },
  identityBadge: {
    marginTop: 4,
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  identityText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
  },
  statsRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 14,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  statValue: {
    color: Colors.primary,
    fontFamily: FontFamily.headingBold,
    fontSize: 24,
  },
  statLabel: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 11,
    textAlign: 'center',
  },
  groupLabel: {
    marginTop: 2,
    marginLeft: 18,
    color: Colors.outline,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 1,
  },
  groupWrap: {
    marginHorizontal: 16,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 8,
    gap: 8,
  },
  settingRow: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#282a2f',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
  },
  settingLabelDanger: {
    color: Colors.error,
  },
  disclaimerCard: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,185,95,0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,185,95,0.25)',
  },
  disclaimerText: {
    flex: 1,
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 11,
    lineHeight: 16,
  },
  link: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
  },
})