import { ReactNode, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { Colors } from '../../constants/colors'
import { FontFamily } from '../../constants/typography'
import { GradientButton } from '../../components/ui/GradientButton'
import { useAuth } from '../../hooks/useAuth'

type InputFieldProps = {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad'
  secureTextEntry?: boolean
  rightAdornment?: ReactNode
  inputRef?: React.RefObject<TextInput | null>
  returnKeyType?: 'done' | 'next'
  blurOnSubmit?: boolean
  onSubmitEditing?: () => void
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry,
  rightAdornment,
  inputRef,
  returnKeyType = 'next',
  blurOnSubmit = false,
  onSubmitEditing,
}: InputFieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#5b6172"
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          secureTextEntry={secureTextEntry}
          style={styles.input}
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
          onSubmitEditing={onSubmitEditing}
        />
        {rightAdornment}
      </View>
    </View>
  )
}

export default function SignUpScreen() {
  const router = useRouter()
  const { signIn, signUp, signInWithGoogle } = useAuth()

  const onBackPress = () => {
    if (router.canGoBack()) {
      router.back()
      return
    }

    router.navigate('/(auth)/onboarding')
  }

  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [aadhaarEnabled, setAadhaarEnabled] = useState(false)
  const [aadhaar, setAadhaar] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fullNameRef = useRef<TextInput | null>(null)
  const phoneRef = useRef<TextInput | null>(null)
  const emailRef = useRef<TextInput | null>(null)
  const passwordRef = useRef<TextInput | null>(null)
  const aadhaarRef = useRef<TextInput | null>(null)

  const phoneDisplay = useMemo(() => phoneNumber.replace(/[^0-9]/g, '').slice(0, 10), [phoneNumber])

  const onSubmit = async () => {
    if (!fullName || !email || !password || !phoneDisplay) {
      setErrorMessage('Please fill all required fields.')
      return
    }

    if (aadhaarEnabled && aadhaar.replace(/[^0-9]/g, '').length < 12) {
      setErrorMessage('Aadhaar number must be 12 digits.')
      return
    }

    setSubmitting(true)
    setErrorMessage('')

    const { error } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      phoneNumber: `+91${phoneDisplay}`,
    })

    if (error) {
      setSubmitting(false)
      setErrorMessage(error.message)
      return
    }

    const signInAttempt = await signIn(email.trim(), password)
    setSubmitting(false)

    if (!signInAttempt.error) {
      router.replace('/(tabs)')
      return
    }

    const message = signInAttempt.error.message.toLowerCase()
    if (message.includes('email not confirmed') || message.includes('not confirmed')) {
      router.push({
        pathname: '/(auth)/otp-verify',
        params: { email: email.trim() },
      })
      return
    }

    setErrorMessage(signInAttempt.error.message)
    return
  }

  const onSignIn = async () => {
    if (!email || !password) {
      setErrorMessage('Enter email and password to sign in.')
      return
    }

    setSubmitting(true)
    setErrorMessage('')

    const { error } = await signIn(email.trim(), password)
    setSubmitting(false)

    if (error) {
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

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Let's secure your devices</Text>

          <InputField
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            inputRef={fullNameRef}
            onSubmitEditing={() => phoneRef.current?.focus()}
          />

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.inputWrap}>
              <View style={styles.prefixBadge}>
                <Text style={styles.prefixText}>+91</Text>
              </View>
              <TextInput
                ref={phoneRef}
                value={phoneDisplay}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                placeholder="00000 00000"
                placeholderTextColor="#5b6172"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
                style={styles.input}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
          </View>

          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            keyboardType="email-address"
            inputRef={emailRef}
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry={!showPassword}
            inputRef={passwordRef}
            returnKeyType={aadhaarEnabled ? 'next' : 'done'}
            blurOnSubmit={!aadhaarEnabled}
            onSubmitEditing={() => {
              if (aadhaarEnabled) {
                aadhaarRef.current?.focus()
                return
              }

              void onSubmit()
            }}
            rightAdornment={
              <Pressable onPress={() => setShowPassword((current) => !current)} style={styles.eyeButton}>
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={22}
                  color={Colors.onSurfaceVariant}
                />
              </Pressable>
            }
          />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Verify with Aadhaar</Text>
            <Switch
              value={aadhaarEnabled}
              onValueChange={setAadhaarEnabled}
              trackColor={{ false: Colors.surfaceContainerHigh, true: `${Colors.inversePrimary}77` }}
              thumbColor={aadhaarEnabled ? Colors.primary : Colors.onSurfaceVariant}
            />
          </View>

          {aadhaarEnabled ? (
            <InputField
              label="Aadhaar Number"
              value={aadhaar}
              onChangeText={(text) => setAadhaar(text.replace(/[^0-9]/g, '').slice(0, 12))}
              placeholder="Enter 12 digit Aadhaar"
              keyboardType="number-pad"
              inputRef={aadhaarRef}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => void onSubmit()}
            />
          ) : null}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <GradientButton
            title={submitting ? 'Creating...' : 'Create Account'}
            loading={submitting}
            onPress={onSubmit}
            style={styles.primaryButton}
          />

          <View style={styles.dividerWrap}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={styles.googleButton}
            onPress={async () => {
              setSubmitting(true)
              setErrorMessage('')
              const { error } = await signInWithGoogle()
              setSubmitting(false)
              if (error) {
                setErrorMessage(error.message)
              } else {
                router.replace('/(tabs)')
              }
            }}
            disabled={submitting}
          >
            <Ionicons name="logo-google" size={20} color="#000" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable>

          <Pressable style={styles.signInRow} onPress={onSignIn} disabled={submitting}>
            <Text style={styles.signInText}>Already have an account? </Text>
            {submitting ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={styles.signInLink}>Sign In</Text>
            )}
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
  title: {
    marginTop: 4,
    color: Colors.onSurface,
    fontFamily: FontFamily.headingBold,
    fontSize: 28,
  },
  subtitle: {
    marginTop: -8,
    marginBottom: 6,
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 11,
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
  input: {
    flex: 1,
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 18,
    paddingVertical: 0,
  },
  prefixBadge: {
    minWidth: 52,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  prefixText: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 18,
  },
  eyeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 16,
  },
  errorText: {
    color: Colors.error,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 14,
    marginBottom: -4,
  },
  primaryButton: {
    marginTop: 4,
  },
  signInRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  signInText: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyRegular,
    fontSize: 15,
  },
  signInLink: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.outlineVariant,
  },
  dividerText: {
    marginHorizontal: 16,
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
  },
  googleButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleButtonText: {
    color: '#000',
    fontFamily: FontFamily.bodyMedium,
    fontSize: 16,
  },
})