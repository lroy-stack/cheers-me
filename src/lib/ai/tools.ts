import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { subDays, startOfWeek, endOfWeek, subYears, format, differenceInCalendarDays, getDay } from 'date-fns'
import { getQuarterDateRange, MODELO_347_THRESHOLD } from '@/lib/utils/spanish-tax'
import { generateGeminiImage } from '@/lib/utils/gemini-image'
import sharp from 'sharp'
import { readFile } from 'fs/promises'
import { join } from 'path'

type ToolInput = Record<string, unknown>

export async function executeTool(
  toolName: string,
  toolInput: ToolInput
): Promise<unknown> {
  const supabase = await createClient()

  switch (toolName) {
    case 'query_sales':
      return await querySales(supabase, toolInput)
    case 'get_stock_levels':
      return await getStockLevels(supabase, toolInput)
    case 'get_staff_schedule':
      return await getStaffSchedule(supabase, toolInput)
    case 'get_reservations':
      return await getReservations(supabase, toolInput)
    case 'generate_social_post':
      return await generateSocialPost(toolInput)
    case 'draft_newsletter':
      return await draftNewsletter(supabase, toolInput)
    case 'get_events':
      return await getEvents(supabase, toolInput)
    case 'query_financials':
      return await queryFinancials(supabase, toolInput)
    case 'get_reviews':
      return await getReviews(supabase, toolInput)
    case 'draft_review_reply':
      return await draftReviewReply(supabase, toolInput)
    case 'suggest_schedule':
      return await suggestSchedule(supabase, toolInput)
    case 'predict_demand':
      return await predictDemand(supabase, toolInput)
    case 'analyze_trends':
      return await analyzeTrends(supabase, toolInput)
    case 'compare_periods':
      return await comparePeriods(supabase, toolInput)
    case 'employee_performance':
      return await employeePerformance(supabase, toolInput)
    case 'profit_analysis':
      return await profitAnalysis(supabase, toolInput)
    case 'query_tax_data':
      return await queryTaxData(supabase, toolInput)
    case 'generate_tax_form_url':
      return generateTaxFormUrl(toolInput)
    case 'get_cocktail_recipe':
      return await getCocktailRecipe(supabase, toolInput)
    case 'get_cocktail_cost':
      return await getCocktailCost(supabase, toolInput)
    case 'search_cocktails_by_ingredient':
      return await searchCocktailsByIngredient(supabase, toolInput)
    case 'get_cocktail_preparation_guide':
      return await getCocktailPreparationGuide(supabase, toolInput)
    case 'suggest_cocktail':
      return await suggestCocktail(supabase, toolInput)
    case 'get_training_guide':
      return await getTrainingGuide(supabase, toolInput)
    case 'get_training_compliance':
      return await getTrainingCompliance(supabase, toolInput)
    case 'get_task_templates':
      return await getTaskTemplates(supabase, toolInput)
    case 'get_overdue_tasks':
      return await getOverdueTasks(supabase, toolInput)
    case 'get_business_resource':
      return getBusinessResource(toolInput)
    case 'generate_image':
      return await generateImage(supabase, toolInput)
    case 'get_employees':
      return await getEmployees(supabase, toolInput)
    case 'get_employee_details':
      return await getEmployeeDetails(supabase, toolInput)
    case 'get_leave_requests':
      return await getLeaveRequests(supabase, toolInput)
    case 'get_employee_availability':
      return await getEmployeeAvailability(supabase, toolInput)
    case 'get_schedule_plans':
      return await getSchedulePlans(supabase, toolInput)
    case 'export_to_excel':
      return await exportToExcel(supabase, toolInput)
    case 'get_ads':
      return await getAds(supabase, toolInput)
    case 'get_coupons':
      return await getCoupons(supabase, toolInput)
    case 'get_weekly_task_plan':
      return await getWeeklyTaskPlan(supabase, toolInput)
    case 'get_zone_assignments':
      return await getZoneAssignments(supabase, toolInput)
    case 'get_floor_sections':
      return await getFloorSections(supabase)
    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}

async function querySales(supabase: SupabaseClient, input: ToolInput) {
  const { date_from, date_to, compare_with } = input as {
    date_from: string
    date_to?: string
    compare_with?: string
  }

  const endDate = date_to || date_from

  const { data, error } = await supabase
    .from('daily_sales')
    .select('*')
    .gte('date', date_from)
    .lte('date', endDate)
    .order('date')

  if (error) return { error: error.message }

  if (!data || data.length === 0) {
    return {
      message: 'No sales data found for this period',
      period: { from: date_from, to: endDate }
    }
  }

  const totals = data.reduce((acc, day) => ({
    food: acc.food + (day.food_revenue || 0),
    drinks: acc.drinks + (day.drink_revenue || 0),
    cocktails: acc.cocktails + (day.cocktail_revenue || 0),
    beer: acc.beer + (day.beer_revenue || 0),
    desserts: acc.desserts + (day.dessert_revenue || 0),
    total: acc.total + (day.total_revenue || 0),
    covers: acc.covers + (day.total_covers || 0),
  }), { food: 0, drinks: 0, cocktails: 0, beer: 0, desserts: 0, total: 0, covers: 0 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {
    period: { from: date_from, to: endDate },
    days: data.length,
    ...totals,
    average_ticket: totals.covers > 0 ? (totals.total / totals.covers).toFixed(2) : 0,
  }

  // Add comparison if requested
  if (compare_with && compare_with !== 'none') {
    const daysDiff = data.length
    let compareFrom: string
    let compareTo: string

    if (compare_with === 'previous_period') {
      compareTo = subDays(new Date(date_from), 1).toISOString().split('T')[0]
      compareFrom = subDays(new Date(compareTo), daysDiff - 1).toISOString().split('T')[0]
    } else {
      // same_period_last_year
      compareFrom = subYears(new Date(date_from), 1).toISOString().split('T')[0]
      compareTo = subYears(new Date(endDate), 1).toISOString().split('T')[0]
    }

    const { data: compareData } = await supabase
      .from('daily_sales')
      .select('*')
      .gte('date', compareFrom)
      .lte('date', compareTo)

    if (compareData && compareData.length > 0) {
      const compareTotals = compareData.reduce((acc, day) => ({
        total: acc.total + (day.total_revenue || 0),
        covers: acc.covers + (day.total_covers || 0),
      }), { total: 0, covers: 0 })

      result.comparison = {
        period: { from: compareFrom, to: compareTo },
        revenue: compareTotals.total,
        covers: compareTotals.covers,
        revenue_change: totals.total - compareTotals.total,
        revenue_change_percent: compareTotals.total > 0
          ? (((totals.total - compareTotals.total) / compareTotals.total) * 100).toFixed(1)
          : 0,
        covers_change: totals.covers - compareTotals.covers,
      }
    }
  }

  return result
}

async function getStockLevels(supabase: SupabaseClient, input: ToolInput) {
  const { category, only_low_stock, only_beer } = input as {
    category?: string
    only_low_stock?: boolean
    only_beer?: boolean
  }

  let query = supabase
    .from('products')
    .select('id, name, category, current_stock, min_stock, max_stock, unit, cost_per_unit')

  if (category) {
    query = query.eq('category', category)
  }

  if (only_beer) {
    query = query.eq('category', 'beer')
  }

  if (only_low_stock) {
    query = query.lt('current_stock', 'min_stock')
  }

  query = query.order('current_stock', { ascending: true })

  const { data, error } = await query

  if (error) return { error: error.message }

  // Calculate days until depleted based on recent consumption
  const productsWithMetrics = await Promise.all(
    (data || []).map(async (product) => {
      // Get average daily consumption from last 7 days
      const sevenDaysAgo = subDays(new Date(), 7).toISOString().split('T')[0]
      const { data: movements } = await supabase
        .from('stock_movements')
        .select('quantity')
        .eq('product_id', product.id)
        .eq('movement_type', 'out')
        .gte('date', sevenDaysAgo)

      const totalUsed = movements?.reduce((sum, m) => sum + Math.abs(m.quantity), 0) || 0
      const avgDailyConsumption = totalUsed / 7

      const daysUntilEmpty = avgDailyConsumption > 0
        ? Math.floor(product.current_stock / avgDailyConsumption)
        : null

      return {
        ...product,
        avg_daily_consumption: avgDailyConsumption.toFixed(2),
        days_until_empty: daysUntilEmpty,
        is_low_stock: product.current_stock < product.min_stock,
      }
    })
  )

  return {
    count: productsWithMetrics.length,
    products: productsWithMetrics,
  }
}

async function getStaffSchedule(supabase: SupabaseClient, input: ToolInput) {
  const { date, date_to, employee_id, role } = input as {
    date: string
    date_to?: string
    employee_id?: string
    role?: string
  }

  let query = supabase
    .from('shifts')
    .select(`
      id,
      date,
      start_time,
      end_time,
      role,
      status,
      employee:employees!inner(id, name, role, phone)
    `)
    .gte('date', date)

  if (date_to) {
    query = query.lte('date', date_to)
  } else {
    query = query.eq('date', date)
  }

  if (employee_id) {
    query = query.eq('employee_id', employee_id)
  }

  if (role) {
    query = query.eq('role', role)
  }

  query = query.order('date').order('start_time')

  const { data, error } = await query

  if (error) return { error: error.message }

  return {
    shifts_count: data?.length || 0,
    shifts: data || [],
  }
}

async function getReservations(supabase: SupabaseClient, input: ToolInput) {
  const { date, status } = input as {
    date: string
    status?: string
  }

  let query = supabase
    .from('reservations')
    .select(`
      id,
      guest_name,
      guest_phone,
      guest_email,
      party_size,
      reservation_time,
      status,
      special_requests,
      table:tables(name, capacity)
    `)
    .eq('reservation_date', date)

  if (status) {
    query = query.eq('status', status)
  }

  query = query.order('reservation_time')

  const { data, error } = await query

  if (error) return { error: error.message }

  return {
    date,
    count: data?.length || 0,
    total_covers: data?.reduce((sum, r) => sum + r.party_size, 0) || 0,
    reservations: data || [],
  }
}

async function generateSocialPost(input: ToolInput) {
  const { topic, platform = 'both', tone = 'casual', languages = ['en', 'nl'] } = input as {
    topic: string
    platform?: string
    tone?: string
    languages?: string[]
  }

  // This tool doesn't query DB - Claude generates content directly
  // Return a structure that Claude will fill with actual content
  return {
    instruction: 'Generate social media content based on the topic and tone',
    topic,
    platform,
    tone,
    languages,
    template: {
      text: 'Generate engaging post text here',
      hashtags: 'Include relevant hashtags',
      suggested_time: 'Best time to post',
    }
  }
}

async function draftNewsletter(supabase: SupabaseClient, input: ToolInput) {
  const {
    week_start,
    languages = ['en', 'nl'],
    include_events = true,
    include_menu_highlights = true,
    custom_message
  } = input as {
    week_start: string
    languages?: string[]
    include_events?: boolean
    include_menu_highlights?: boolean
    custom_message?: string
  }

  const weekEnd = endOfWeek(new Date(week_start)).toISOString().split('T')[0]

  let eventsData = null
  let menuData = null

  if (include_events) {
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', week_start)
      .lte('event_date', weekEnd)
      .order('event_date')

    eventsData = events
  }

  if (include_menu_highlights) {
    const { data: menu } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .eq('is_featured', true)
      .limit(5)

    menuData = menu
  }

  return {
    week: { start: week_start, end: weekEnd },
    events: eventsData,
    menu_highlights: menuData,
    custom_message,
    languages,
  }
}

async function getEvents(supabase: SupabaseClient, input: ToolInput) {
  const { date_from, date_to, event_type = 'all' } = input as {
    date_from: string
    date_to?: string
    event_type?: string
  }

  let query = supabase
    .from('events')
    .select(`
      id,
      title,
      description,
      event_date,
      start_time,
      end_time,
      event_type,
      status,
      dj:djs(name, genre)
    `)
    .gte('event_date', date_from)

  if (date_to) {
    query = query.lte('event_date', date_to)
  }

  if (event_type && event_type !== 'all') {
    query = query.eq('event_type', event_type)
  }

  query = query.order('event_date').order('start_time')

  const { data, error } = await query

  if (error) return { error: error.message }

  return {
    count: data?.length || 0,
    events: data || [],
  }
}

async function queryFinancials(supabase: SupabaseClient, input: ToolInput) {
  const { period, date_from, date_to, metric = 'all' } = input as {
    period: string
    date_from?: string
    date_to?: string
    metric?: string
  }

  let startDate: string
  let endDate: string

  const today = new Date()

  switch (period) {
    case 'today':
      startDate = endDate = format(today, 'yyyy-MM-dd')
      break
    case 'this_week':
      startDate = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      endDate = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      break
    case 'this_month':
      startDate = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd')
      endDate = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd')
      break
    case 'last_month':
      startDate = format(new Date(today.getFullYear(), today.getMonth() - 1, 1), 'yyyy-MM-dd')
      endDate = format(new Date(today.getFullYear(), today.getMonth(), 0), 'yyyy-MM-dd')
      break
    case 'custom':
      if (!date_from || !date_to) {
        return { error: 'date_from and date_to required for custom period' }
      }
      startDate = date_from
      endDate = date_to
      break
    default:
      return { error: 'Invalid period' }
  }

  // Query sales for revenue
  const { data: salesData } = await supabase
    .from('daily_sales')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)

  const totalRevenue = salesData?.reduce((sum, day) => sum + (day.total_revenue || 0), 0) || 0
  const foodRevenue = salesData?.reduce((sum, day) => sum + (day.food_revenue || 0), 0) || 0
  const beverageRevenue = salesData?.reduce((sum, day) => sum + (day.drink_revenue || 0) + (day.cocktail_revenue || 0) + (day.beer_revenue || 0), 0) || 0

  // Query stock costs (simplified - would need more complex logic in production)
  const { data: stockMovements } = await supabase
    .from('stock_movements')
    .select('quantity, products!inner(cost_per_unit)')
    .eq('movement_type', 'out')
    .gte('date', startDate)
    .lte('date', endDate)

  const totalCOGS = stockMovements?.reduce((sum, movement) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cost = Math.abs(movement.quantity) * ((movement.products as any).cost_per_unit || 0)
    return sum + cost
  }, 0) || 0

  // Query labor costs (from shifts)
  const { data: shifts } = await supabase
    .from('shifts')
    .select('hours_worked, employee:employees!inner(hourly_rate)')
    .gte('date', startDate)
    .lte('date', endDate)

  const totalLaborCost = shifts?.reduce((sum, shift) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cost = (shift.hours_worked || 0) * ((shift.employee as any).hourly_rate || 0)
    return sum + cost
  }, 0) || 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {
    period: { from: startDate, to: endDate },
    total_revenue: totalRevenue.toFixed(2),
  }

  if (metric === 'all' || metric === 'food_cost') {
    result.food_cost = {
      amount: (totalCOGS * 0.6).toFixed(2), // Approximation: 60% of COGS is food
      ratio: foodRevenue > 0 ? (((totalCOGS * 0.6) / foodRevenue) * 100).toFixed(1) : 0,
      target: '30%',
    }
  }

  if (metric === 'all' || metric === 'beverage_cost') {
    result.beverage_cost = {
      amount: (totalCOGS * 0.4).toFixed(2), // Approximation: 40% of COGS is beverage
      ratio: beverageRevenue > 0 ? (((totalCOGS * 0.4) / beverageRevenue) * 100).toFixed(1) : 0,
      target: '22%',
    }
  }

  if (metric === 'all' || metric === 'labor_cost') {
    result.labor_cost = {
      amount: totalLaborCost.toFixed(2),
      ratio: totalRevenue > 0 ? ((totalLaborCost / totalRevenue) * 100).toFixed(1) : 0,
      target: '30%',
    }
  }

  if (metric === 'all' || metric === 'pnl') {
    result.profit_loss = {
      revenue: totalRevenue.toFixed(2),
      cogs: totalCOGS.toFixed(2),
      labor: totalLaborCost.toFixed(2),
      gross_profit: (totalRevenue - totalCOGS - totalLaborCost).toFixed(2),
      margin: totalRevenue > 0
        ? (((totalRevenue - totalCOGS - totalLaborCost) / totalRevenue) * 100).toFixed(1)
        : 0,
    }
  }

  return result
}

