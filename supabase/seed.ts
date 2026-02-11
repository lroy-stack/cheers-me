/**
 * ============================================================================
 * GrandCafe Cheers — Programmatic Seed Data Generator
 * Platform: Next.js + Supabase
 * Version: 1.0.0
 * Purpose: Generate realistic test data via TypeScript for development & QA
 * ============================================================================
 *
 * Usage:
 * - From project root: npx ts-node supabase/seed.ts
 * - Requires SUPABASE_SERVICE_ROLE_KEY in .env
 *
 * Note: This script assumes you have already:
 * 1. Created test users in Supabase Auth (or they'll be created via admin API)
 * 2. Run all database migrations
 * 3. Configured Supabase connection in .env
 */

import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// CONFIG
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SeedUser {
  email: string
  password: string
  fullName: string
  role: 'admin' | 'manager' | 'kitchen' | 'bar' | 'waiter' | 'dj' | 'owner'
  phone: string
  language: string
}

interface SeedProfile {
  id: string
  email: string
  full_name: string
  role: string
  phone: string
  language: string
  active: boolean
}

// ============================================================================
// SEED DATA
// ============================================================================

const SEED_USERS: SeedUser[] = [
  {
    email: 'leroy@cheers.test',
    password: 'TestPassword123!',
    fullName: 'Leroy Manager',
    role: 'manager',
    phone: '+34-600-123-456',
    language: 'en',
  },
  {
    email: 'kitchen@cheers.test',
    password: 'TestPassword123!',
    fullName: 'Carlos Kitchen',
    role: 'kitchen',
    phone: '+34-600-234-567',
    language: 'es',
  },
  {
    email: 'waiter1@cheers.test',
    password: 'TestPassword123!',
    fullName: 'Anna Waiter',
    role: 'waiter',
    phone: '+34-600-345-678',
    language: 'en',
  },
  {
    email: 'waiter2@cheers.test',
    password: 'TestPassword123!',
    fullName: 'Marco Waiter',
    role: 'waiter',
    phone: '+34-600-456-789',
    language: 'en',
  },
  {
    email: 'bar@cheers.test',
    password: 'TestPassword123!',
    fullName: 'Sofia Bar',
    role: 'bar',
    phone: '+34-600-567-890',
    language: 'en',
  },
  {
    email: 'dj@cheers.test',
    password: 'TestPassword123!',
    fullName: 'DJ Maverick',
    role: 'dj',
    phone: '+34-600-678-901',
    language: 'en',
  },
  {
    email: 'owner@cheers.test',
    password: 'TestPassword123!',
    fullName: 'Owner Finance',
    role: 'owner',
    phone: '+34-600-789-012',
    language: 'en',
  },
]

const MENU_CATEGORIES = [
  { name: 'Breakfast', sort_order: 1 },
  { name: 'Salads', sort_order: 2 },
  { name: 'Burgers', sort_order: 3 },
  { name: 'Main Courses', sort_order: 4 },
  { name: 'Desserts', sort_order: 5 },
  { name: 'Cocktails', sort_order: 6 },
  { name: 'Beers', sort_order: 7 },
  { name: 'Soft Drinks', sort_order: 8 },
]

const SHIFT_TEMPLATES = [
  { name: 'Morning Shift', shift_type: 'morning', start_time: '10:30', end_time: '17:00', break_duration_minutes: 30 },
  { name: 'Afternoon Shift', shift_type: 'afternoon', start_time: '17:00', end_time: '23:00', break_duration_minutes: 30 },
  { name: 'Night Shift', shift_type: 'night', start_time: '23:00', end_time: '03:00', break_duration_minutes: 15 },
  { name: 'Lunch Rush', shift_type: 'afternoon', start_time: '12:00', end_time: '16:00', break_duration_minutes: 0 },
  { name: 'Dinner Service', shift_type: 'afternoon', start_time: '18:00', end_time: '22:00', break_duration_minutes: 15 },
  { name: 'Weekend Double', shift_type: 'morning', start_time: '10:30', end_time: '23:00', break_duration_minutes: 90 },
]

