import { z } from 'zod'

/**
 * Environment variable schema — validates all required env vars at startup.
 * Fails fast with a clear error message if any required vars are missing.
 * This prevents cryptic runtime errors caused by missing configuration.
 */
const envSchema = z.object({
  // Supabase — required for app to function
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Anthropic Claude — required for AI assistant
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),

  // App config
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL').optional(),
  TIMEZONE: z.string().default('Europe/Madrid'),
  DEFAULT_LOCALE: z.string().default('en'),

  // Optional services (gracefully degraded if missing)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  META_PAGE_ID: z.string().optional(),
  META_IG_USER_ID: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),

  // Encryption — required for SSN encryption (uses NEXTAUTH_SECRET as fallback)
  POS_ENCRYPTION_SECRET: z.string().min(32, 'POS_ENCRYPTION_SECRET must be at least 32 characters').optional(),
})

type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n')

    throw new Error(
      `❌ Invalid environment variables:\n${errors}\n\nCheck your .env.local file.`
    )
  }

  return result.data
}

// Validate env vars once at module load (only on server)
// Client-side code should only use NEXT_PUBLIC_ vars directly
let _env: Env | null = null

export function getEnv(): Env {
  if (!_env) {
    _env = validateEnv()
  }
  return _env
}

// Convenience export for server-side usage
export const env = new Proxy({} as Env, {
  get(_, key: string) {
    return getEnv()[key as keyof Env]
  },
})
