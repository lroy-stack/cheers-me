import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating customer
const updateCustomerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  language: z.enum(['en', 'nl', 'es', 'de']).optional().nullable(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().nullable(),
  anniversary: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().nullable(),
  preferences: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  vip: z.boolean().optional(),
})

/**
 * GET /api/crm/customers/[id]
 * Get a specific customer with related data (visits, reviews, loyalty rewards)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  // Get customer with related data
  const { data: customer, error } = await supabase
    .from('customers')
    .select(`
      *,
      reviews:customer_reviews(
        id,
        platform,
        rating,
        review_text,
        sentiment,
        response_draft,
        response_sent,
        created_at
      ),
      loyalty_rewards(
        id,
        visit_milestone,
        reward_description,
        reward_issued_at,
        created_at
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(customer)
}

/**
 * PATCH /api/crm/customers/[id]
 * Update a customer profile
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateCustomerSchema.safeParse(body)
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

  // Check for duplicate email/phone (exclude current customer)
  if (validation.data.email || validation.data.phone) {
    let duplicateQuery = supabase
      .from('customers')
      .select('id, name, email, phone')
      .neq('id', id)

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
            error: 'Another customer with this email or phone already exists',
            existing: existingCustomers[0],
          },
          { status: 409 }
        )
      }
    }
  }

  // Update customer record
  const { data: updatedCustomer, error } = await supabase
    .from('customers')
    .update({
      ...validation.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedCustomer)
}

/**
 * DELETE /api/crm/customers/[id]
 * Delete a customer (hard delete, admins only)
 * WARNING: This will cascade delete reviews and loyalty rewards
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