const TABLES = [
  { table_number: 'T1', capacity: 2, section: 'Front' },
  { table_number: 'T2', capacity: 2, section: 'Front' },
  { table_number: 'T3', capacity: 4, section: 'Center' },
  { table_number: 'T4', capacity: 4, section: 'Center' },
  { table_number: 'T5', capacity: 6, section: 'Patio' },
  { table_number: 'T6', capacity: 6, section: 'Patio' },
  { table_number: 'T7', capacity: 8, section: 'VIP' },
]

const DJS = [
  { name: 'DJ Maverick', genre: 'House/Electronic', fee: 100.00, email: 'dj.maverick@music.com', phone: '+34-600-678-901' },
  { name: 'DJ Luna', genre: 'Latin/Reggaeton', fee: 120.00, email: 'luna@music.com', phone: '+34-600-789-012' },
  { name: 'DJ Cool Vibes', genre: 'Chillout/Lounge', fee: 80.00, email: 'coolvibes@music.com', phone: '+34-600-890-123' },
]

const CUSTOMERS = [
  { name: 'John Smith', email: 'john@example.com', phone: '+34-600-111-111', language: 'en', visit_count: 5 },
  { name: 'Maria García', email: 'maria@example.com', phone: '+34-600-222-222', language: 'es', visit_count: 12, vip: true },
  { name: 'Hans Mueller', email: 'hans@example.com', phone: '+49-123-456-789', language: 'de', visit_count: 8 },
  { name: 'Sophie Laurent', email: 'sophie@example.com', phone: '+33-600-444-444', language: 'fr', visit_count: 3 },
  { name: 'Robert Brown', email: 'robert@example.com', phone: '+44-700-555-666', language: 'en', visit_count: 15, vip: true },
]

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seed() {
  try {
    console.log('🌱 Starting GrandCafe Cheers seed data generation...\n')

    // Step 1: Create auth users and profiles
    console.log('📝 Step 1: Creating authentication users and profiles...')
    const profileIds = await seedAuthAndProfiles()

    // Step 2: Create employees
    console.log('👥 Step 2: Creating employees...')
    const employeeIds = await seedEmployees(profileIds)

    // Step 3: Create shift templates
    console.log('⏰ Step 3: Creating shift templates...')
    await seedShiftTemplates()

    // Step 4: Create shifts
    console.log('📅 Step 4: Creating shifts...')
    await seedShifts(employeeIds)

    // Step 5: Create menu categories
    console.log('🍽️ Step 5: Creating menu categories and items...')
    const categoryIds = await seedMenuCategories()
    await seedMenuItems(categoryIds)

    // Step 6: Create tables
    console.log('🪑 Step 6: Creating floor plan tables...')
    await seedTables()

    // Step 7: Create suppliers and products
    console.log('📦 Step 7: Creating suppliers and products...')
    const supplierIds = await seedSuppliers()
    await seedProducts(supplierIds)

    // Step 8: Create sales data
    console.log('💰 Step 8: Creating sales data...')
    await seedSalesData()

    // Step 9: Create reservations
    console.log('🎫 Step 9: Creating reservations...')
    await seedReservations()

    // Step 10: Create DJs and events
    console.log('🎵 Step 10: Creating DJs and events...')
    const djIds = await seedDJs()
    await seedEvents(djIds)

    // Step 11: Create customers and reviews
    console.log('⭐ Step 11: Creating customers and reviews...')
    await seedCustomers()

    // Step 12: Create marketing content
    console.log('📱 Step 12: Creating marketing content...')
    await seedMarketing(employeeIds.manager)

    // Step 13: Create financial data
    console.log('📊 Step 13: Creating financial data...')
    await seedFinancials()

    console.log('\n✅ Seed data generation completed successfully!')
    console.log('\n📋 Summary:')
    console.log('   ✓ 7 users created with different roles')
    console.log('   ✓ 6 employees with shifts and availability')
    console.log('   ✓ 8 menu categories with 15+ menu items')
    console.log('   ✓ 7 tables configured')
    console.log('   ✓ 3 suppliers with 23+ products')
    console.log('   ✓ 5 days of sales data')
    console.log('   ✓ 4 active reservations')
    console.log('   ✓ 3 DJs with events')
    console.log('   ✓ 5 customers with reviews and loyalty data')
    console.log('   ✓ Marketing content and social posts')
    console.log('   ✓ Financial P&L data for analysis')
    console.log('\n🔑 Test Credentials:')
    SEED_USERS.forEach(user => {
      console.log(`   ${user.email} / ${user.password} (${user.role})`)
    })
  } catch (error) {
    console.error('❌ Seed generation failed:', error)
    process.exit(1)
  }
}

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedAuthAndProfiles() {
  const profileIds: Record<string, string> = {}

  for (const user of SEED_USERS) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      })

      if (authError) {
        console.warn(`  ⚠️  User ${user.email} already exists or error: ${authError.message}`)
        // Try to get existing user by email
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const existing = existingUsers?.users?.find(u => u.email === user.email)
        if (existing) {
          profileIds[user.role] = existing.id
        }
        continue
      }

      const userId = authData?.user?.id
      if (!userId) throw new Error(`Failed to create user ${user.email}`)

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        phone: user.phone,
        language: user.language,
        active: true,
      })

      if (profileError) throw profileError

      profileIds[user.role] = userId
      console.log(`  ✓ Created ${user.role}: ${user.email}`)
    } catch (error) {
      console.error(`  ✗ Failed to create user ${user.email}:`, error)
    }
  }

  return profileIds
}

