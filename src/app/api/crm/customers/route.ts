import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating customer
const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  language: z.enum(['en', 'nl', 'es', 'de']).optional().nullable(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().nullable(),
  anniversary: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().nullable(),
  preferences: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  vip: z.boolean().optional().default(false),
})

/**
 * GET /api/crm/customers
 * List all customers with pagination and filtering
 * Query params:
 * - page: page number (default 1)
 * - limit: items per page (default 50, max 100)
 * - vip: filter by VIP status (true/false)
 * - language: filter by language (en/nl/es/de)
 * - sort: sort by field (default 'created_at')
 * - order: sort order (asc/desc, default 'desc')
 * - search: search by name, email, or phone
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Pagination
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const from = (page - 1) * limit
  const to = from + limit - 1

  // Filters
  const vipFilter = searchParams.get('vip')
  const languageFilter = searchParams.get('language')
  const searchQuery = searchParams.get('search')

  // Sorting
  const sortField = searchParams.get('sort') || 'created_at'
  const sortOrder = (searchParams.get('order') || 'desc') as 'asc' | 'desc'

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .order(sortField, { ascending: sortOrder === 'asc' })
    .range(from, to)

  // Apply filters
  if (vipFilter !== null) {
    query = query.eq('vip', vipFilter === 'true')
  }

  if (languageFilter) {
    query = query.eq('language', languageFilter)
  }

  // Search across name, email, phone
  if (searchQuery) {
    query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
  }

  const { data: customers, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: customers,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  })
}

/**
 * POST /api/crm/customers
 * Create a new customer profile
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = createCustomerSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors,
      },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Check if customer with same email or phone already exists
  if (validation.data.email || validation.data.phone) {
    let duplicateQuery = supabase
      .from('customers')
      .select('id, name, email, phone')

    const conditions: string[] = []
    if (validation.data.email) {
      conditions.push(`email.eq.${validation.data.email}`)
    }
    if (validation.data.phone) {
      conditions.push(`phone.eq.${validation.data.phone}`)
    }

    if (conditions.length > 0) {
      duplicateQuery = duplicateQuery.or(conditions.join(','))
      const { data: existingCustomers } = await duplicateQuery

      if (existingCustomers && existingCustomers.length > 0) {
        return NextResponse.json(
          {
            error: 'Customer with this email or phone already exists',
            existing: existingCustomers[0],
          },
          { status: 409 }
        )
      }
    }
  }

  // Create customer record
  const { data: newCustomer, error } = await supabase
    .from('customers')
    .insert({
      name: validation.data.name,
      email: validation.data.email,
      phone: validation.data.phone,
      language: validation.data.language,
      birthday: validation.data.birthday,
      anniversary: validation.data.anniversary,
      preferences: validation.data.preferences,
      notes: validation.data.notes,
      vip: validation.data.vip,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newCustomer, { status: 201 })
}
