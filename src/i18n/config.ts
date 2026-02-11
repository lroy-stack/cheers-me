export const locales = ['en', 'nl', 'es', 'de'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  nl: 'Nederlands',
  es: 'Español',
  de: 'Deutsch',
}