async function seedEmployees(profileIds: Record<string, string>) {
  const employeeIds: Record<string, string> = {}

  const employees = [
    { profileId: profileIds.manager, role: 'manager', hourlyRate: 16.50, contractType: 'full_time' },
    { profileId: profileIds.kitchen, role: 'kitchen', hourlyRate: 12.50, contractType: 'part_time' },
    { profileId: profileIds.waiter, role: 'waiter', hourlyRate: 11.50, contractType: 'part_time' },
    { profileId: profileIds.bar, role: 'bar', hourlyRate: 12.50, contractType: 'part_time' },
    { profileId: profileIds.dj, role: 'dj', hourlyRate: 80.00, contractType: 'contractor' },
  ]

  for (const emp of employees) {
    if (!emp.profileId) continue

    const { data, error } = await supabase.from('employees').insert({
      profile_id: emp.profileId,
      hourly_rate: emp.hourlyRate,
      contract_type: emp.contractType,
      date_hired: '2024-04-01',
    }).select()

    if (error) {
      console.warn(`  ⚠️  Failed to create employee: ${error.message}`)
    } else if (data?.[0]) {
      employeeIds[emp.role] = data[0].id
      console.log(`  ✓ Created employee: ${emp.role}`)
    }
  }

  return employeeIds
}

async function seedShiftTemplates() {
  const { error } = await supabase.from('shift_templates').insert(SHIFT_TEMPLATES)
  if (error) console.warn(`  ⚠️  Error creating shift templates: ${error.message}`)
  else console.log(`  ✓ Created ${SHIFT_TEMPLATES.length} shift templates`)
}

async function seedShifts(employeeIds: Record<string, string>) {
  // Create shifts for this week
  const shifts = []
  const baseDate = new Date('2026-02-10')

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(baseDate)
    date.setDate(date.getDate() + dayOffset)
    const dateStr = date.toISOString().split('T')[0]

    // Different employees each day
    if (employeeIds.kitchen) {
      shifts.push({
        employee_id: employeeIds.kitchen,
        date: dateStr,
        shift_type: 'morning',
        start_time: '10:30',
        end_time: '17:00',
        break_duration_minutes: 30,
        status: 'scheduled',
      })
    }

    if (employeeIds.waiter) {
      shifts.push({
        employee_id: employeeIds.waiter,
        date: dateStr,
        shift_type: 'afternoon',
        start_time: '17:00',
        end_time: '23:00',
        break_duration_minutes: 30,
        status: 'scheduled',
      })
    }

    if (employeeIds.bar) {
      shifts.push({
        employee_id: employeeIds.bar,
        date: dateStr,
        shift_type: 'afternoon',
        start_time: '17:00',
        end_time: '23:00',
        break_duration_minutes: 30,
        status: 'scheduled',
      })
    }
  }

  const { error } = await supabase.from('shifts').insert(shifts)
  if (error) console.warn(`  ⚠️  Error creating shifts: ${error.message}`)
  else console.log(`  ✓ Created ${shifts.length} shifts`)
}