async function getReviews(supabase: SupabaseClient, input: ToolInput) {
  const { days = 7, sentiment, pending_response } = input as {
    days?: number
    sentiment?: string
    pending_response?: boolean
  }

  const dateFrom = subDays(new Date(), days).toISOString().split('T')[0]

  let query = supabase
    .from('customer_reviews')
    .select('*')
    .gte('review_date', dateFrom)

  if (sentiment && sentiment !== 'all') {
    query = query.eq('sentiment', sentiment)
  }

  if (pending_response) {
    query = query.is('response', null)
  }

  query = query.order('review_date', { ascending: false })

  const { data, error } = await query

  if (error) return { error: error.message }

  return {
    count: data?.length || 0,
    reviews: data || [],
  }
}

async function draftReviewReply(supabase: SupabaseClient, input: ToolInput) {
  const { review_id, tone = 'professional', language } = input as {
    review_id: string
    tone?: string
    language?: string
  }

  const { data: review, error } = await supabase
    .from('customer_reviews')
    .select('*')
    .eq('id', review_id)
    .single()

  if (error) return { error: error.message }
  if (!review) return { error: 'Review not found' }

  return {
    review,
    tone,
    language: language || 'en',
    instruction: 'Generate a reply to this review based on the sentiment and tone',
  }
}

async function suggestSchedule(supabase: SupabaseClient, input: ToolInput) {
  const { date } = input as {
    date: string
    week?: boolean
  }

  const targetDate = new Date(date)
  const dayOfWeek = targetDate.getDay()

  // Get historical data for same day of week
  const historicalDate = subDays(targetDate, 7).toISOString().split('T')[0]

  const { data: historicalSales } = await supabase
    .from('daily_sales')
    .select('total_revenue, total_covers')
    .eq('date', historicalDate)
    .single()

  // Get events for the target date
  const { data: events } = await supabase
    .from('events')
    .select('event_type, title')
    .eq('event_date', date)

  // Get staff availability
  const { data: availability } = await supabase
    .from('availability')
    .select('employee_id, employees!inner(name, role)')
    .eq('date', date)
    .eq('is_available', true)

  return {
    date,
    day_of_week: dayOfWeek,
    historical_data: historicalSales,
    events: events || [],
    available_staff: availability || [],
    recommendation: 'AI will generate staffing recommendations based on this data',
  }
}

