'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

type Language = 'en' | 'nl' | 'es' | 'de'

type Messages = Record<Language, Record<string, unknown>>

interface BookingLanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const BookingLanguageContext = createContext<BookingLanguageContextValue | null>(null)

export const LANGUAGE_FLAGS: Record<Language, string> = {
  en: '🇬🇧',
  nl: '🇳🇱',
  es: '🇪🇸',
  de: '🇩🇪',
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'EN',
  nl: 'NL',
  es: 'ES',
  de: 'DE',
}

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' ? current : undefined
}

function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en'
  const lang = navigator.language?.toLowerCase() || ''
  if (lang.startsWith('nl')) return 'nl'
  if (lang.startsWith('es')) return 'es'
  if (lang.startsWith('de')) return 'de'
  return 'en'
}

export function BookingLanguageProvider({
  messages,
  children,
}: {
  messages: Messages
  children: React.ReactNode
}) {
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    setLanguage(detectBrowserLanguage())
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = getNestedValue(messages[language] || {}, key)
      if (value === undefined) {
        // Fallback to English
        value = getNestedValue(messages.en || {}, key)
      }
      if (value === undefined) return key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
        }
      }
      return value
    },
    [language, messages]
  )

  return (
    <BookingLanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </BookingLanguageContext.Provider>
  )
}

export function useBookingLanguage() {
  const ctx = useContext(BookingLanguageContext)
  if (!ctx) throw new Error('useBookingLanguage must be used within BookingLanguageProvider')
  return ctx
}

/**
 * Inline language selector — renders as a row of flag buttons.
 * Place this inside the hero or header area for a non-invasive UX.
 */
export function LanguageSelector() {
  const { language, setLanguage } = useBookingLanguage()
  const langs: Language[] = ['en', 'nl', 'es', 'de']

  return (
    <div className="flex items-center justify-center gap-1">
      {langs.map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm transition-all ${
            lang === language
              ? 'bg-white/25 text-white font-semibold scale-105'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title={lang === 'en' ? 'English' : lang === 'nl' ? 'Nederlands' : lang === 'es' ? 'Español' : 'Deutsch'}
        >
          <span className="text-base">{LANGUAGE_FLAGS[lang]}</span>
          <span className="text-xs">{LANGUAGE_LABELS[lang]}</span>
        </button>
      ))}
    </div>
  )
}
