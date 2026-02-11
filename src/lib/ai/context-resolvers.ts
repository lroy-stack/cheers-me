/**
 * Context Resolvers
 * Injects relevant real-time data into the system prompt based on the user's message.
 * Each resolver checks for keyword matches and role applicability, then queries Supabase.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from './types'

interface ContextResolver {
  keywords: RegExp
  roles: Set<UserRole>
  resolve: (supabase: SupabaseClient) => Promise<string | null>
}

const ALL_ROLES = new Set<UserRole>(['admin', 'owner', 'manager', 'kitchen', 'bar', 'waiter', 'dj'])
const MANAGEMENT_ROLES = new Set<UserRole>(['admin', 'owner', 'manager'])

const resolvers: ContextResolver[] = [
  // Today's reservations
  {
    keywords: /reserv|table|tonight|booking|guest|party/i,
    roles: new Set(['admin', 'owner', 'manager', 'waiter']),
    async resolve(supabase) {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
      const { data, error } = await supabase
        .from('reservations')
        .select('id, guest_name, party_size, reservation_time, status, special_requests')
        .eq('reservation_date', today)
        .order('reservation_time')
        .limit(20)

      if (error || !data?.length) return null

      const lines = data.map(r =>
        `- ${r.reservation_time} | ${r.guest_name} (${r.party_size} pax) [${r.status}]${r.special_requests ? ` — ${r.special_requests}` : ''}`
      )
      return `## Today's Reservations (${data.length} total)\n${lines.join('\n')}`
    },
  },

  // Low stock alerts
  {
    keywords: /stock|order|keg|beer|reorder|supply|ingredient|run.*out/i,
    roles: new Set(['admin', 'owner', 'manager', 'kitchen', 'bar']),
    async resolve(supabase) {
      const { data, error } = await supabase
        .from('stock_items')
        .select('name, current_stock, min_stock, unit')
        .order('current_stock', { ascending: true })
        .limit(15)

      if (error || !data?.length) return null

      // Filter to items actually below minimum
      const lowItems = data.filter(s => s.current_stock <= (s.min_stock || 0))
      if (lowItems.length === 0) return null

      const lines = lowItems.map(s =>
        `- ${s.name}: ${s.current_stock} ${s.unit} (min: ${s.min_stock})`
      )
      return `## Low Stock Alerts (${lowItems.length} items)\n${lines.join('\n')}`
    },
  },

  // Today's events
  {
    keywords: /event|dj|sport|tonight|music|broadcast|quiz|theme/i,
    roles: ALL_ROLES,
    async resolve(supabase) {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
      const { data, error } = await supabase
        .from('events')
        .select('title, event_type, start_time, end_time, status')
        .eq('event_date', today)
        .order('start_time')
        .limit(10)

      if (error || !data?.length) return null

      const lines = data.map(e =>
        `- ${e.start_time}${e.end_time ? '-' + e.end_time : ''} | ${e.title} [${e.event_type}] (${e.status})`
      )
      return `## Today's Events (${data.length})\n${lines.join('\n')}`
    },
  },

  // Cocktail ingredient stock
  {
    keywords: /cocktail|recipe|mixol|drink.*menu|bar.*stock|spirit/i,
    roles: new Set<UserRole>(['admin', 'owner', 'manager', 'bar']),
    async resolve(supabase) {
      const { data, error } = await supabase
        .from('menu_ingredients')
        .select('name, quantity, unit, product:products(name, current_stock, min_stock, unit)')
        .limit(50)

      if (error || !data?.length) return null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lowItems = data.filter((item: any) => {
        const product = item.product
        if (!product) return false
        return product.current_stock <= (product.min_stock || 0)
      })

      if (lowItems.length === 0) return null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lines = lowItems.map((item: any) =>
        `- ${item.name}: linked to "${item.product.name}" — stock: ${item.product.current_stock} ${item.product.unit} (min: ${item.product.min_stock})`
      )
      return `## Cocktail Ingredients Low Stock (${lowItems.length} items)\n${lines.join('\n')}`
    },
  },

  // Staff on duty
  {
    keywords: /who.*work|staff|schedule|shift|on duty|coverage/i,
    roles: MANAGEMENT_ROLES,
    async resolve(supabase) {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
      const { data, error } = await supabase
        .from('shifts')
        .select('start_time, end_time, role, profile:profiles(full_name)')
        .eq('date', today)
        .order('start_time')
        .limit(20)

      if (error || !data?.length) return null

      const lines = data.map(s => {
        const profile = s.profile as unknown as { full_name: string } | null
        const name = profile?.full_name || 'Unknown'
        return `- ${s.start_time}-${s.end_time} | ${name} (${s.role})`
      })
      return `## Staff On Duty Today (${data.length} shifts)\n${lines.join('\n')}`
    },
  },

  // Task planning context
  {
    keywords: /task.*plan|planning|planifica|tarea.*semana|weekly.*task|zone.*assign|asigna.*zona/i,
    roles: MANAGEMENT_ROLES,
    async resolve(supabase) {
      const today = new Date()
      const monday = new Date(today)
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
      const weekStart = monday.toISOString().split('T')[0]

      const { data: plan } = await supabase
        .from('weekly_task_plans')
        .select('id, status, week_start_date, planned_tasks(id, title, day_of_week, priority, status)')
        .eq('week_start_date', weekStart)
        .single()

      if (!plan) return `## Task Planning\nNo task plan for current week (${weekStart}). Use create_planned_task to start planning.`

      const tasks = (plan.planned_tasks || []) as Array<{ title: string; day_of_week: number; priority: string; status: string }>
      const pending = tasks.filter(t => t.status === 'pending').length
      const completed = tasks.filter(t => t.status === 'completed').length

      return `## Current Week Task Plan (${weekStart})\n- Status: ${plan.status}\n- Total tasks: ${tasks.length} (${pending} pending, ${completed} completed)`
    },
  },
]

/**
 * Resolve dynamic context based on user message, role, and Supabase queries.
 * Returns formatted context string or null if no resolvers matched.
 */
export async function resolveContext(
  message: string,
  role: UserRole,
  supabase: SupabaseClient
): Promise<string | null> {
  const matched = resolvers.filter(r =>
    r.keywords.test(message) && r.roles.has(role)
  )

  if (matched.length === 0) return null

  const results = await Promise.all(
    matched.map(r => r.resolve(supabase).catch(() => null))
  )

  const sections = results.filter(Boolean) as string[]
  return sections.length > 0 ? sections.join('\n\n') : null
}