async function predictDemand(supabase: SupabaseClient, input: ToolInput) {
  const { date, metric = 'revenue' } = input as {
    date: string
    metric?: string
  }

  const targetDate = new Date(date)

  // Get last 4 weeks of same day
  const historicalDates = [7, 14, 21, 28].map(days =>
    subDays(targetDate, days).toISOString().split('T')[0]
  )

  const { data: historicalSales } = await supabase
    .from('daily_sales')
    .select('date, total_revenue, total_covers')
    .in('date', historicalDates)
    .order('date')

  // Get events for target date
  const { data: events } = await supabase
    .from('events')
    .select('event_type')
    .eq('event_date', date)

  const hasEvent = events && events.length > 0

  let avgValue = 0
  if (historicalSales && historicalSales.length > 0) {
    if (metric === 'revenue') {
      avgValue = historicalSales.reduce((sum, day) => sum + day.total_revenue, 0) / historicalSales.length
    } else if (metric === 'covers') {
      avgValue = historicalSales.reduce((sum, day) => sum + day.total_covers, 0) / historicalSales.length
    }
  }

  // Apply event multiplier
  const eventMultiplier = hasEvent ? 1.2 : 1.0

  return {
    date,
    metric,
    historical_average: avgValue.toFixed(2),
    has_event: hasEvent,
    event_multiplier: eventMultiplier,
    predicted_value: (avgValue * eventMultiplier).toFixed(2),
    confidence: historicalSales?.length === 4 ? 'high' : 'medium',
  }
}

// ============================================
// ANALYTICAL TOOLS
// ============================================

async function analyzeTrends(supabase: SupabaseClient, input: ToolInput) {
  const { date_from, date_to, metric = 'revenue' } = input as {
    date_from: string
    date_to: string
    metric?: 'revenue' | 'covers' | 'avg_ticket'
  }

  const { data, error } = await supabase
    .from('daily_sales')
    .select('*')
    .gte('date', date_from)
    .lte('date', date_to)
    .order('date')

  if (error) return { error: error.message }
  if (!data || data.length === 0) {
    return { message: 'No sales data found for this period', period: { from: date_from, to: date_to } }
  }

  // Extract the metric values
  const values = data.map(day => {
    switch (metric) {
      case 'covers':
        return { date: day.date, value: day.total_covers || 0 }
      case 'avg_ticket':
        return {
          date: day.date,
          value: (day.total_covers || 0) > 0
            ? (day.total_revenue || 0) / (day.total_covers || 1)
            : 0
        }
      default: // revenue
        return { date: day.date, value: day.total_revenue || 0 }
    }
  })

  // 7-day moving average
  const movingAverage = values.map((item, idx) => {
    const windowStart = Math.max(0, idx - 6)
    const window = values.slice(windowStart, idx + 1)
    const avg = window.reduce((sum, v) => sum + v.value, 0) / window.length
    return { date: item.date, value: parseFloat(avg.toFixed(2)) }
  })

  // Find peaks
  const sortedByValue = [...values].sort((a, b) => b.value - a.value)
  const bestDay = sortedByValue[0]
  const worstDay = sortedByValue[sortedByValue.length - 1]

  // Day-of-week averages (0=Sunday, 1=Monday, ..., 6=Saturday)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayBuckets: Record<number, number[]> = {}
  for (const item of values) {
    const dayOfWeek = getDay(new Date(item.date))
    if (!dayBuckets[dayOfWeek]) dayBuckets[dayOfWeek] = []
    dayBuckets[dayOfWeek].push(item.value)
  }

  const dayOfWeekAverages = Object.entries(dayBuckets).map(([day, vals]) => ({
    day: dayNames[parseInt(day)],
    day_number: parseInt(day),
    average: parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)),
    sample_size: vals.length,
  })).sort((a, b) => a.day_number - b.day_number)

  // Trend direction (compare first half average to second half average)
  const midpoint = Math.floor(values.length / 2)
  const firstHalf = values.slice(0, midpoint)
  const secondHalf = values.slice(midpoint)
  const firstAvg = firstHalf.reduce((s, v) => s + v.value, 0) / (firstHalf.length || 1)
  const secondAvg = secondHalf.reduce((s, v) => s + v.value, 0) / (secondHalf.length || 1)
  const trendPercent = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0

  return {
    period: { from: date_from, to: date_to },
    metric,
    total_days: values.length,
    data: values,
    moving_average_7d: movingAverage,
    best_day: bestDay,
    worst_day: worstDay,
    day_of_week_averages: dayOfWeekAverages,
    trend: {
      direction: trendPercent > 2 ? 'up' : trendPercent < -2 ? 'down' : 'stable',
      percent_change: parseFloat(trendPercent.toFixed(1)),
      first_half_avg: parseFloat(firstAvg.toFixed(2)),
      second_half_avg: parseFloat(secondAvg.toFixed(2)),
    },
  }
}

async function comparePeriods(supabase: SupabaseClient, input: ToolInput) {
  const { period1_from, period1_to, period2_from, period2_to } = input as {
    period1_from: string
    period1_to: string
    period2_from: string
    period2_to: string
  }

  const [{ data: data1, error: err1 }, { data: data2, error: err2 }] = await Promise.all([
    supabase.from('daily_sales').select('*').gte('date', period1_from).lte('date', period1_to).order('date'),
    supabase.from('daily_sales').select('*').gte('date', period2_from).lte('date', period2_to).order('date'),
  ])

  if (err1) return { error: `Period 1 error: ${err1.message}` }
  if (err2) return { error: `Period 2 error: ${err2.message}` }

  function summarize(data: typeof data1, from: string, to: string) {
    const rows = data || []
    const days = differenceInCalendarDays(new Date(to), new Date(from)) + 1
    const totalRevenue = rows.reduce((s, d) => s + (d.total_revenue || 0), 0)
    const totalCovers = rows.reduce((s, d) => s + (d.total_covers || 0), 0)
    const foodRevenue = rows.reduce((s, d) => s + (d.food_revenue || 0), 0)
    const drinkRevenue = rows.reduce((s, d) => s + (d.drink_revenue || 0) + (d.cocktail_revenue || 0) + (d.beer_revenue || 0), 0)

    return {
      period: { from, to },
      days_with_data: rows.length,
      total_days: days,
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      total_covers: totalCovers,
      avg_daily_revenue: parseFloat((totalRevenue / (rows.length || 1)).toFixed(2)),
      avg_daily_covers: parseFloat((totalCovers / (rows.length || 1)).toFixed(2)),
      avg_ticket: totalCovers > 0 ? parseFloat((totalRevenue / totalCovers).toFixed(2)) : 0,
      food_revenue: parseFloat(foodRevenue.toFixed(2)),
      drink_revenue: parseFloat(drinkRevenue.toFixed(2)),
    }
  }

  const p1 = summarize(data1, period1_from, period1_to)
  const p2 = summarize(data2, period2_from, period2_to)

  function pctChange(a: number, b: number): number {
    if (a === 0) return b > 0 ? 100 : 0
    return parseFloat((((b - a) / a) * 100).toFixed(1))
  }

  return {
    period1: p1,
    period2: p2,
    comparison: {
      revenue_change: parseFloat((p2.total_revenue - p1.total_revenue).toFixed(2)),
      revenue_change_pct: pctChange(p1.total_revenue, p2.total_revenue),
      covers_change: p2.total_covers - p1.total_covers,
      covers_change_pct: pctChange(p1.total_covers, p2.total_covers),
      avg_ticket_change: parseFloat((p2.avg_ticket - p1.avg_ticket).toFixed(2)),
      avg_ticket_change_pct: pctChange(p1.avg_ticket, p2.avg_ticket),
      avg_daily_revenue_change: parseFloat((p2.avg_daily_revenue - p1.avg_daily_revenue).toFixed(2)),
      avg_daily_revenue_change_pct: pctChange(p1.avg_daily_revenue, p2.avg_daily_revenue),
    },
  }
}

