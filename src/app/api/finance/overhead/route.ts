import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for overhead expense
const overheadExpenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  is_recurring: z.boolean().optional(),
  recurrence_frequency: z.string().optional(),
  vendor: z.string().optional(),
  invoice_number: z.string().optional(),
  payment_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  payment_method: z.enum(['cash', 'card', 'transfer', 'other']).optional(),
  notes: z.string().optional(),
  factura_number: z.string().optional(),
  supplier_nif: z.string().optional(),
  iva_rate: z.number().min(0).max(100).default(21),
  iva_amount: z.number().optional(),
  base_imponible: z.number().optional(),
  receipt_url: z.string().url().optional().or(z.literal('')).or(z.undefined()),
  is_deductible: z.boolean().default(true),
  expense_subcategory: z.string().optional(),
})

/**
 * GET /api/finance/overhead
 * Get overhead expenses
 * Query params: start_date, end_date, category (all optional)
 * Accessible by: admin, manager, owner
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const category = searchParams.get('category')

  let query = supabase.from('overhead_expenses').select('*').order('date', { ascending: false })

  if (startDate) {
    query = query.gte('date', startDate)
  }
  if (endDate) {
    query = query.lte('date', endDate)
  }
  if (category) {
    query = query.eq('category', category)
  }

  const { data: expenses, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate totals by category
  const byCategory = expenses?.reduce(
    (acc, expense) => {
      const cat = expense.category
      if (!acc[cat]) {
        acc[cat] = { count: 0, total: 0 }
      }
      acc[cat].count += 1
      acc[cat].total += expense.amount || 0
      return acc
    },
    {} as Record<string, { count: number; total: number }>
  )

  const totalAmount = expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0

  return NextResponse.json({
    expenses: expenses || [],
    summary: {
      total_amount: totalAmount,
      expense_count: expenses?.length || 0,
      by_category: byCategory || {},
    },
  })
}

/**
 * POST /api/finance/overhead
 * Create a new overhead expense
 * Accessible by: admin, manager
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { data: userData } = authResult

  try {
    const body = await request.json()

    // Validate request body
    const validatedData = overheadExpenseSchema.parse(body)

    // Auto-calculate IVA amounts if not provided
    if (!validatedData.base_imponible && validatedData.amount) {
      validatedData.base_imponible = Math.round((validatedData.amount / (1 + validatedData.iva_rate / 100)) * 100) / 100
      validatedData.iva_amount = Math.round((validatedData.amount - validatedData.base_imponible) * 100) / 100
    }

    // Insert overhead expense
    const { data: expense, error } = await supabase
      .from('overhead_expenses')
      .insert({
        ...validatedData,
        created_by: userData.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create overhead expense:', error)
      return NextResponse.json(
        { error: 'Failed to create overhead expense', details: error.message },
        { status: 500 }
      )
    }

    // Also create a cash flow transaction for this overhead
    const { error: cashFlowError } = await supabase.from('cash_flow_transactions').insert({
      date: validatedData.date,
      transaction_type: 'overhead',
      amount: validatedData.amount,
      payment_method: validatedData.payment_method || 'other',
      category: validatedData.category,
      description: validatedData.description,
      reference_id: expense.id,
      reference_table: 'overhead_expenses',
      created_by: userData.user.id,
    })

    if (cashFlowError) {
      console.error('Failed to create cash flow transaction:', cashFlowError)
      // Don't fail the request, but log the error
    }

    return NextResponse.json(
      {
        message: 'Overhead expense created successfully',
        expense,
      },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: err.errors },
        { status: 400 }
      )
    }
    console.error('Error in overhead POST:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
