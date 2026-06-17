import { defineStore } from 'pinia'
import { loadFromDisk, saveToDisk } from '~/shared/diskStorage'

export interface ThemeSettings {
  headerBg: string
  footerBg: string
  contentBg: string
  isGradient: boolean
  gradientAngle: number
  gradientStart: string
  gradientEnd: string
  themeName: string
  isDark: boolean
  themeMode?: 'light' | 'dark' | 'system'
  useHeaderBlur: boolean
  bgImage: string
  bgImageBlur: number
  bgImageOpacity: number
  bgImageBrightness: number
  bgImageZoom: number
  isImageBg: boolean
}

const DEFAULT_THEME: ThemeSettings = {
  headerBg: 'transparent',
  footerBg: 'transparent',
  contentBg: '#FFFFFF',
  isGradient: false,
  gradientAngle: 135,
  gradientStart: '#FFFFFF',
  gradientEnd: '#e2e8f0',
  themeName: 'Default',
  isDark: false,
  themeMode: 'system',
  useHeaderBlur: true,
  bgImage: '',
  bgImageBlur: 0,
  bgImageOpacity: 50,
  bgImageBrightness: 100,
  bgImageZoom: 100,
  isImageBg: false
}

const STORAGE_KEY = 'user_theme_settings_v1'