async function employeePerformance(supabase: SupabaseClient, input: ToolInput) {
  const { employee_id, date_from, date_to } = input as {
    employee_id?: string
    date_from: string
    date_to: string
  }

  let query = supabase
    .from('shifts')
    .select(`
      id,
      date,
      start_time,
      end_time,
      hours_worked,
      role,
      employee:employees!inner(id, name, role, hourly_rate)
    `)
    .gte('date', date_from)
    .lte('date', date_to)

  if (employee_id) {
    query = query.eq('employee_id', employee_id)
  }

  const { data, error } = await query

  if (error) return { error: error.message }
  if (!data || data.length === 0) {
    return { message: 'No shift data found for this period', period: { from: date_from, to: date_to } }
  }

  // Group by employee
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const employeeMap: Record<string, { name: string; role: string; hourly_rate: number; shifts: any[] }> = {}

  for (const shift of data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emp = shift.employee as any
    const empId = emp.id as string
    if (!employeeMap[empId]) {
      employeeMap[empId] = {
        name: emp.name,
        role: emp.role,
        hourly_rate: emp.hourly_rate || 0,
        shifts: [],
      }
    }
    employeeMap[empId].shifts.push(shift)
  }

  const totalWeeks = Math.max(1, differenceInCalendarDays(new Date(date_to), new Date(date_from)) / 7)

  const employees = Object.entries(employeeMap).map(([id, emp]) => {
    const totalHours = emp.shifts.reduce((sum, s) => sum + (s.hours_worked || 0), 0)
    const totalCost = totalHours * emp.hourly_rate
    const shiftsPerWeek = emp.shifts.length / totalWeeks
    const avgHoursPerShift = emp.shifts.length > 0 ? totalHours / emp.shifts.length : 0

    return {
      employee_id: id,
      name: emp.name,
      role: emp.role,
      total_shifts: emp.shifts.length,
      total_hours: parseFloat(totalHours.toFixed(1)),
      total_cost: parseFloat(totalCost.toFixed(2)),
      shifts_per_week: parseFloat(shiftsPerWeek.toFixed(1)),
      avg_hours_per_shift: parseFloat(avgHoursPerShift.toFixed(1)),
      hourly_rate: emp.hourly_rate,
    }
  }).sort((a, b) => b.total_hours - a.total_hours)

  const totalHoursAll = employees.reduce((s, e) => s + e.total_hours, 0)
  const totalCostAll = employees.reduce((s, e) => s + e.total_cost, 0)

  return {
    period: { from: date_from, to: date_to },
    total_weeks: parseFloat(totalWeeks.toFixed(1)),
    total_employees: employees.length,
    total_hours: parseFloat(totalHoursAll.toFixed(1)),
    total_labor_cost: parseFloat(totalCostAll.toFixed(2)),
    employees,
  }
}

async function profitAnalysis(supabase: SupabaseClient, input: ToolInput) {
  const { period, date_from, date_to } = input as {
    period: string
    date_from?: string
    date_to?: string
  }

  let startDate: string
  let endDate: string
  const today = new Date()

  switch (period) {
    case 'today':
      startDate = endDate = format(today, 'yyyy-MM-dd')
      break
    case 'this_week':
      startDate = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      endDate = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      break
    case 'this_month':
      startDate = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd')
      endDate = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd')
      break
    case 'custom':
      if (!date_from || !date_to) {
        return { error: 'date_from and date_to required for custom period' }
      }
      startDate = date_from
      endDate = date_to
      break
    default:
      return { error: 'Invalid period' }
  }

  // Parallel queries
  const [salesResult, movementsResult, shiftsResult, overheadResult, targetsResult] = await Promise.all([
    supabase.from('daily_sales').select('*').gte('date', startDate).lte('date', endDate),
    supabase.from('stock_movements').select('quantity, products!inner(cost_per_unit, category)').eq('movement_type', 'out').gte('date', startDate).lte('date', endDate),
    supabase.from('shifts').select('hours_worked, employee:employees!inner(hourly_rate)').gte('date', startDate).lte('date', endDate),
    supabase.from('overhead_expenses').select('amount, category').gte('date', startDate).lte('date', endDate),
    supabase.from('financial_targets').select('*').limit(1).single(),
  ])

  const salesData = salesResult.data || []
  const movementsData = movementsResult.data || []
  const shiftsData = shiftsResult.data || []
  const overheadData = overheadResult.data || []
  const targets = targetsResult.data

  // Revenue breakdown
  const totalRevenue = salesData.reduce((s, d) => s + (d.total_revenue || 0), 0)
  const foodRevenue = salesData.reduce((s, d) => s + (d.food_revenue || 0), 0)
  const beverageRevenue = salesData.reduce((s, d) => s + (d.drink_revenue || 0) + (d.cocktail_revenue || 0) + (d.beer_revenue || 0), 0)
  const dessertRevenue = salesData.reduce((s, d) => s + (d.dessert_revenue || 0), 0)
  const totalCovers = salesData.reduce((s, d) => s + (d.total_covers || 0), 0)

  // COGS by category
  let foodCOGS = 0
  let beverageCOGS = 0
  for (const movement of movementsData) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product = movement.products as any
    const cost = Math.abs(movement.quantity) * (product.cost_per_unit || 0)
    const cat = product.category || ''
    if (['food', 'dessert'].includes(cat)) {
      foodCOGS += cost
    } else {
      beverageCOGS += cost
    }
  }
  const totalCOGS = foodCOGS + beverageCOGS

  // Labor cost
  const totalLaborCost = shiftsData.reduce((sum, shift) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cost = (shift.hours_worked || 0) * ((shift.employee as any).hourly_rate || 0)
    return sum + cost
  }, 0)

  // Overhead
  const totalOverhead = overheadData.reduce((s, e) => s + (e.amount || 0), 0)
  const overheadByCategory: Record<string, number> = {}
  for (const expense of overheadData) {
    const cat = expense.category || 'other'
    overheadByCategory[cat] = (overheadByCategory[cat] || 0) + (expense.amount || 0)
  }

  // P&L
  const grossProfit = totalRevenue - totalCOGS
  const operatingProfit = grossProfit - totalLaborCost - totalOverhead
  const netMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0

  // Ratios
  const foodCostRatio = foodRevenue > 0 ? (foodCOGS / foodRevenue) * 100 : 0
  const beverageCostRatio = beverageRevenue > 0 ? (beverageCOGS / beverageRevenue) * 100 : 0
  const laborCostRatio = totalRevenue > 0 ? (totalLaborCost / totalRevenue) * 100 : 0
  const avgTicket = totalCovers > 0 ? totalRevenue / totalCovers : 0

  // Targets comparison
  const targetFoodCost = targets?.food_cost_target || 30
  const targetBeverageCost = targets?.beverage_cost_target || 22
  const targetLaborCost = targets?.labor_cost_target || 30
  const targetAvgTicket = targets?.avg_ticket_target || 27.5

  // Generate recommendations
  const recommendations: string[] = []

  if (foodCostRatio > targetFoodCost) {
    recommendations.push(`Food cost ratio (${foodCostRatio.toFixed(1)}%) exceeds target (${targetFoodCost}%). Review portion sizes and supplier prices.`)
  }
  if (beverageCostRatio > targetBeverageCost) {
    recommendations.push(`Beverage cost ratio (${beverageCostRatio.toFixed(1)}%) exceeds target (${targetBeverageCost}%). Check pour control and pricing.`)
  }
  if (laborCostRatio > targetLaborCost) {
    recommendations.push(`Labor cost ratio (${laborCostRatio.toFixed(1)}%) exceeds target (${targetLaborCost}%). Consider optimizing shift scheduling.`)
  }
  if (avgTicket < targetAvgTicket) {
    recommendations.push(`Average ticket (${avgTicket.toFixed(2)}) below target (${targetAvgTicket}). Focus on upselling and menu engineering.`)
  }
  if (netMargin < 15) {
    recommendations.push(`Net margin (${netMargin.toFixed(1)}%) is below healthy threshold. Review all cost categories for savings.`)
  }
  if (recommendations.length === 0) {
    recommendations.push('All metrics are within target ranges. Keep up the good work!')
  }

  return {
    period: { from: startDate, to: endDate },
    days_with_data: salesData.length,
    pnl: {
      revenue: {
        total: parseFloat(totalRevenue.toFixed(2)),
        food: parseFloat(foodRevenue.toFixed(2)),
        beverages: parseFloat(beverageRevenue.toFixed(2)),
        desserts: parseFloat(dessertRevenue.toFixed(2)),
      },
      costs: {
        cogs: parseFloat(totalCOGS.toFixed(2)),
        food_cogs: parseFloat(foodCOGS.toFixed(2)),
        beverage_cogs: parseFloat(beverageCOGS.toFixed(2)),
        labor: parseFloat(totalLaborCost.toFixed(2)),
        overhead: parseFloat(totalOverhead.toFixed(2)),
        overhead_breakdown: overheadByCategory,
      },
      gross_profit: parseFloat(grossProfit.toFixed(2)),
      operating_profit: parseFloat(operatingProfit.toFixed(2)),
      net_margin_pct: parseFloat(netMargin.toFixed(1)),
    },
    ratios: {
      food_cost_pct: parseFloat(foodCostRatio.toFixed(1)),
      beverage_cost_pct: parseFloat(beverageCostRatio.toFixed(1)),
      labor_cost_pct: parseFloat(laborCostRatio.toFixed(1)),
      avg_ticket: parseFloat(avgTicket.toFixed(2)),
    },
    targets: {
      food_cost_target: targetFoodCost,
      beverage_cost_target: targetBeverageCost,
      labor_cost_target: targetLaborCost,
      avg_ticket_target: targetAvgTicket,
    },
    total_covers: totalCovers,
    recommendations,
  }
}

// ============================================
// TAX / FISCAL TOOLS
// ============================================