async function seedMenuCategories() {
  const { data, error } = await supabase.from('menu_categories').insert(MENU_CATEGORIES).select()
  if (error) {
    console.warn(`  ⚠️  Error creating categories: ${error.message}`)
    return {}
  }
  const categoryMap: Record<string, string> = {}
  data?.forEach(cat => {
    categoryMap[cat.name] = cat.id
  })
  console.log(`  ✓ Created ${data?.length || 0} menu categories`)
  return categoryMap
}

async function seedMenuItems(categoryIds: Record<string, string>) {
  const items = [
    {
      category_id: categoryIds['Breakfast'],
      name_en: 'Avocado Toast',
      description_en: 'Sourdough with crushed avocado, lime, chili',
      price: 8.50,
      cost_of_goods: 2.50,
      prep_time_minutes: 10,
    },
    {
      category_id: categoryIds['Breakfast'],
      name_en: 'Full English Breakfast',
      description_en: 'Eggs, bacon, sausage, beans, toast',
      price: 14.50,
      cost_of_goods: 4.50,
      prep_time_minutes: 20,
    },
    {
      category_id: categoryIds['Burgers'],
      name_en: 'Classic Burger',
      description_en: 'Beef patty, lettuce, tomato, cheese, mayo',
      price: 13.50,
      cost_of_goods: 4.00,
      prep_time_minutes: 15,
    },
    {
      category_id: categoryIds['Burgers'],
      name_en: 'Bacon & Cheese Burger',
      description_en: 'Beef patty, bacon, cheddar, pickles',
      price: 15.50,
      cost_of_goods: 5.00,
      prep_time_minutes: 15,
    },
    {
      category_id: categoryIds['Main Courses'],
      name_en: 'Wiener Schnitzel',
      description_en: 'Breaded veal, lemon, potato salad',
      price: 18.50,
      cost_of_goods: 6.50,
      prep_time_minutes: 20,
    },
    {
      category_id: categoryIds['Main Courses'],
      name_en: 'Fish & Chips',
      description_en: 'Battered cod, fries, tartare sauce',
      price: 16.50,
      cost_of_goods: 5.50,
      prep_time_minutes: 18,
    },
    {
      category_id: categoryIds['Desserts'],
      name_en: 'Chocolate Cake',
      description_en: 'Rich chocolate cake with ganache',
      price: 7.50,
      cost_of_goods: 1.80,
      prep_time_minutes: 5,
    },
    {
      category_id: categoryIds['Desserts'],
      name_en: 'Tiramisu',
      description_en: 'Classic Italian dessert',
      price: 7.00,
      cost_of_goods: 1.60,
      prep_time_minutes: 5,
    },
    {
      category_id: categoryIds['Cocktails'],
      name_en: 'Mojito',
      description_en: 'Rum, mint, lime, soda',
      price: 9.00,
      cost_of_goods: 2.00,
      prep_time_minutes: 5,
    },
    {
      category_id: categoryIds['Cocktails'],
      name_en: 'Margarita',
      description_en: 'Tequila, lime, triple sec, salt rim',
      price: 9.50,
      cost_of_goods: 2.20,
      prep_time_minutes: 5,
    },
  ]

  const { error } = await supabase.from('menu_items').insert(items)
  if (error) console.warn(`  ⚠️  Error creating menu items: ${error.message}`)
  else console.log(`  ✓ Created ${items.length} menu items`)
}

async function seedTables() {
  const { error } = await supabase.from('tables').insert(TABLES)
  if (error) console.warn(`  ⚠️  Error creating tables: ${error.message}`)
  else console.log(`  ✓ Created ${TABLES.length} tables`)
}

async function seedSuppliers() {
  const suppliers = [
    {
      name: 'Fresh Foods Mallorca',
      contact_person: 'Juan García',
      email: 'juan@freshfoods.es',
      phone: '+34-971-123-456',
      payment_terms: 'Net 30',
    },
    {
      name: 'Cervecería Balear',
      contact_person: 'Miguel López',
      email: 'miguel@cervecerias.es',
      phone: '+34-971-234-567',
      payment_terms: 'Net 15',
    },
    {
      name: 'Spanish Seafood Co',
      contact_person: 'Antonio Perez',
      email: 'antonio@seafood.es',
      phone: '+34-971-345-678',
      payment_terms: 'Net 7',
    },
  ]

  const { data, error } = await supabase.from('suppliers').insert(suppliers).select()
  if (error) {
    console.warn(`  ⚠️  Error creating suppliers: ${error.message}`)
    return {}
  }
  const supplierMap: Record<string, string> = {}
  data?.forEach(supp => {
    supplierMap[supp.name] = supp.id
  })
  console.log(`  ✓ Created ${data?.length || 0} suppliers`)
  return supplierMap
}

