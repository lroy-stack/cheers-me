import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

function oklch(variable: string) {
  return `oklch(var(--${variable}) / <alpha-value>)`
}

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: oklch('border'),
        input: oklch('input'),
        ring: oklch('ring'),
        background: oklch('background'),
        foreground: oklch('foreground'),
        primary: {
          DEFAULT: oklch('primary'),
          foreground: oklch('primary-foreground'),
        },
        secondary: {
          DEFAULT: oklch('secondary'),
          foreground: oklch('secondary-foreground'),
        },
        destructive: {
          DEFAULT: oklch('destructive'),
          foreground: oklch('destructive-foreground'),
        },
        muted: {
          DEFAULT: oklch('muted'),
          foreground: oklch('muted-foreground'),
        },
        accent: {
          DEFAULT: oklch('accent'),
          foreground: oklch('accent-foreground'),
        },
        popover: {
          DEFAULT: oklch('popover'),
          foreground: oklch('popover-foreground'),
        },
        card: {
          DEFAULT: oklch('card'),
          foreground: oklch('card-foreground'),
        },
        'cheers-amber': oklch('primary'),
        'cheers-sunset': oklch('accent'),
        'cheers-coral': oklch('destructive'),
        chart: {
          '1': oklch('chart-1'),
          '2': oklch('chart-2'),
          '3': oklch('chart-3'),
          '4': oklch('chart-4'),
          '5': oklch('chart-5'),
        },
        sidebar: {
          DEFAULT: oklch('sidebar-background'),
          foreground: oklch('sidebar-foreground'),
          primary: oklch('sidebar-primary'),
          'primary-foreground': oklch('sidebar-primary-foreground'),
          accent: oklch('sidebar-accent'),
          'accent-foreground': oklch('sidebar-accent-foreground'),
          border: oklch('sidebar-border'),
          ring: oklch('sidebar-ring'),
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Lora', 'sans-serif'],
        serif: ['Lora', 'serif'],
        mono: ['var(--font-fira-code)', 'monospace'],
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
export default config