async function queryTaxData(supabase: SupabaseClient, input: ToolInput) {
  const { modelo, year, quarter } = input as {
    modelo: '303' | '111' | '347'
    year: number
    quarter?: number
  }

  if (modelo === '303') {
    if (!quarter || quarter < 1 || quarter > 4) {
      return { error: 'Quarter (1-4) is required for Modelo 303' }
    }
    const { start, end } = getQuarterDateRange(year, quarter)

    const [salesResult, expensesResult] = await Promise.all([
      supabase.from('sales_iva_breakdown').select('iva_rate, base_imponible, iva_amount').gte('date', start).lte('date', end),
      supabase.from('overhead_expenses').select('category, iva_amount, base_imponible').eq('is_deductible', true).gte('date', start).lte('date', end),
    ])

    const salesIVA = salesResult.data || []
    const expenses = expensesResult.data || []

    const repercutidoByRate = salesIVA.reduce((acc, row) => {
      const rate = row.iva_rate || 0
      const key = String(rate)
      if (!acc[key]) acc[key] = { rate, base: 0, iva: 0 }
      acc[key].base += row.base_imponible || 0
      acc[key].iva += row.iva_amount || 0
      return acc
    }, {} as Record<string, { rate: number; base: number; iva: number }>)

    const ivaRepercutido = salesIVA.reduce((sum, row) => sum + (row.iva_amount || 0), 0)
    const ivaSoportado = expenses.reduce((sum, row) => sum + (row.iva_amount || 0), 0)
    const resultado = ivaRepercutido - ivaSoportado

    const params = `year=${year}&quarter=${quarter}`
    return {
      modelo: '303',
      quarter: `${quarter}T ${year}`,
      period: { start, end },
      iva_repercutido: parseFloat(ivaRepercutido.toFixed(2)),
      iva_repercutido_by_rate: Object.values(repercutidoByRate).map(r => ({
        rate: r.rate,
        base: parseFloat(r.base.toFixed(2)),
        iva: parseFloat(r.iva.toFixed(2)),
      })),
      iva_soportado: parseFloat(ivaSoportado.toFixed(2)),
      resultado: parseFloat(resultado.toFixed(2)),
      resultado_type: resultado >= 0 ? 'A ingresar (to pay)' : 'A compensar (refund)',
      form_url: `/api/finance/tax-form/modelo303?${params}`,
      pdf_url: `/api/finance/print/modelo303?${params}`,
    }
  }

  if (modelo === '111') {
    if (!quarter || quarter < 1 || quarter > 4) {
      return { error: 'Quarter (1-4) is required for Modelo 111' }
    }
    const { start, end } = getQuarterDateRange(year, quarter)

    const { data: employees } = await supabase
      .from('employees')
      .select('id, profiles(full_name), gross_salary, irpf_retention')
      .gt('irpf_retention', 0)
      .gt('gross_salary', 0)

    const MONTHS_IN_QUARTER = 3
    const employeeBreakdown = (employees || []).map(emp => {
      const profile = (emp.profiles as { full_name: string }[] | null)?.[0] ?? null
      const grossSalary = emp.gross_salary || 0
      const irpfRate = emp.irpf_retention || 0
      const irpfAmount = Math.round(grossSalary * (irpfRate / 100) * MONTHS_IN_QUARTER * 100) / 100
      return {
        name: profile?.full_name || 'Unknown',
        gross_salary: grossSalary,
        irpf_rate: irpfRate,
        irpf_amount: irpfAmount,
      }
    })

    const totalIrpf = employeeBreakdown.reduce((sum, emp) => sum + emp.irpf_amount, 0)
    const params = `year=${year}&quarter=${quarter}`

    return {
      modelo: '111',
      quarter: `${quarter}T ${year}`,
      period: { start, end },
      employees: employeeBreakdown,
      total_irpf: parseFloat(totalIrpf.toFixed(2)),
      employee_count: employeeBreakdown.length,
      form_url: `/api/finance/tax-form/modelo111?${params}`,
      pdf_url: `/api/finance/print/modelo111?${params}`,
    }
  }

  if (modelo === '347') {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    const { data: expenses } = await supabase
      .from('overhead_expenses')
      .select('supplier_nif, vendor, amount')
      .gte('date', startDate)
      .lte('date', endDate)
      .not('supplier_nif', 'is', null)

    const supplierTotals = (expenses || []).reduce((acc, expense) => {
      const nif = expense.supplier_nif
      if (!nif) return acc
      if (!acc[nif]) acc[nif] = { nif, name: expense.vendor || 'Unknown', total: 0 }
      acc[nif].total += expense.amount || 0
      return acc
    }, {} as Record<string, { nif: string; name: string; total: number }>)

    const suppliers = Object.values(supplierTotals)
      .filter(s => s.total > MODELO_347_THRESHOLD)
      .map(s => ({ ...s, total: parseFloat(s.total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total)

    const totalAmount = suppliers.reduce((sum, s) => sum + s.total, 0)

    return {
      modelo: '347',
      year,
      threshold: MODELO_347_THRESHOLD,
      suppliers,
      total_suppliers: suppliers.length,
      total_amount: parseFloat(totalAmount.toFixed(2)),
      form_url: `/api/finance/tax-form/modelo347?year=${year}`,
      pdf_url: `/api/finance/print/modelo347?year=${year}`,
    }
  }

  return { error: `Unknown modelo: ${modelo}` }
}

// ============================================
// COCKTAIL TOOLS
// ============================================

async function getCocktailRecipe(supabase: SupabaseClient, input: ToolInput) {
  const { name, menu_item_id } = input as { name?: string; menu_item_id?: string }

  let query = supabase.from('v_cocktail_recipes_full').select('*')

  if (menu_item_id) {
    query = query.eq('menu_item_id', menu_item_id)
  } else if (name) {
    query = query.ilike('name_en', `%${name}%`)
  } else {
    return { error: 'Provide either name or menu_item_id' }
  }

  const { data, error } = await query

  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: 'Cocktail not found' }

  return {
    count: data.length,
    recipes: data.map(r => ({
      name: r.name_en,
      price: r.price,
      glass: r.glass_type,
      method: r.preparation_method,
      ice: r.ice_type,
      difficulty: r.difficulty_level,
      base_spirit: r.base_spirit,
      garnish: r.garnish,
      flavors: r.flavor_profiles,
      is_signature: r.is_signature,
      total_cost: r.total_cost,
      margin_percent: r.price > 0 ? parseFloat((((r.price - r.total_cost) / r.price) * 100).toFixed(1)) : 0,
      ingredients: r.ingredients,
      steps: r.steps,
    })),
  }
}

async function getCocktailCost(supabase: SupabaseClient, input: ToolInput) {
  const { name, menu_item_id } = input as { name?: string; menu_item_id?: string }

  let query = supabase.from('v_cocktail_recipes_full').select('name_en, price, total_cost, ingredients, menu_item_id')

  if (menu_item_id) {
    query = query.eq('menu_item_id', menu_item_id)
  } else if (name) {
    query = query.ilike('name_en', `%${name}%`)
  } else {
    return { error: 'Provide either name or menu_item_id' }
  }

  const { data, error } = await query.single()

  if (error) return { error: error.message }
  if (!data) return { error: 'Cocktail not found' }

  const ingredients = (data.ingredients || []) as Array<{ name: string; quantity: number; unit: string; cost_per_unit: number }>
  const totalCost = ingredients.reduce((sum: number, ing) => sum + (ing.quantity * ing.cost_per_unit), 0)

  return {
    cocktail: data.name_en,
    price: data.price,
    total_ingredient_cost: parseFloat(totalCost.toFixed(2)),
    margin: parseFloat((data.price - totalCost).toFixed(2)),
    margin_percent: data.price > 0 ? parseFloat((((data.price - totalCost) / data.price) * 100).toFixed(1)) : 0,
    cost_breakdown: ingredients.map((ing) => ({
      ingredient: ing.name,
      quantity: `${ing.quantity}${ing.unit}`,
      unit_cost: ing.cost_per_unit,
      total: parseFloat((ing.quantity * ing.cost_per_unit).toFixed(2)),
    })),
  }
}

async function searchCocktailsByIngredient(supabase: SupabaseClient, input: ToolInput) {
  const { ingredient } = input as { ingredient: string }

  // Search cocktails by base_spirit or ingredient name
  const [{ data: bySpiritData }, { data: byIngredientData }] = await Promise.all([
    supabase
      .from('v_cocktail_recipes_full')
      .select('name_en, price, glass_type, base_spirit, flavor_profiles, is_signature')
      .ilike('base_spirit', `%${ingredient}%`),
    supabase
      .from('menu_item_ingredients')
      .select('menu_item_id, name, menu_items!inner(name_en, price)')
      .ilike('name', `%${ingredient}%`),
  ])

  // Combine results, deduplicate by name
  const cocktails = new Map<string, unknown>()

  for (const r of bySpiritData || []) {
    cocktails.set(r.name_en, {
      name: r.name_en,
      price: r.price,
      glass: r.glass_type,
      base_spirit: r.base_spirit,
      flavors: r.flavor_profiles,
      is_signature: r.is_signature,
      match_type: 'base_spirit',
    })
  }

  for (const r of byIngredientData || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mi = r.menu_items as any
    if (mi && !cocktails.has(mi.name_en)) {
      cocktails.set(mi.name_en, {
        name: mi.name_en,
        price: mi.price,
        ingredient_match: r.name,
        match_type: 'ingredient',
      })
    }
  }

  return {
    ingredient,
    count: cocktails.size,
    cocktails: Array.from(cocktails.values()),
  }
}

async function getCocktailPreparationGuide(supabase: SupabaseClient, input: ToolInput) {
  const { name, language = 'en' } = input as { name: string; language?: string }

  const { data, error } = await supabase
    .from('v_cocktail_recipes_full')
    .select('*')
    .ilike('name_en', `%${name}%`)
    .limit(1)
    .single()

  if (error) return { error: error.message }
  if (!data) return { error: 'Cocktail not found' }

  const langKey = `name_${language}` as string
  const steps = (data.steps || []) as Array<{
    step_number: number
    instruction_en: string
    instruction_nl?: string
    instruction_es?: string
    instruction_de?: string
    duration_seconds?: number
    tip?: string
  }>

  const instrKey = `instruction_${language}` as keyof typeof steps[0]

  return {
    cocktail: (data as Record<string, unknown>)[langKey] || data.name_en,
    glass: data.glass_type,
    method: data.preparation_method,
    ice: data.ice_type,
    garnish: data.garnish,
    difficulty: data.difficulty_level,
    total_time_seconds: steps.reduce((sum: number, s) => sum + (s.duration_seconds || 0), 0),
    steps: steps.map(s => ({
      step: s.step_number,
      instruction: (s[instrKey] as string) || s.instruction_en,
      duration_seconds: s.duration_seconds,
      tip: s.tip,
    })),
    ingredients: data.ingredients,
  }
}

async function suggestCocktail(supabase: SupabaseClient, input: ToolInput) {
  const { flavor, spirit, occasion, difficulty } = input as {
    flavor?: string
    spirit?: string
    occasion?: string
    difficulty?: string
  }

  let query = supabase
    .from('v_cocktail_recipes_full')
    .select('name_en, description_en, price, glass_type, base_spirit, flavor_profiles, difficulty_level, is_signature')

  if (spirit) {
    query = query.ilike('base_spirit', `%${spirit}%`)
  }

  if (difficulty) {
    query = query.eq('difficulty_level', difficulty)
  }

  const { data, error } = await query.order('is_signature', { ascending: false })

  if (error) return { error: error.message }
  if (!data || data.length === 0) return { message: 'No cocktails found matching criteria' }

  let filtered = data

  // Filter by flavor profile if specified
  if (flavor) {
    filtered = filtered.filter(c =>
      c.flavor_profiles && (c.flavor_profiles as string[]).includes(flavor)
    )
  }

  // For occasion-based suggestions, map to flavors
  if (occasion && !flavor) {
    const occasionFlavors: Record<string, string[]> = {
      'hot day': ['refreshing', 'tropical', 'sour'],
      'after dinner': ['sweet', 'coffee', 'creamy', 'spirit_forward'],
      'celebration': ['refreshing', 'sweet', 'fruity'],
      'relaxing': ['sweet', 'creamy', 'herbal'],
      'party': ['tropical', 'sweet', 'fruity'],
      'date night': ['sweet', 'fruity', 'creamy'],
    }
    const targetFlavors = occasionFlavors[occasion.toLowerCase()] || []
    if (targetFlavors.length > 0) {
      filtered = filtered.filter(c =>
        c.flavor_profiles && (c.flavor_profiles as string[]).some(f => targetFlavors.includes(f))
      )
    }
  }

  return {
    criteria: { flavor, spirit, occasion, difficulty },
    count: filtered.length,
    suggestions: filtered.slice(0, 10).map(c => ({
      name: c.name_en,
      description: c.description_en,
      price: c.price,
      glass: c.glass_type,
      base_spirit: c.base_spirit,
      flavors: c.flavor_profiles,
      difficulty: c.difficulty_level,
      is_signature: c.is_signature,
    })),
  }
}

function generateTaxFormUrl(input: ToolInput) {
  const { modelo, year, quarter } = input as {
    modelo: '303' | '111' | '347'
    year: number
    quarter?: number
  }

  if ((modelo === '303' || modelo === '111') && (!quarter || quarter < 1 || quarter > 4)) {
    return { error: `Quarter (1-4) is required for Modelo ${modelo}` }
  }

  const params = modelo === '347'
    ? `year=${year}`
    : `year=${year}&quarter=${quarter}`

  return {
    modelo,
    year,
    quarter: quarter || null,
    form_url: `/api/finance/tax-form/modelo${modelo}?${params}`,
    pdf_url: `/api/finance/print/modelo${modelo}?${params}`,
    instructions: 'Share the form_url with the user so they can open the official pre-filled form in a new tab. The pdf_url provides a downloadable PDF version.',
  }
}

// ============================================
// BUSINESS RESOURCE TOOLS
// ============================================

async function getTrainingGuide(supabase: SupabaseClient, input: ToolInput) {
  const { guide_code, language = 'en' } = input as { guide_code: string; language?: string }

  // Get guide metadata from DB
  const { data: material, error: matError } = await supabase
    .from('training_materials')
    .select('id, guide_code, title, category, mandatory, roles, passing_score')
    .eq('guide_code', guide_code)
    .single()

  if (matError || !material) {
    return { error: `Training guide '${guide_code}' not found` }
  }

  // Guide content is in i18n JSON files — return API URL for fetching
  return {
    guide_code: material.guide_code,
    title: material.title,
    category: material.category,
    mandatory: material.mandatory,
    roles: material.roles,
    passing_score: material.passing_score,
    content_url: `/api/staff/training/guide-content/${guide_code}?lang=${language}`,
    instructions: 'Use the content_url to fetch the full guide content if needed.',
  }
}

async function getTrainingCompliance(supabase: SupabaseClient, input: ToolInput) {
  const { employee_id, category } = input as { employee_id?: string; category?: string }

  let query = supabase
    .from('training_records')
    .select(`
      id, employee_id, guide_code, status, score, completed_at,
      profiles!inner(full_name, role)
    `)
    .order('completed_at', { ascending: false })

  if (employee_id) {
    query = query.eq('employee_id', employee_id)
  }

  const { data, error } = await query.limit(100)
  if (error) return { error: error.message }

  // Get mandatory materials for filtering
  let materialsQuery = supabase
    .from('training_materials')
    .select('guide_code, title, category, mandatory')
    .eq('mandatory', true)

  if (category) {
    materialsQuery = materialsQuery.eq('category', category)
  }

  const { data: mandatoryMaterials } = await materialsQuery

  const mandatoryCodes = new Set((mandatoryMaterials || []).map(m => m.guide_code))
  const completedMap = new Map<string, Set<string>>()

  for (const record of data || []) {
    if (record.status === 'completed') {
      const key = record.employee_id
      if (!completedMap.has(key)) completedMap.set(key, new Set())
      completedMap.get(key)!.add(record.guide_code)
    }
  }

  return {
    total_mandatory_guides: mandatoryCodes.size,
    records_count: (data || []).length,
    records: (data || []).slice(0, 50).map(r => ({
      employee_id: r.employee_id,
      employee_name: (r.profiles as unknown as { full_name: string })?.full_name,
      guide_code: r.guide_code,
      status: r.status,
      score: r.score,
      completed_at: r.completed_at,
    })),
  }
}

async function getTaskTemplates(supabase: SupabaseClient, input: ToolInput) {
  const { frequency } = input as { frequency?: string }

  let query = supabase
    .from('staff_task_templates')
    .select('id, title, items, frequency, estimated_minutes, created_at')
    .order('title')

  if (frequency) {
    query = query.eq('frequency', frequency)
  }

  const { data, error } = await query.limit(50)
  if (error) return { error: error.message }

  return {
    count: (data || []).length,
    templates: (data || []).map(t => ({
      id: t.id,
      title: t.title,
      item_count: Array.isArray(t.items) ? t.items.length : 0,
      frequency: t.frequency,
      estimated_minutes: t.estimated_minutes,
    })),
  }
}

async function getOverdueTasks(supabase: SupabaseClient, input: ToolInput) {
  const { employee_id, priority, status = 'pending' } = input as {
    employee_id?: string
    priority?: string
    status?: string
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  let query = supabase
    .from('staff_tasks')
    .select(`
      id, title, status, priority, due_date, created_at,
      profiles!staff_tasks_assignee_id_fkey(full_name)
    `)
    .order('due_date', { ascending: true })

  if (employee_id) {
    query = query.eq('assignee_id', employee_id)
  }

  if (priority) {
    query = query.eq('priority', priority)
  }

  if (status === 'overdue') {
    query = query.in('status', ['pending', 'in_progress']).lt('due_date', today)
  } else {
    query = query.eq('status', status)
  }

  const { data, error } = await query.limit(50)
  if (error) return { error: error.message }

  return {
    count: (data || []).length,
    tasks: (data || []).map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      assignee: (t.profiles as unknown as { full_name: string })?.full_name,
      is_overdue: t.due_date && t.due_date < today,
    })),
  }
}