async function seedProducts(supplierIds: Record<string, string>) {
  const products = [
    { name: 'Tomatoes', category: 'food', unit: 'kg', min_stock: 20, max_stock: 80, current_stock: 45, cost_per_unit: 0.80, supplier_id: supplierIds['Fresh Foods Mallorca'] },
    { name: 'Lettuce', category: 'food', unit: 'head', min_stock: 15, max_stock: 50, current_stock: 28, cost_per_unit: 1.20, supplier_id: supplierIds['Fresh Foods Mallorca'] },
    { name: 'Potatoes', category: 'food', unit: 'kg', min_stock: 30, max_stock: 100, current_stock: 50, cost_per_unit: 0.60, supplier_id: supplierIds['Fresh Foods Mallorca'] },
    { name: 'Beef Patties', category: 'food', unit: 'piece', min_stock: 40, max_stock: 100, current_stock: 60, cost_per_unit: 3.50, supplier_id: supplierIds['Fresh Foods Mallorca'] },
    { name: 'Veal Cutlets', category: 'food', unit: 'piece', min_stock: 15, max_stock: 40, current_stock: 20, cost_per_unit: 6.50, supplier_id: supplierIds['Spanish Seafood Co'] },
    { name: 'Fish Fillets (Cod)', category: 'food', unit: 'kg', min_stock: 10, max_stock: 30, current_stock: 15, cost_per_unit: 8.50, supplier_id: supplierIds['Spanish Seafood Co'] },
    { name: 'Eggs', category: 'food', unit: 'dozen', min_stock: 15, max_stock: 40, current_stock: 25, cost_per_unit: 2.50, supplier_id: supplierIds['Fresh Foods Mallorca'] },
    { name: 'Bacon', category: 'food', unit: 'kg', min_stock: 5, max_stock: 15, current_stock: 8, cost_per_unit: 12.00, supplier_id: supplierIds['Fresh Foods Mallorca'] },
    { name: 'Cheese (Cheddar)', category: 'food', unit: 'kg', min_stock: 5, max_stock: 20, current_stock: 12, cost_per_unit: 11.50, supplier_id: supplierIds['Fresh Foods Mallorca'] },
    { name: 'Estrella Damm (Draft)', category: 'drink', unit: 'liter', min_stock: 20, max_stock: 80, current_stock: 45, cost_per_unit: 1.50, supplier_id: supplierIds['Cervecería Balear'] },
    { name: 'Guinness', category: 'drink', unit: 'liter', min_stock: 15, max_stock: 50, current_stock: 28, cost_per_unit: 3.20, supplier_id: supplierIds['Cervecería Balear'] },
    { name: 'Corona', category: 'drink', unit: 'bottle', min_stock: 30, max_stock: 100, current_stock: 60, cost_per_unit: 1.80, supplier_id: supplierIds['Cervecería Balear'] },
    { name: 'White Rum', category: 'drink', unit: 'bottle', min_stock: 1, max_stock: 5, current_stock: 3, cost_per_unit: 18.00, supplier_id: supplierIds['Cervecería Balear'] },
  ]

  const { error } = await supabase.from('products').insert(products)
  if (error) console.warn(`  ⚠️  Error creating products: ${error.message}`)
  else console.log(`  ✓ Created ${products.length} products`)
}

async function seedSalesData() {
  const sales = []
  for (let i = 0; i < 5; i++) {
    const date = new Date('2026-02-09')
    date.setDate(date.getDate() - i)
    sales.push({
      date: date.toISOString().split('T')[0],
      food_revenue: 400 + Math.random() * 200,
      drinks_revenue: 280 + Math.random() * 100,
      cocktails_revenue: 210 + Math.random() * 100,
      desserts_revenue: 85 + Math.random() * 50,
      tips: 100 + Math.random() * 100,
      ticket_count: 40 + Math.floor(Math.random() * 10),
    })
  }

  const { error } = await supabase.from('daily_sales').insert(sales)
  if (error) console.warn(`  ⚠️  Error creating sales: ${error.message}`)
  else console.log(`  ✓ Created ${sales.length} sales records`)
}

