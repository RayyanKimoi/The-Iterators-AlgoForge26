import { useRef, useState } from 'react'
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
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { Colors } from '../../constants/colors'
import { FontFamily } from '../../constants/typography'
import { GradientButton } from '../../components/ui/GradientButton'
import { useAuth } from '../../hooks/useAuth'

export default function SignInScreen() {
  const router = useRouter()
  const { signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const passwordRef = useRef<TextInput | null>(null)

  const onBackPress = () => {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.navigate('/(auth)/onboarding')
  }

  const onSubmit = async () => {
    if (!email || !password) {
      setErrorMessage('Please enter your email and password.')
      return
    }

    setSubmitting(true)
    setErrorMessage('')

    const { error } = await signIn(email.trim(), password)
    setSubmitting(false)

    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('email not confirmed') || message.includes('not confirmed')) {
        router.push({
          pathname: '/(auth)/otp-verify',
          params: { email: email.trim() },
        })
        return
      }

      setErrorMessage(error.message)
      return
    }

    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable style={styles.backButton} onPress={onBackPress}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
          </Pressable>

          <View style={styles.headerWrap}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="lock-open" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to manage your devices</Text>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="email" size={20} color={Colors.outline} style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor="#5b6172"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                importantForAutofill="yes"
                style={styles.input}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="vpn-key" size={20} color={Colors.outline} style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#5b6172"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                importantForAutofill="yes"
                style={styles.input}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => void onSubmit()}
              />
              <Pressable onPress={() => setShowPassword((c) => !c)} style={styles.eyeButton}>
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={22}
                  color={Colors.onSurfaceVariant}
                />
              </Pressable>
            </View>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <GradientButton
            title={submitting ? 'Signing in...' : 'Sign In'}
            loading={submitting}
            onPress={onSubmit}
            style={styles.primaryButton}
          />

          <Pressable
            style={styles.signUpRow}
            onPress={() => router.navigate('/(auth)/sign-up')}
            disabled={submitting}
          >
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <Text style={styles.signUpLink}>Create Account</Text>
          </Pressable>
        </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 26,
    gap: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  headerWrap: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 12,
    gap: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(170,199,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headingBold,
    fontSize: 28,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 14,
    textAlign: 'center',
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  inputWrap: {
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 18,
    paddingVertical: 0,
  },
  eyeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.error,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 14,
    marginBottom: -4,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 8,
  },
  signUpRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  signUpText: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 15,
  },
  signUpLink: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
  },
})