function getBusinessResource(input: ToolInput) {
  const { resource_type } = input as { resource_type: string }

  // Inline resource data to avoid dynamic require
  const BRAND = {
    logo: '/icons/logoheader.png',
    name: 'GrandCafe Cheers',
    location: 'El Arenal (Platja de Palma), Mallorca 07600',
    address: 'Carrer de Cartago 22, El Arenal (Platja de Palma), Mallorca 07600',
    phone: '+34 871 234 567',
    colors: { primary: '0.3800 0.1523 18.6219', accent: '0.4490 0.1606 17.6053' },
    social: { instagram: '@cheersmallorca', facebook: 'Grandcafe Cheers Mallorca' },
  }

  switch (resource_type) {
    case 'brand':
      return BRAND
    case 'tax_forms':
      return {
        modelo_303: '/api/finance/tax-form/modelo303',
        modelo_111: '/api/finance/tax-form/modelo111',
        modelo_347: '/api/finance/tax-form/modelo347',
      }
    case 'training_categories':
      return {
        categories: ['food_safety', 'occupational_health', 'labor_regulations', 'role_specific', 'required_docs', 'environmental'],
        total_guides: 74,
      }
    case 'schedule_shift_types':
      return {
        morning: { start: '10:30', end: '17:00', hours: 6.5 },
        afternoon: { start: '17:00', end: '23:00', hours: 6 },
        night: { start: '23:00', end: '03:00', hours: 4 },
      }
    default:
      return { error: `Unknown resource type: ${resource_type}` }
  }
}