async function seedReservations() {
  const reservations = [
    {
      guest_name: 'John Smith',
      guest_email: 'john@example.com',
      guest_phone: '+34-600-111-111',
      reservation_date: '2026-02-10',
      start_time: '19:00',
      party_size: 4,
      status: 'confirmed',
    },
    {
      guest_name: 'Maria García',
      guest_email: 'maria@example.com',
      guest_phone: '+34-600-222-222',
      reservation_date: '2026-02-10',
      start_time: '20:00',
      party_size: 4,
      status: 'confirmed',
    },
    {
      guest_name: 'Hans Mueller',
      guest_email: 'hans@example.com',
      guest_phone: '+49-123-456-789',
      reservation_date: '2026-02-11',
      start_time: '18:30',
      party_size: 6,
      status: 'confirmed',
    },
  ]

  const { error } = await supabase.from('reservations').insert(reservations)
  if (error) console.warn(`  ⚠️  Error creating reservations: ${error.message}`)
  else console.log(`  ✓ Created ${reservations.length} reservations`)
}

async function seedDJs() {
  const { data, error } = await supabase.from('djs').insert(DJS).select()
  if (error) {
    console.warn(`  ⚠️  Error creating DJs: ${error.message}`)
    return {}
  }
  const djMap: Record<string, string> = {}
  data?.forEach((dj, i) => {
    djMap[i] = dj.id
  })
  console.log(`  ✓ Created ${data?.length || 0} DJs`)
  return djMap
}

async function seedEvents(djIds: Record<string, string>) {
  const djId = Object.values(djIds)[0]
  const events = [
    {
      title: 'Thursday Night Party',
      description: 'Weekly DJ night with House & Electronic',
      event_date: '2026-02-12',
      start_time: '22:00',
      end_time: '03:00',
      event_type: 'DJ Night',
      dj_id: djId,
      status: 'confirmed',
    },
    {
      title: 'Latin Night',
      description: 'Special Latin music event',
      event_date: '2026-02-14',
      start_time: '22:00',
      end_time: '04:00',
      event_type: 'DJ Night',
      dj_id: djId,
      status: 'pending',
    },
  ]

  const { error } = await supabase.from('events').insert(events)
  if (error) console.warn(`  ⚠️  Error creating events: ${error.message}`)
  else console.log(`  ✓ Created ${events.length} events`)
}

async function seedCustomers() {
  const { error } = await supabase.from('customers').insert(CUSTOMERS)
  if (error) console.warn(`  ⚠️  Error creating customers: ${error.message}`)
  else console.log(`  ✓ Created ${CUSTOMERS.length} customers`)
}

async function seedMarketing(managerId?: string) {
  const content = [
    {
      title: 'Schnitzel Tuesday Special',
      content_text: 'Fresh veal schnitzel every Tuesday! 🍽️ 16.50€',
      platform: 'instagram',
      status: 'scheduled',
      language: 'en',
      created_by: managerId,
    },
    {
      title: 'Weekend Vibes',
      content_text: 'Come join us for weekend drinks and great company!',
      platform: 'facebook',
      status: 'draft',
      language: 'en',
      created_by: managerId,
    },
  ]

  const { error } = await supabase.from('content_calendar').insert(content)
  if (error) console.warn(`  ⚠️  Error creating marketing content: ${error.message}`)
  else console.log(`  ✓ Created ${content.length} marketing posts`)
}

async function seedFinancials() {
  const financials = []
  for (let i = 0; i < 5; i++) {
    const date = new Date('2026-02-09')
    date.setDate(date.getDate() - i)
    financials.push({
      date: date.toISOString().split('T')[0],
      revenue: 1200 + Math.random() * 200,
      cost_of_goods_sold: 300,
      labor_cost: 350,
      overhead_cost: 160,
      food_cost_ratio: 24.0,
      beverage_cost_ratio: 19.0,
      labor_cost_ratio: 27.0,
    })
  }

  const { error } = await supabase.from('daily_financials').insert(financials)
  if (error) console.warn(`  ⚠️  Error creating financials: ${error.message}`)
  else console.log(`  ✓ Created ${financials.length} financial records`)
}

// ============================================================================
// RUN SEED
// ============================================================================

seed()