export const useThemeStore = defineStore('theme', {
  state: () => {
    let initialSettings = { ...DEFAULT_THEME }
    if (typeof window !== 'undefined') {
      const localStr = localStorage.getItem(STORAGE_KEY)
      if (localStr) {
        try {
          const parsed = JSON.parse(localStr)
          if (parsed.contentBg === '#E8E0D3' || parsed.contentBg === '#e8e0d3' || parsed.contentBg === '#f4f4f2' || parsed.contentBg === '#F9F6F0' || parsed.contentBg === '#f9f6f0') {
            parsed.contentBg = '#FFFFFF'
          }
          if (parsed.gradientStart === '#E8E0D3' || parsed.gradientStart === '#e8e0d3' || parsed.gradientStart === '#f4f4f2' || parsed.gradientStart === '#F9F6F0' || parsed.gradientStart === '#f9f6f0') {
            parsed.gradientStart = '#FFFFFF'
          }
          initialSettings = { ...initialSettings, ...parsed }
        } catch (e) {}
      } else {
        const darkLocal = localStorage.getItem('dark')
        if (darkLocal !== null) {
          initialSettings.isDark = darkLocal === 'true'
          initialSettings.themeMode = initialSettings.isDark ? 'dark' : 'light'
        } else {
          initialSettings.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        }
      }
    }
    return {
      settings: initialSettings as ThemeSettings,
      isLoaded: false,
      isReady: false
    }
  },

  actions: {
    async init() {
      if (this.isLoaded) return
      
      // Apply initial theme immediately to prevent flash
      this.applyTheme()

      const saved = await loadFromDisk<ThemeSettings>(STORAGE_KEY)
      let needsSave = false
      if (saved) {
        if (saved.contentBg === '#E8E0D3' || saved.contentBg === '#e8e0d3' || saved.contentBg === '#f4f4f2' || saved.contentBg === '#F9F6F0' || saved.contentBg === '#f9f6f0') {
          saved.contentBg = '#FFFFFF'
          needsSave = true
        }
        if (saved.gradientStart === '#E8E0D3' || saved.gradientStart === '#e8e0d3' || saved.gradientStart === '#f4f4f2' || saved.gradientStart === '#F9F6F0' || saved.gradientStart === '#f9f6f0') {
          saved.gradientStart = '#FFFFFF'
          needsSave = true
        }
        this.settings = { ...this.settings, ...saved }
      }

      // Fallback for older saved settings without themeMode:
      if (!this.settings.themeMode) {
        if (typeof window !== 'undefined') {
          const darkLocal = localStorage.getItem('dark')
          if (darkLocal !== null) {
            this.settings.themeMode = darkLocal === 'true' ? 'dark' : 'light'
          } else {
            this.settings.themeMode = 'system'
          }
        } else {
          this.settings.themeMode = 'system'
        }
      }

      this.applyTheme()
      if (needsSave) {
        this.save()
      }
      this.isLoaded = true
      this.isReady = true

      // Setup system preference listener
      if (typeof window !== 'undefined') {
        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const handleSystemThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
          if (this.settings.themeMode === 'system') {
            this.settings.isDark = e.matches
            localStorage.setItem('dark', String(e.matches))
            this.applyTheme()
          }
        }
        // Run once to initialize properly
        handleSystemThemeChange(media)
        try {
          media.addEventListener('change', handleSystemThemeChange)
        } catch (err) {
          media.addListener(handleSystemThemeChange)
        }
      }
    },

    setTheme(newSettings: Partial<ThemeSettings>) {
      // If we are currently in Default theme and moving to a Custom/Preset theme,
      // we must capture the current native dark mode state so it doesn't reset to light.
      if (this.settings.themeName === 'Default' && newSettings.themeName !== 'Default') {
        const nativeIsDark = localStorage.getItem('dark') === 'true'
        this.settings.isDark = nativeIsDark
      }

      this.settings = { ...this.settings, ...newSettings }
      
      // Update isDark if themeMode is explicitly set/changed
      if (typeof window !== 'undefined') {
        if (this.settings.themeMode === 'system') {
          this.settings.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        } else if (this.settings.themeMode === 'dark') {
          this.settings.isDark = true
        } else if (this.settings.themeMode === 'light') {
          this.settings.isDark = false
        }
        localStorage.setItem('dark', String(this.settings.isDark))
      }

      this.applyTheme()
      this.save()
    },

    resetToDefault() {
      this.settings = { ...DEFAULT_THEME }
      if (typeof window !== 'undefined') {
        if (this.settings.themeMode === 'system') {
          this.settings.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        }
        localStorage.setItem('dark', String(this.settings.isDark))
      }
      this.applyTheme()
      this.save()
    },

    async save() {
      if (typeof window !== 'undefined') {
        try {
          // Omit bgImage from localStorage to prevent QuotaExceededError (5MB limit)
          const { bgImage, ...minimalSettings } = this.settings
          localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalSettings))
        } catch (e) {}
      }
      await saveToDisk(STORAGE_KEY, this.settings)
    },

    unifyColors() {
      this.settings.headerBg = 'transparent'
      this.settings.footerBg = 'transparent'
      this.settings.themeName = 'Custom'
      this.applyTheme()
      this.save()
    },

    toggleDark() {
      this.settings.isDark = !this.settings.isDark
      this.settings.themeMode = this.settings.isDark ? 'dark' : 'light'
      if (typeof window !== 'undefined') {
        localStorage.setItem('dark', String(this.settings.isDark))
      }
      this.applyTheme()
      
      // If we are not in the Default theme, we also persist to the theme config file
      if (this.settings.themeName !== 'Default') {
        this.save()
      }
    },

    hexToRgba(hex: string, alpha: number) {
      if (!hex.startsWith('#')) return hex
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    },

    normalizeHexColor(value: string | undefined, fallback: string) {
      if (!value) return fallback
      const color = value.trim()
      if (/^#[0-9a-fA-F]{6}$/.test(color)) return color
      if (/^#[0-9a-fA-F]{3}$/.test(color)) {
        return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      }
      return fallback
    },

    hexToRgbChannels(hex: string) {
      const normalized = this.normalizeHexColor(hex, '#000000')
      const r = parseInt(normalized.slice(1, 3), 16)
      const g = parseInt(normalized.slice(3, 5), 16)
      const b = parseInt(normalized.slice(5, 7), 16)
      return `${r} ${g} ${b}`
    },

    applyThemeTokens(root: HTMLElement, contentBackground: string, isDark: boolean) {
      const fallbackBg = isDark ? '#000000' : '#FFFFFF'
      const themeBg = isDark ? fallbackBg : this.normalizeHexColor(contentBackground, fallbackBg)
      const themePanel = isDark ? '#050505' : themeBg
      const themeText = isDark ? '#F9F6F0' : '#2c2c2a'
      const themeAccent = isDark ? '#c7b98f' : '#8d7f61'
      const tooltipBg = isDark ? '#0a0a0a' : '#F9F9F9'
      const tooltipText = themeText

      const bgRgb = this.hexToRgbChannels(themeBg)
      const panelRgb = this.hexToRgbChannels(themePanel)
      const textRgb = this.hexToRgbChannels(themeText)
      const accentRgb = this.hexToRgbChannels(themeAccent)
      const textRgbCsv = textRgb.split(' ').join(', ')

      root.style.setProperty('--theme-bg', themeBg)
      root.style.setProperty('--theme-bg-rgb', bgRgb)
      root.style.setProperty('--theme-panel', isDark ? 'rgba(5, 5, 5, 0.92)' : this.hexToRgba(themeBg, 0.92))
      root.style.setProperty('--theme-panel-rgb', panelRgb)
      root.style.setProperty('--theme-text', themeText)
      root.style.setProperty('--theme-text-rgb', textRgb)
      root.style.setProperty('--theme-muted', `rgba(${textRgbCsv}, ${isDark ? '0.56' : '0.58'})`)
      root.style.setProperty('--theme-border', `rgba(${textRgbCsv}, 0.12)`)
      root.style.setProperty('--theme-border-rgb', textRgb)
      root.style.setProperty('--theme-border-strong', `rgba(${textRgbCsv}, 0.28)`)
      root.style.setProperty('--theme-accent', themeAccent)
      root.style.setProperty('--theme-accent-rgb', accentRgb)
      root.style.setProperty('--theme-grid-dot', `rgba(${textRgbCsv}, ${isDark ? '0.16' : '0.24'})`)
      root.style.setProperty('--theme-tooltip-bg', tooltipBg)
      root.style.setProperty('--theme-tooltip-text', tooltipText)
      root.style.setProperty('--theme-tooltip-muted', `rgba(${textRgbCsv}, 0.62)`)
      root.style.setProperty('--theme-tooltip-border', `rgba(${textRgbCsv}, 0.18)`)
      root.style.setProperty('--text-heading', isDark ? 'rgba(255, 255, 255, 0.95)' : '#050505')
      root.style.setProperty('--text-description', isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(18, 18, 18, 0.45)')
      root.style.setProperty('--icon-color-mode', isDark ? 'white' : 'black')
    },

    applyTheme() {
      if (process.server) return

      const root = document.documentElement

      // Apply Background Image Layer (Universal)
      if (!this.settings.isImageBg || !this.settings.bgImage) {
        root.style.removeProperty('--bg-image')
        root.style.removeProperty('--bg-image-blur')
        root.style.removeProperty('--bg-image-opacity')
        root.style.removeProperty('--bg-image-brightness')
        root.style.removeProperty('--bg-image-zoom')
      }

      // Resolve isDark dynamically based on themeMode
      if (typeof window !== 'undefined') {
        if (this.settings.themeMode === 'system') {
          this.settings.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        } else if (this.settings.themeMode === 'dark') {
          this.settings.isDark = true
        } else if (this.settings.themeMode === 'light') {
          this.settings.isDark = false
        }
        localStorage.setItem('dark', String(this.settings.isDark))
      }

      if (this.settings.themeName === 'Default') {
        const nativeIsDark = this.settings.isDark
        const contentBg = nativeIsDark ? '#000000' : '#FFFFFF'
        this.settings.contentBg = contentBg
        this.settings.headerBg = 'transparent'
        this.settings.footerBg = 'transparent'
        
        root.classList.toggle('dark', nativeIsDark)
        root.classList.toggle('theme-dark', nativeIsDark)
        root.classList.toggle('theme-light', !nativeIsDark)
        this.applyThemeTokens(root, contentBg, nativeIsDark)
        
        // Universal settings (apply regardless of theme)
        root.style.setProperty('--header-blur', this.settings.useHeaderBlur ? 'blur(20px)' : 'none')
        root.style.setProperty('--header-border', this.settings.useHeaderBlur 
          ? (nativeIsDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.03)') 
          : 'none')
        
        root.style.setProperty('--content-bg', contentBg)
        root.style.removeProperty('--header-bg')
        root.style.removeProperty('--footer-bg')
        return
      }

      // Sync dark mode class for custom/preset themes
      root.classList.toggle('dark', this.settings.isDark)
      root.classList.toggle('theme-dark', this.settings.isDark)
      root.classList.toggle('theme-light', !this.settings.isDark)

      // Apply Header Blur
      root.style.setProperty('--header-blur', this.settings.useHeaderBlur ? 'blur(20px)' : 'none')
      root.style.setProperty('--header-border', this.settings.useHeaderBlur 
        ? (this.settings.isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.03)') 
        : 'none')

      // Apply Header
      let headerBg = this.settings.headerBg
      if (this.settings.useHeaderBlur && headerBg.startsWith('#') && headerBg.length === 7) {
        headerBg = this.hexToRgba(headerBg, 0.75)
      }
      root.style.setProperty('--header-bg', headerBg)
      
      // Apply Footer
      root.style.setProperty('--footer-bg', this.settings.footerBg)
      
      // Apply Content Background
      if (this.settings.isDark) {
        root.style.setProperty('--content-bg', '#000000')
        this.applyThemeTokens(root, '#000000', true)
      } else if (this.settings.isGradient) {
        const gradient = `linear-gradient(${this.settings.gradientAngle}deg, ${this.settings.gradientStart}, ${this.settings.gradientEnd})`
        root.style.setProperty('--content-bg', gradient)
        this.applyThemeTokens(root, '#FFFFFF', false)
      } else {
        root.style.setProperty('--content-bg', this.settings.contentBg)
        this.applyThemeTokens(root, this.settings.contentBg, false)
      }
    }
  }
})