// ============================================
// EMPLOYEE / SCHEDULE TOOLS (NEW)
// ============================================

async function getEmployees(supabase: SupabaseClient, input: ToolInput) {
  const { role, status = 'active' } = input as { role?: string; status?: string }

  let query = supabase
    .from('employees')
    .select('id, full_name, role, phone, email, contract_type, contract_hours, hourly_rate, status, profiles!inner(full_name, avatar_url)')
    .order('full_name')

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (role) {
    query = query.eq('role', role)
  }

  const { data, error } = await query

  if (error) return { error: error.message }

  return {
    count: (data || []).length,
    employees: (data || []).map(emp => ({
      id: emp.id,
      name: emp.full_name,
      role: emp.role,
      phone: emp.phone,
      email: emp.email,
      contract_type: emp.contract_type,
      contract_hours: emp.contract_hours,
      hourly_rate: emp.hourly_rate,
      status: emp.status,
    })),
  }
}

async function getEmployeeDetails(supabase: SupabaseClient, input: ToolInput) {
  const { employee_id } = input as { employee_id: string }

  const today = format(new Date(), 'yyyy-MM-dd')
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')

  const [employeeResult, shiftsResult, leaveResult, availabilityResult] = await Promise.all([
    supabase.from('employees').select('*, profiles!inner(full_name, avatar_url, email)').eq('id', employee_id).single(),
    supabase.from('shifts').select('id, date, start_time, end_time, role, hours_worked').eq('employee_id', employee_id).gte('date', thirtyDaysAgo).lte('date', today).order('date', { ascending: false }).limit(20),
    supabase.from('leave_requests').select('id, start_date, end_date, leave_type, status, notes').eq('employee_id', employee_id).order('start_date', { ascending: false }).limit(10),
    supabase.from('availability').select('date, is_available, preferred_shift, notes').eq('employee_id', employee_id).gte('date', today).order('date').limit(14),
  ])

  if (employeeResult.error) return { error: employeeResult.error.message }
  if (!employeeResult.data) return { error: 'Employee not found' }

  const emp = employeeResult.data
  const shifts = shiftsResult.data || []
  const totalHours = shifts.reduce((sum, s) => sum + (s.hours_worked || 0), 0)

  return {
    employee: {
      id: emp.id,
      name: emp.full_name,
      role: emp.role,
      phone: emp.phone,
      email: emp.email,
      contract_type: emp.contract_type,
      contract_hours: emp.contract_hours,
      weekly_hours_target: emp.weekly_hours_target,
      hourly_rate: emp.hourly_rate,
      gross_salary: emp.gross_salary,
      irpf_retention: emp.irpf_retention,
      status: emp.status,
    },
    recent_shifts: {
      count: shifts.length,
      total_hours: parseFloat(totalHours.toFixed(1)),
      shifts: shifts.slice(0, 10),
    },
    leave_requests: leaveResult.data || [],
    upcoming_availability: availabilityResult.data || [],
  }
}

