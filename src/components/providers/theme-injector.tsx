'use client'

import { useEffect, useRef } from 'react'
import { useBranding } from '@/hooks/use-branding'
import { generatePaletteCSS } from '@/lib/utils/color-palette'

const STYLE_ID = 'dynamic-theme-palette'

/**
 * ThemeInjector reads branding colors from settings and injects
 * a <style> tag into <head> that overrides the default CSS palette.
 *
 * If no custom colors are set, nothing is injected (globals.css defaults apply).
 * Destructive colors are never overridden (safety UX).
 */
export function ThemeInjector() {
  const { primaryColor, accentColor, loading } = useBranding()
  const prevCssRef = useRef<string | null>(null)

  useEffect(() => {
    if (loading) return

    // Remove existing injected style if colors were cleared
    if (!primaryColor || !accentColor) {
      const existing = document.getElementById(STYLE_ID)
      if (existing) existing.remove()
      prevCssRef.current = null
      return
    }

    const css = generatePaletteCSS(primaryColor, accentColor)

    // Skip if CSS hasn't changed
    if (css === prevCssRef.current) return
    prevCssRef.current = css

    let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = STYLE_ID
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = css
  }, [primaryColor, accentColor, loading])

  return null
}
