import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Mode = 'light' | 'dark'

export interface ThemeTokens {
  mode: Mode
  // Backgrounds
  bg: string
  bgSurface: string
  bgSurfaceDim: string
  bgSurfaceHover: string
  bgInverse: string
  // Text
  text: string
  textSecondary: string
  textTertiary: string
  textInverse: string
  // Borders
  border: string
  borderSubtle: string
  borderHover: string
  // Accents
  primary: string
  primaryHover: string
  error: string
  errorBg: string
  errorBorder: string
  // Misc
  shadow: string
  gridLine: string
  scrollbarTrack: string
  scrollbarThumb: string
  scrollbarThumbHover: string
  // Input
  inputBg: string
  inputBorder: string
  inputText: string
  inputPlaceholder: string
  // Badge
  badgeBg: string
  badgeText: string
  // Card
  cardBg: string
  cardBorder: string
  cardShadow: string
  cardHoverBorder: string
  cardHoverShadow: string
  // Modal
  modalOverlay: string
  modalBg: string
}

const lightTokens: ThemeTokens = {
  mode: 'light',
  bg: '#FAFAFA',
  bgSurface: '#FFFFFF',
  bgSurfaceDim: '#F5F5F5',
  bgSurfaceHover: '#F5F5F5',
  bgInverse: '#000000',
  text: '#000000',
  textSecondary: '#737373',
  textTertiary: '#A3A3A3',
  textInverse: '#FFFFFF',
  border: '#E5E5E5',
  borderSubtle: '#F0F0F0',
  borderHover: '#000000',
  primary: '#000000',
  primaryHover: '#333333',
  error: '#FF4E4E',
  errorBg: '#FFF0F0',
  errorBorder: '#FFE0E0',
  shadow: 'rgba(0, 0, 0, 0.06)',
  gridLine: 'rgba(0, 0, 0, 0.04)',
  scrollbarTrack: '#FAFAFA',
  scrollbarThumb: '#D4D4D4',
  scrollbarThumbHover: '#A3A3A3',
  inputBg: '#FFFFFF',
  inputBorder: '#E5E5E5',
  inputText: '#000000',
  inputPlaceholder: '#A3A3A3',
  badgeBg: '#000000',
  badgeText: '#FFFFFF',
  cardBg: '#FFFFFF',
  cardBorder: '#E5E5E5',
  cardShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
  cardHoverBorder: '#000000',
  cardHoverShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
  modalBg: '#FFFFFF',
}

const darkTokens: ThemeTokens = {
  mode: 'dark',
  bg: '#0A0A0A',
  bgSurface: '#141414',
  bgSurfaceDim: '#1A1A1A',
  bgSurfaceHover: '#1E1E1E',
  bgInverse: '#FFFFFF',
  text: '#F0F0F0',
  textSecondary: '#A0A0A0',
  textTertiary: '#666666',
  textInverse: '#000000',
  border: '#2A2A2A',
  borderSubtle: '#1E1E1E',
  borderHover: '#FFFFFF',
  primary: '#FFFFFF',
  primaryHover: '#D4D4D4',
  error: '#FF6B6B',
  errorBg: '#2A1515',
  errorBorder: '#4A2020',
  shadow: 'rgba(0, 0, 0, 0.3)',
  gridLine: 'rgba(255, 255, 255, 0.03)',
  scrollbarTrack: '#0A0A0A',
  scrollbarThumb: '#333333',
  scrollbarThumbHover: '#555555',
  inputBg: '#141414',
  inputBorder: '#2A2A2A',
  inputText: '#F0F0F0',
  inputPlaceholder: '#555555',
  badgeBg: '#FFFFFF',
  badgeText: '#000000',
  cardBg: '#141414',
  cardBorder: '#2A2A2A',
  cardShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
  cardHoverBorder: '#FFFFFF',
  cardHoverShadow: '0 8px 32px rgba(255, 255, 255, 0.05)',
  modalOverlay: 'rgba(0, 0, 0, 0.75)',
  modalBg: '#141414',
}

interface ThemeContextType {
  theme: ThemeTokens
  mode: Mode
  toggleTheme: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTokens,
  mode: 'light',
  toggleTheme: () => {},
  isDark: false,
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    try {
      const stored = localStorage.getItem('spors-theme')
      if (stored === 'dark' || stored === 'light') return stored
    } catch {}
    return 'light'
  })

  useEffect(() => {
    try {
      localStorage.setItem('spors-theme', mode)
    } catch {}
  }, [mode])

  const toggleTheme = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'))

  const theme = mode === 'dark' ? darkTokens : lightTokens

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme, isDark: mode === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