async function getLeaveRequests(supabase: SupabaseClient, input: ToolInput) {
  const { status, employee_id, date_from, date_to } = input as {
    status?: string; employee_id?: string; date_from?: string; date_to?: string
  }

  let query = supabase
    .from('leave_requests')
    .select('id, employee_id, start_date, end_date, leave_type, status, notes, created_at, employees!inner(full_name, role)')
    .order('start_date', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  if (employee_id) {
    query = query.eq('employee_id', employee_id)
  }
  if (date_from) {
    query = query.gte('end_date', date_from)
  }
  if (date_to) {
    query = query.lte('start_date', date_to)
  }

  const { data, error } = await query.limit(50)
  if (error) return { error: error.message }

  return {
    count: (data || []).length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requests: (data || []).map(r => ({
      id: r.id,
      employee_id: r.employee_id,
      employee_name: (r.employees as any)?.full_name,
      employee_role: (r.employees as any)?.role,
      start_date: r.start_date,
      end_date: r.end_date,
      leave_type: r.leave_type,
      status: r.status,
      notes: r.notes,
    })),
  }
}

async function getEmployeeAvailability(supabase: SupabaseClient, input: ToolInput) {
  const { date_from, date_to, employee_id } = input as {
    date_from: string; date_to?: string; employee_id?: string
  }

  const endDate = date_to || date_from

  let availQuery = supabase
    .from('availability')
    .select('employee_id, date, is_available, preferred_shift, notes, employees!inner(full_name, role)')
    .gte('date', date_from)
    .lte('date', endDate)
    .order('date')

  let leaveQuery = supabase
    .from('leave_requests')
    .select('employee_id, start_date, end_date, leave_type, status, employees!inner(full_name)')
    .eq('status', 'approved')
    .lte('start_date', endDate)
    .gte('end_date', date_from)

  if (employee_id) {
    availQuery = availQuery.eq('employee_id', employee_id)
    leaveQuery = leaveQuery.eq('employee_id', employee_id)
  }

  const [availResult, leaveResult] = await Promise.all([availQuery, leaveQuery])

  return {
    period: { from: date_from, to: endDate },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    availability: (availResult.data || []).map(a => ({
      employee_id: a.employee_id,
      employee_name: (a.employees as any)?.full_name,
      date: a.date,
      is_available: a.is_available,
      preferred_shift: a.preferred_shift,
      notes: a.notes,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    approved_leaves: (leaveResult.data || []).map(l => ({
      employee_id: l.employee_id,
      employee_name: (l.employees as any)?.full_name,
      start_date: l.start_date,
      end_date: l.end_date,
      leave_type: l.leave_type,
    })),
  }
}

async function getSchedulePlans(supabase: SupabaseClient, input: ToolInput) {
  const { week_start, status } = input as { week_start?: string; status?: string }

  let query = supabase
    .from('schedule_plans')
    .select('id, week_start, status, notes, created_at, updated_at')
    .order('week_start', { ascending: false })

  if (week_start) {
    query = query.eq('week_start', week_start)
  }

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query.limit(20)
  if (error) return { error: error.message }

  // Get shift counts for each plan's week
  const plansWithCounts = await Promise.all(
    (data || []).map(async (plan) => {
      const weekEnd = format(endOfWeek(new Date(plan.week_start), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const { count } = await supabase
        .from('shifts')
        .select('id', { count: 'exact', head: true })
        .gte('date', plan.week_start)
        .lte('date', weekEnd)

      return {
        ...plan,
        shifts_count: count || 0,
      }
    })
  )

  return {
    count: plansWithCounts.length,
    plans: plansWithCounts,
  }
}

async function exportToExcel(supabase: SupabaseClient, input: ToolInput) {
  const { export_type, date_from, date_to } = input as {
    export_type: 'schedule' | 'tasks' | 'sales' | 'expenses'
    date_from?: string
    date_to?: string
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const params = new URLSearchParams({ type: export_type })
    if (date_from) params.set('date_from', date_from)
    if (date_to) params.set('date_to', date_to)

    // Call internal export API route
    const res = await fetch(`${baseUrl}/api/exports/excel?${params}`, {
      method: 'GET',
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Export failed' }))
      return { error: err.error || `HTTP ${res.status}` }
    }

    const result = await res.json()
    return {
      success: true,
      download_url: result.download_url,
      filename: result.filename,
      message: `Export ready: [${result.filename}](${result.download_url})`,
      export_type,
      period: { from: date_from, to: date_to },
    }
  } catch (error) {
    // If API route doesn't exist yet, return info message
    void supabase // used to satisfy linter
    return {
      error: 'Excel export API is not yet configured. The /api/exports/excel route needs to be created.',
      export_type,
      period: { from: date_from, to: date_to },
    }
  }
}

// ============================================
// ADVERTISING & COUPON TOOLS
// ============================================

async function getAds(supabase: SupabaseClient, input: ToolInput) {
  const { status, placement, template } = input as {
    status?: string
    placement?: string
    template?: string
  }

  let query = supabase
    .from('advertisements')
    .select('id, title, placement, template, status, content_en, content_nl, content_es, content_de, cta_text, cta_url, start_date, end_date, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (placement) {
    query = query.eq('placement', placement)
  }

  if (template) {
    query = query.eq('template', template)
  }

  const { data, error } = await query.limit(50)

  if (error) return { error: error.message }

  return {
    count: (data || []).length,
    ads: (data || []).map(ad => ({
      id: ad.id,
      title: ad.title,
      placement: ad.placement,
      template: ad.template,
      status: ad.status,
      content_en: ad.content_en,
      content_nl: ad.content_nl,
      content_es: ad.content_es,
      content_de: ad.content_de,
      cta_text: ad.cta_text,
      cta_url: ad.cta_url,
      start_date: ad.start_date,
      end_date: ad.end_date,
      created_at: ad.created_at,
    })),
  }
}

async function getCoupons(supabase: SupabaseClient, input: ToolInput) {
  const { status, search } = input as {
    status?: string
    search?: string
  }

  let query = supabase
    .from('gift_coupons')
    .select('id, code, amount, remaining_amount, status, purchaser_name, purchaser_email, recipient_name, recipient_email, message, expires_at, redeemed_at, created_at')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (search) {
    // Search by code or email
    query = query.or(`code.ilike.%${search}%,purchaser_email.ilike.%${search}%,recipient_email.ilike.%${search}%`)
  }

  const { data, error } = await query.limit(50)

  if (error) return { error: error.message }

  return {
    count: (data || []).length,
    coupons: (data || []).map(coupon => ({
      id: coupon.id,
      code: coupon.code,
      amount: coupon.amount,
      remaining_amount: coupon.remaining_amount,
      status: coupon.status,
      purchaser_name: coupon.purchaser_name,
      purchaser_email: coupon.purchaser_email,
      recipient_name: coupon.recipient_name,
      recipient_email: coupon.recipient_email,
      message: coupon.message,
      expires_at: coupon.expires_at,
      redeemed_at: coupon.redeemed_at,
      created_at: coupon.created_at,
    })),
  }
}

const IMAGE_BRAND_PREFIX = `For a Mediterranean restaurant bar called GrandCafe Cheers in Mallorca, Spain. Brand colors: deep burgundy/wine. Style: warm, Mediterranean, premium casual.\n`
const IMAGE_BRAND_SUFFIX = `\nDo NOT include any text in the image unless specifically requested.`

async function overlayLogo(imageBuffer: Buffer): Promise<Buffer> {
  const logoBuffer = await readFile(
    join(process.cwd(), 'public', 'icons', 'logoheader.png')
  )

  const image = sharp(imageBuffer)
  const { width, height } = await image.metadata()
  if (!width || !height) return imageBuffer

  // Logo size: 15% of the shorter dimension
  const logoTargetSize = Math.round(Math.min(width, height) * 0.15)
  const padding = Math.round(logoTargetSize * 0.3)

  // Resize logo and apply semi-transparency (85% opacity)
  const resizedLogo = await sharp(logoBuffer)
    .resize(logoTargetSize, logoTargetSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .composite([{
      input: Buffer.from(
        `<svg width="${logoTargetSize}" height="${logoTargetSize}">
          <rect width="100%" height="100%" fill="white" opacity="0.85"/>
        </svg>`
      ),
      blend: 'dest-in' as const,
    }])
    .toBuffer()

  // Place in bottom-right corner with padding
  return sharp(imageBuffer)
    .composite([{
      input: resizedLogo,
      left: width - logoTargetSize - padding,
      top: height - logoTargetSize - padding,
    }])
    .png()
    .toBuffer()
}

async function generateImage(supabase: SupabaseClient, input: ToolInput) {
  const { prompt, purpose = 'general', aspect_ratio = '1:1', include_logo } = input as {
    prompt: string
    purpose?: string
    aspect_ratio?: string
    include_logo?: boolean
  }

  // Default: true for social_post, false otherwise
  const shouldOverlayLogo = include_logo ?? (purpose === 'social_post')

  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
    return { error: 'Image generation is not configured. Set GEMINI_API_KEY in .env.local' }
  }

  try {
    const enhancedPrompt = IMAGE_BRAND_PREFIX + prompt + IMAGE_BRAND_SUFFIX

    const result = await generateGeminiImage(enhancedPrompt, {
      aspectRatio: aspect_ratio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
    })

    // Optionally overlay logo
    let imageBuffer: Buffer = Buffer.from(result.imageBase64, 'base64')
    if (shouldOverlayLogo) {
      try {
        imageBuffer = await overlayLogo(imageBuffer) as Buffer
      } catch {
        // Logo overlay failed — continue with the original image
      }
    }

    // Try to upload to Supabase Storage
    const ext = shouldOverlayLogo ? 'png' : (result.mimeType.includes('png') ? 'png' : 'jpg')
    const contentType = shouldOverlayLogo ? 'image/png' : result.mimeType
    let imageUrl = `data:${contentType};base64,${imageBuffer.toString('base64')}`
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const filename = `ai-images/${user.id}/${Date.now()}-${purpose}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('ai-generated-images')
        .upload(filename, imageBuffer, { contentType, upsert: false })

      if (!uploadError) {
        const { data: publicUrl } = supabase.storage
          .from('ai-generated-images')
          .getPublicUrl(filename)
        imageUrl = publicUrl.publicUrl

        // Track in DB (non-critical)
        try {
          await supabase.from('ai_generated_images').insert({
            user_id: user.id,
            prompt,
            purpose,
            storage_path: filename,
            public_url: imageUrl,
          })
        } catch {
          // Non-critical
        }
      }
    }

    const artifactHtml = `<div style="text-align:center;padding:16px">
      <img src="${imageUrl}" alt="${prompt}" style="max-width:100%;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)" />
      <p style="margin-top:12px;font-size:13px;color:#6b7280">${purpose}${shouldOverlayLogo ? ' (with logo)' : ''} — ${prompt.slice(0, 100)}</p>
    </div>`

    return {
      success: true,
      image_url: imageUrl,
      purpose,
      prompt,
      include_logo: shouldOverlayLogo,
      artifact_html: artifactHtml,
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Image generation failed' }
  }
}

// ============================================
// WEEKLY TASK PLANNING TOOLS
// ============================================

async function getWeeklyTaskPlan(supabase: SupabaseClient, input: ToolInput) {
  const { week_start_date } = input as { week_start_date?: string }

  // Default to current week's Monday
  const weekStart = week_start_date || format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('weekly_task_plans')
    .select(`
      *,
      planned_tasks(
        id, title, description, day_of_week, shift_type, priority,
        estimated_minutes, status, sort_order, assigned_role,
        assigned_employee:employees(id, profile:profiles(id, full_name, role)),
        section:floor_sections(id, name)
      )
    `)
    .eq('week_start_date', weekStart)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { message: `No task plan found for week of ${weekStart}`, week: weekStart }
    }
    return { error: error.message }
  }

  const tasks = (data.planned_tasks || []) as Array<Record<string, unknown>>
  const byDay: Record<string, Array<Record<string, unknown>>> = {}
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  for (const t of tasks) {
    const dayName = dayNames[t.day_of_week as number] || `Day ${t.day_of_week}`
    if (!byDay[dayName]) byDay[dayName] = []
    byDay[dayName].push({
      title: t.title,
      priority: t.priority,
      shift: t.shift_type || 'any',
      assigned: (t.assigned_employee as Record<string, unknown>)?.profile
        ? ((t.assigned_employee as Record<string, unknown>).profile as Record<string, string>).full_name
        : t.assigned_role || 'unassigned',
      zone: (t.section as Record<string, string>)?.name || null,
      minutes: t.estimated_minutes,
      status: t.status,
    })
  }

  return {
    plan_id: data.id,
    week: weekStart,
    status: data.status,
    total_tasks: tasks.length,
    tasks_by_day: byDay,
    summary: {
      total_minutes: tasks.reduce((s, t) => s + ((t.estimated_minutes as number) || 0), 0),
      by_priority: {
        urgent: tasks.filter(t => t.priority === 'urgent').length,
        high: tasks.filter(t => t.priority === 'high').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length,
      },
    },
  }
}

async function getZoneAssignments(supabase: SupabaseClient, input: ToolInput) {
  const { date, shift_type } = input as { date?: string; shift_type?: string }

  const targetDate = date || format(new Date(), 'yyyy-MM-dd')

  let query = supabase
    .from('zone_assignments')
    .select(`
      id, assignment_date, shift_type, notes,
      section:floor_sections(id, name),
      employee:employees(id, profile:profiles(id, full_name, role))
    `)
    .eq('assignment_date', targetDate)

  if (shift_type) query = query.eq('shift_type', shift_type)

  const { data, error } = await query

  if (error) return { error: error.message }

  const assignments = (data || []).map((a: Record<string, unknown>) => ({
    section: (a.section as Record<string, string>)?.name || 'Unknown',
    employee: ((a.employee as Record<string, unknown>)?.profile as Record<string, string>)?.full_name || 'Unknown',
    shift: a.shift_type,
    notes: a.notes,
  }))

  return {
    date: targetDate,
    shift_type: shift_type || 'all',
    total_assignments: assignments.length,
    assignments,
  }
}

async function getFloorSections(supabase: SupabaseClient) {
  const { data: sections, error: secError } = await supabase
    .from('floor_sections')
    .select('id, name, description, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order')

  if (secError) return { error: secError.message }

  const { data: tables } = await supabase
    .from('tables')
    .select('id, table_number, capacity, section_id, shape, is_active')
    .eq('is_active', true)

  const sectionData = (sections || []).map((s: Record<string, unknown>) => {
    const sectionTables = (tables || []).filter((t: Record<string, unknown>) => t.section_id === s.id)
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      tables_count: sectionTables.length,
      total_capacity: sectionTables.reduce((sum: number, t: Record<string, unknown>) => sum + ((t.capacity as number) || 0), 0),
    }
  })

  return {
    total_sections: sectionData.length,
    total_tables: (tables || []).length,
    sections: sectionData,
  }
}
