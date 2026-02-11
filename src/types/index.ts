// ============================================================================
// USER & AUTH TYPES
// ============================================================================

export type UserRole =
  | 'admin'
  | 'manager'
  | 'kitchen'
  | 'bar'
  | 'waiter'
  | 'dj'
  | 'owner'

export type Language = 'en' | 'nl' | 'es' | 'de'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  language: Language
  phone: string | null
  emergency_contact: string | null
  emergency_phone: string | null
  created_at: string
  updated_at: string
  active: boolean
}

export interface Employee {
  id: string
  profile_id: string
  hourly_rate: number
  contract_type: 'full_time' | 'part_time' | 'casual' | 'contractor'
  date_hired: string | null
  date_terminated: string | null
  weekly_hours_target: number | null
  gross_salary: number | null
  contract_end_date: string | null
  employment_status: 'active' | 'terminated' | 'on_leave' | 'suspended'
  social_security_number: string | null
  convenio_colectivo: string | null
  categoria_profesional: string | null
  tipo_jornada: 'completa' | 'parcial' | 'flexible'
  periodo_prueba_end: string | null
  irpf_retention: number | null
  job_title: string | null
  kiosk_pin?: string | null
  created_at: string
  updated_at: string
}

// Employee with joined profile data (from API)
export interface EmployeeWithProfile extends Employee {
  profile: Profile
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiError {
  error: string
  details?: unknown
}

export interface ApiSuccess<T = unknown> {
  data?: T
  message?: string
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface SignInRequest {
  email: string
  password: string
}

export interface SignUpRequest {
  email: string
  password: string
  full_name: string
  role?: UserRole
  phone?: string
  language?: Language
}

export interface SignInResponse {
  user: {
    id: string
    email: string
  }
  session: {
    access_token: string
    refresh_token: string
  }
  profile: Profile
}

export interface UpdateProfileRequest {
  full_name?: string
  phone?: string | null
  language?: Language
  emergency_contact?: string | null
  emergency_phone?: string | null
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export function isApiError(response: ApiResponse): response is ApiError {
  return 'error' in response
}

// ============================================================================
// SHIFT & SCHEDULING TYPES
// ============================================================================

export type ShiftType = 'morning' | 'afternoon' | 'night' | 'split'
export type ShiftStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface Shift {
  id: string
  employee_id: string
  date: string // YYYY-MM-DD format
  shift_type: ShiftType
  start_time: string // HH:MM format
  end_time: string // HH:MM format
  second_start_time: string | null
  second_end_time: string | null
  break_duration_minutes: number
  status: ShiftStatus
  notes: string | null
  created_at: string
  updated_at: string
}

// Shift with joined employee data (from API)
export interface ShiftWithEmployee extends Shift {
  employee: {
    id: string
    profile: {
      id: string
      full_name: string | null
      role: UserRole
    }
  }
}

export interface ShiftTemplate {
  id: string
  name: string
  shift_type: ShiftType
  start_time: string // HH:MM format
  end_time: string // HH:MM format
  break_duration_minutes: number
  created_at: string
  updated_at: string
}

export interface Availability {
  id: string
  employee_id: string
  date: string // YYYY-MM-DD format
  available: boolean
  reason: string | null
  created_at: string
  updated_at: string
}

export interface CreateShiftRequest {
  employee_id: string
  date: string
  shift_type: ShiftType
  start_time: string
  end_time: string
  break_duration_minutes?: number
  notes?: string
}

export interface UpdateShiftRequest {
  employee_id?: string
  date?: string
  shift_type?: ShiftType
  start_time?: string
  end_time?: string
  break_duration_minutes?: number
  status?: ShiftStatus
  notes?: string
}

// ============================================================================
// CLOCK IN/OUT TYPES
// ============================================================================

export interface ClockInOut {
  id: string
  employee_id: string
  shift_id: string | null
  clock_in_time: string
  clock_out_time: string | null
  created_at: string
  updated_at: string
}

// Clock record with joined employee and shift data (from API)
export interface ClockInOutWithDetails extends ClockInOut {
  employee: {
    id: string
    profile: {
      id: string
      full_name: string | null
      role: UserRole
    }
  }
  shift: {
    id: string
    date: string
    shift_type: ShiftType
    start_time: string
    end_time: string
  } | null
  breaks?: ClockBreak[]
}

export interface ClockBreak {
  id: string
  clock_record_id: string
  start_time: string
  end_time: string | null
  created_at: string
  updated_at: string
}

export interface KioskEmployeeStatus {
  employee_id: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  status: 'not_clocked_in' | 'working' | 'on_break'
  clock_record_id?: string
  clock_in_time?: string
  active_break_id?: string
  break_start_time?: string
  today_shift?: {
    id: string
    shift_type: ShiftType
    start_time: string
    end_time: string
  } | null
}

export interface ClockOutSummary {
  clock_record_id: string
  clock_in_time: string
  clock_out_time: string
  total_minutes: number
  break_minutes: number
  net_minutes: number
  scheduled_shift?: {
    start_time: string
    end_time: string
    shift_type: ShiftType
  } | null
}

export interface ClockInRequest {
  shift_id?: string
}

export interface ClockOutRequest {
  clock_record_id: string
}

// ============================================================================
// STOCK & INVENTORY TYPES
// ============================================================================

export type ProductCategory = 'food' | 'drink' | 'supplies' | 'beer'
export type ServingType = 'draft' | 'bottle' | 'can'
export type MovementType = 'in' | 'out' | 'adjustment' | 'waste'
export type WasteReason = 'expired' | 'damaged' | 'overproduction' | 'spoiled' | 'customer_return' | 'other'
export type KegStatus = 'active' | 'empty' | 'returned'
export type PurchaseOrderStatus = 'pending' | 'ordered' | 'received' | 'cancelled'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  unit: string
  current_stock: number
  min_stock: number | null
  max_stock: number | null
  cost_per_unit: number
  supplier_id: string | null
  serving_type?: ServingType | null
  created_at: string
  updated_at: string
}

// Product with joined supplier data (from API)
export interface ProductWithSupplier extends Product {
  supplier: {
    id: string
    name: string
    contact_person: string | null
    email: string | null
    phone: string | null
  } | null
}

export interface Supplier {
  id: string
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  payment_terms: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface StockMovement {
  id: string
  product_id: string
  movement_type: MovementType
  quantity: number
  reason: string | null
  recorded_by: string
  created_at: string
  updated_at: string
}

// Stock movement with product details (from API)
export interface StockMovementWithProduct extends StockMovement {
  product: {
    id: string
    name: string
    category: ProductCategory
    unit: string
  }
  recorded_by_employee?: {
    id: string
    profile: {
      full_name: string | null
      email: string
    }
  }
  previous_stock?: number
  new_stock?: number
}

export interface BeerKeg {
  id: string
  product_id: string
  keg_size_liters: number
  current_liters: number
  initial_liters: number
  tapped_at: string
  emptied_at: string | null
  status: KegStatus
  notes: string | null
  created_at: string
  updated_at: string
}

// Beer keg with product details (from API)
export interface BeerKegWithProduct extends BeerKeg {
  product: {
    id: string
    name: string
    category: ProductCategory
  }
  percent_remaining: number
  liters_consumed: number
}

export interface StockAlert {
  id: string
  product_id: string
  alert_type: string
  message: string
  resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string
}

// Stock alert with product details (from API)
export interface StockAlertWithProduct extends StockAlert {
  product: {
    id: string
    name: string
    category: ProductCategory
    current_stock: number
    min_stock: number | null
    unit: string
  }
}

export interface WasteLog {
  id: string
  product_id: string
  quantity: number
  reason: WasteReason
  notes: string | null
  recorded_by: string
  created_at: string
  updated_at: string
}

// Waste log with product details (from API)
export interface WasteLogWithProduct extends WasteLog {
  product: {
    id: string
    name: string
    category: ProductCategory
    unit: string
    cost_per_unit: number
  } | null
  recorded_by_employee?: {
    id: string
    profile: {
      full_name: string | null
      email: string
    }
  }
  waste_value?: number
}

export interface StockTake {
  id: string
  product_id: string
  physical_count: number
  system_count: number
  variance: number
  date: string
  performed_by: string
  applied: boolean
  applied_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Stock take with product details (from API)
export interface StockTakeWithProduct extends StockTake {
  product: {
    id: string
    name: string
    category: ProductCategory
    unit: string
    current_stock: number
  }
}

export interface PurchaseOrder {
  id: string
  supplier_id: string
  order_date: string
  expected_delivery_date: string | null
  actual_delivery_date: string | null
  status: PurchaseOrderStatus
  total_amount: number
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

// Purchase order with supplier and items (from API)
export interface PurchaseOrderWithDetails extends PurchaseOrder {
  supplier: {
    id: string
    name: string
    contact_person: string | null
    phone: string | null
  }
  items: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  product_id: string
  quantity: number
  unit_price: number
  received_quantity: number
  created_at: string
  updated_at: string
}

// Purchase order item with product details (from API)
export interface PurchaseOrderItemWithProduct extends PurchaseOrderItem {
  product: {
    id: string
    name: string
    unit: string
  }
}

export interface StockDashboard {
  summary: {
    total_stock_value: number
    low_stock_count: number
    out_of_stock_count: number
    unresolved_alerts_count: number
    waste_percentage: number
    pending_orders_count: number
  }
  top_consumed_items: Array<{
    product_id: string
    product_name: string
    category: ProductCategory
    unit: string
    total_consumed: number
  }>
  waste_statistics: {
    total_value: number
    total_incidents: number
    by_reason: Record<WasteReason, number>
    percentage_of_stock: number
  }
  active_kegs: {
    total_active: number
    critical_count: number
    low_count: number
    kegs: BeerKegWithProduct[]
  }
  low_stock_items: ProductWithSupplier[]
  out_of_stock_items: ProductWithSupplier[]
  recent_movements_summary: {
    in: number
    out: number
    waste: number
    adjustment: number
  }
}

// Request types for stock operations
export interface CreateProductRequest {
  name: string
  category: ProductCategory
  unit: string
  current_stock?: number
  min_stock?: number
  max_stock?: number
  cost_per_unit?: number
  supplier_id?: string
}

export interface UpdateProductRequest {
  name?: string
  category?: ProductCategory
  unit?: string
  current_stock?: number
  min_stock?: number
  max_stock?: number
  cost_per_unit?: number
  supplier_id?: string
}

export interface CreateStockMovementRequest {
  product_id: string
  movement_type: MovementType
  quantity: number
  reason?: string
}

export interface CreateWasteLogRequest {
  product_id: string
  quantity: number
  reason: WasteReason
  notes?: string
}

export interface CreateBeerKegRequest {
  product_id: string
  keg_size_liters: number
  initial_liters: number
  notes?: string
}

export interface UpdateBeerKegRequest {
  current_liters?: number
  status?: KegStatus
  notes?: string
}

export interface CreateSupplierRequest {
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  payment_terms?: string
  notes?: string
}

export interface UpdateSupplierRequest {
  name?: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  payment_terms?: string
  notes?: string
}

export interface CreatePurchaseOrderRequest {
  supplier_id: string
  order_date: string
  expected_delivery_date?: string
  status?: PurchaseOrderStatus
  notes?: string
  items: Array<{
    product_id: string
    quantity: number
    unit_price: number
  }>
}

export interface UpdatePurchaseOrderRequest {
  expected_delivery_date?: string
  actual_delivery_date?: string
  status?: PurchaseOrderStatus
  notes?: string
}

export interface CreateStockTakeRequest {
  product_id: string
  physical_count: number
  date: string
  notes?: string
}

// ============================================================================
// SCHEDULE GRID TYPES
// ============================================================================

export type ScheduleCellType = 'M' | 'T' | 'N' | 'D' | 'P' | null
export type SchedulePlanStatus = 'draft' | 'published' | 'archived'

export interface SchedulePlan {
  id: string
  week_start_date: string
  status: SchedulePlanStatus
  created_by: string | null
  published_at: string | null
  published_by: string | null
  notes: string | null
  copied_from_plan_id: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface SchedulePlanWithShifts extends SchedulePlan {
  shifts: ShiftWithEmployee[]
}

export interface ScheduleGridCell {
  date: string
  shift: ShiftWithEmployee | null
  cellType: ScheduleCellType
  isOnLeave: boolean
  leaveType?: LeaveType
  hasViolation: boolean
  violationMessage?: string
}

export interface ScheduleGridRow {
  employee: EmployeeWithProfile
  cells: Record<string, ScheduleGridCell> // key = YYYY-MM-DD
  totalHours: number
  totalCost: number
}

export interface DepartmentGroup {
  role: UserRole
  label: string
  employees: ScheduleGridRow[]
  totalHours: number
  totalCost: number
}

export interface ScheduleViolation {
  employeeId: string
  employeeName: string
  type: 'max_hours' | 'min_rest' | 'days_off' | 'leave_conflict' | 'availability'
  message: string
  severity: 'warning' | 'error'
}

export interface ScheduleValidationResult {
  valid: boolean
  errors: ScheduleViolation[]
  warnings: ScheduleViolation[]
}

// ============================================================================
// LEAVE TYPES
// ============================================================================

export type LeaveType = 'vacation' | 'sick_leave' | 'personal_day' | 'maternity' | 'unpaid'
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface LeaveEntitlement {
  id: string
  employee_id: string
  year: number
  leave_type: LeaveType
  total_days: number
  used_days: number
  created_at: string
  updated_at: string
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  total_days: number
  status: LeaveRequestStatus
  reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
}

export interface LeaveRequestWithEmployee extends LeaveRequest {
  employee: {
    id: string
    profile: {
      id: string
      full_name: string | null
      role: UserRole
    }
  }
}

// ============================================================================
// MONTHLY REGISTRY TYPES
// ============================================================================

export interface MonthlyEmployeeRecord {
  employee_id: string
  name: string
  role: UserRole
  hourly_rate: number
  days: Record<string, { hours: number; shift_type: ScheduleCellType; is_leave?: boolean }>
  total_hours: number
  regular_hours: number
  overtime_hours: number
  total_cost: number
}

export interface MonthlyRegistry {
  period: { year: number; month: number }
  employees: MonthlyEmployeeRecord[]
  role_totals: Record<string, { total_hours: number; total_cost: number; count: number }>
  grand_total: { hours: number; cost: number; overtime: number }
}

// ============================================================================
// SCHEDULE PLAN API TYPES
// ============================================================================

export interface CreateSchedulePlanRequest {
  week_start_date: string
  notes?: string
}

export interface BulkShiftSyncRequest {
  shifts_to_create: Array<{
    employee_id: string
    date: string
    shift_type: ShiftType
    start_time: string
    end_time: string
    second_start_time?: string
    second_end_time?: string
    break_duration_minutes?: number
    is_day_off?: boolean
    notes?: string
  }>
  shifts_to_update: Array<{
    id: string
    shift_type?: ShiftType
    start_time?: string
    end_time?: string
    second_start_time?: string | null
    second_end_time?: string | null
    break_duration_minutes?: number
    is_day_off?: boolean
    notes?: string
  }>
  shifts_to_delete: string[]
}

export interface CreateLeaveRequestInput {
  employee_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  total_days: number
  reason?: string
}

// ============================================================================
// COCKTAIL RECIPE TYPES
// ============================================================================

export type GlassType = 'rocks' | 'highball' | 'coupe' | 'martini' | 'collins' | 'hurricane' | 'wine' | 'champagne_flute' | 'copper_mug' | 'tiki' | 'shot' | 'beer_glass' | 'snifter' | 'irish_coffee'
export type PreparationMethod = 'shaken' | 'stirred' | 'built' | 'blended' | 'layered' | 'muddled' | 'thrown'
export type IceType = 'cubed' | 'crushed' | 'large_cube' | 'sphere' | 'none' | 'frozen_glass'
export type DifficultyLevel = 'easy' | 'medium' | 'advanced'
export type FlavorProfile = 'sweet' | 'sour' | 'bitter' | 'spirit_forward' | 'tropical' | 'refreshing' | 'creamy' | 'spicy' | 'herbal' | 'smoky' | 'fruity' | 'coffee'

export interface CocktailRecipe {
  id: string
  menu_item_id: string
  glass_type: GlassType
  preparation_method: PreparationMethod
  ice_type: IceType
  difficulty_level: DifficultyLevel
  base_spirit: string | null
  garnish: string | null
  flavor_profiles: FlavorProfile[]
  is_signature: boolean
  video_url: string | null
  created_at: string
  updated_at: string
}

export interface CocktailPreparationStep {
  id: string
  recipe_id: string
  step_number: number
  instruction_en: string
  instruction_nl: string | null
  instruction_es: string | null
  instruction_de: string | null
  duration_seconds: number | null
  tip: string | null
}

export interface CocktailRecipeFull extends CocktailRecipe {
  name_en: string
  name_nl: string | null
  name_es: string | null
  name_de: string | null
  description_en: string | null
  description_nl: string | null
  description_es: string | null
  description_de: string | null
  price: number
  photo_url: string | null
  prep_time_minutes: number | null
  category_name_en: string
  total_cost: number
  ingredients: MenuIngredientWithProduct[]
  steps: CocktailPreparationStep[]
}

export interface MenuIngredientWithProduct {
  id: string
  name: string
  quantity: number
  unit: string
  cost_per_unit: number
  product_id: string | null
  is_garnish: boolean
  is_optional: boolean
  sort_order: number
}

// ============================================================================
// POS INTEGRATION TYPES
// ============================================================================

export type POSProvider = 'square' | 'sumup' | 'lightspeed' | 'toast' | 'custom'
export type POSSyncStatus = 'active' | 'paused' | 'error' | 'disconnected'

export interface POSIntegration {
  id: string
  provider: POSProvider
  name: string
  config: Record<string, unknown>
  status: POSSyncStatus
  last_sync_at: string | null
  last_error: string | null
  sync_catalog: boolean
  sync_orders: boolean
  sync_payments: boolean
  sync_inventory: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface POSSyncLog {
  id: string
  integration_id: string
  sync_type: string
  status: string
  records_processed: number
  records_failed: number
  error_details: Record<string, unknown> | null
  started_at: string
  completed_at: string | null
}

export interface POSItemMapping {
  id: string
  integration_id: string
  menu_item_id: string
  external_item_id: string
  external_item_name: string | null
}

// ============================================================================
// STAFF TASK TYPES
// ============================================================================

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface StaffTaskTemplate {
  id: string
  title: string
  description: string | null
  items: Array<{ text: string; sort_order: number }>
  default_priority: TaskPriority
  default_assigned_role: string | null
  frequency: string | null
  estimated_minutes: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface StaffTask {
  id: string
  title: string
  description: string | null
  template_id: string | null
  assigned_to: string | null
  assigned_role: string | null
  assigned_by: string
  due_date: string | null
  due_time: string | null
  priority: TaskPriority
  status: TaskStatus
  completed_at: string | null
  completed_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface StaffTaskItem {
  id: string
  task_id: string
  text: string
  completed: boolean
  completed_by: string | null
  completed_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface StaffTaskWithDetails extends StaffTask {
  items: StaffTaskItem[]
  assigned_employee?: {
    id: string
    profile: {
      id: string
      full_name: string | null
      role: UserRole
    }
  } | null
  assigner?: {
    id: string
    full_name: string | null
  } | null
}

// ============================================================================
// TRAINING COMPLIANCE TYPES
// ============================================================================

export type TrainingAction =
  | 'viewed'
  | 'downloaded'
  | 'test_started'
  | 'test_completed'
  | 'test_passed'
  | 'test_failed'
  | 'section_viewed'
  | 'certificate_downloaded'

export type TrainingAssignmentStatus = 'pending' | 'completed' | 'overdue'

export interface TrainingMaterial {
  id: string
  guide_code: string
  is_mandatory: boolean
  applicable_roles: string[]
  requires_test: boolean
  passing_score: number
  recurrence_months: number | null
  estimated_minutes: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TrainingTestQuestion {
  id: string
  guide_code: string
  language: string
  question: string
  options: Array<{ text: string; correct: boolean }>
  explanation: string | null
  sort_order: number
  created_at: string
}

export interface TrainingRecord {
  id: string
  employee_id: string
  guide_code: string
  action: TrainingAction
  language: string
  score: number | null
  answers: Record<string, number> | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface TrainingAssignment {
  id: string
  guide_code: string
  assigned_to: string | null
  assigned_role: string | null
  assigned_by: string
  due_date: string | null
  status: TrainingAssignmentStatus
  completed_at: string | null
  score: number | null
  created_at: string
  updated_at: string
  employee?: {
    id: string
    profile: {
      id: string
      full_name: string | null
      role: UserRole
    }
  } | null
  assigner?: {
    id: string
    full_name: string | null
  } | null
}

export interface TrainingComplianceStats {
  totalMandatory: number
  completedCount: number
  pendingCount: number
  overdueCount: number
  passRate: number
}

// ============================================================================
// GUIDE CONTENT (deep course content loaded on-demand)
// ============================================================================

export interface GuideContent {
  title: string
  legalBasis: string
  summary: string
  keyPoints: string[]
  sections: GuideSection[]
  checklists: GuideChecklist[]
  bestPractices: string[]
  glossary: Record<string, string>
}

export interface GuideSection {
  heading: string
  content: string
  subsections?: GuideSubsection[]
}

export interface GuideSubsection {
  heading: string
  content: string
}

export interface GuideChecklist {
  title: string
  items: string[]
}

export interface CourseProgress {
  guideCode: string
  totalSections: number
  viewedSections: number
  testPassed: boolean
  testScore: number | null
  lastViewedSection: number
}

export interface EmployeeTrainingStatus {
  employeeId: string
  employeeName: string
  role: UserRole
  totalRequired: number
  completed: number
  pending: number
  overdue: number
  lastActivity: string | null
  fullyCompliant: boolean
}

// ============================================================================
// COMPLIANCE FICHAS TYPES
// ============================================================================

export type ComplianceFichaCategory =
  | 'ld'
  | 'appcc'
  | 'prl'
  | 'receiving'
  | 'pest_control'
  | 'maintenance'
  | 'incident'
  | 'training'
  | 'other'

export type ComplianceFieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'time'
  | 'temperature'
  | 'textarea'
  | 'signature'

export interface ComplianceFieldOption {
  value: string
  label_en: string
  label_es: string
  label_nl?: string
  label_de?: string
}

export interface ComplianceFieldDefinition {
  key: string
  type: ComplianceFieldType
  label_en: string
  label_es: string
  label_nl?: string
  label_de?: string
  required: boolean
  options?: ComplianceFieldOption[]
  min?: number | null
  max?: number | null
  unit?: string | null
  default_value?: unknown
  placeholder_en?: string
  placeholder_es?: string
}

export interface ComplianceFichaType {
  id: string
  code: string
  category: ComplianceFichaCategory
  name_en: string
  name_es: string
  name_nl: string | null
  name_de: string | null
  description_en: string | null
  description_es: string | null
  description_nl: string | null
  description_de: string | null
  legal_basis: string | null
  fields_schema: ComplianceFieldDefinition[]
  frequency: string | null
  applicable_roles: string[]
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type ComplianceRecordStatus = 'completed' | 'flagged' | 'requires_review'

export interface ComplianceRecord {
  id: string
  ficha_type_id: string
  ficha_type_code: string
  recorded_by: string
  recorded_at: string
  values: Record<string, unknown>
  notes: string | null
  status: ComplianceRecordStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
}

export interface ComplianceRecordWithDetails extends ComplianceRecord {
  ficha_type: ComplianceFichaType
  recorded_by_employee: {
    id: string
    profile: {
      id: string
      full_name: string | null
      role: UserRole
    }
  }
  reviewer?: {
    id: string
    full_name: string | null
  } | null
}

export interface ComplianceStats {
  totalRecords: number
  recordsThisWeek: number
  recordsThisMonth: number
  flaggedCount: number
  pendingReviewCount: number
  byCategory: Record<ComplianceFichaCategory, number>
  byType: Array<{ code: string; name: string; count: number }>
}

// ============================================================================
// ADVERTISING TYPES
// ============================================================================

export type AdTemplate = 'football_match' | 'special_menu' | 'happy_hour' | 'cocktail_presentation' | 'custom'
export type AdPlacement = 'banner_top' | 'between_categories' | 'fullscreen_overlay'
export type AdStatus = 'draft' | 'active' | 'paused' | 'expired' | 'archived'
export type AdDisplayPage = 'digital_menu' | 'booking'

export interface Advertisement {
  id: string
  title_en: string
  title_nl: string
  title_es: string
  title_de: string
  description_en: string
  description_nl: string
  description_es: string
  description_de: string
  cta_text_en: string
  cta_text_nl: string
  cta_text_es: string
  cta_text_de: string
  cta_url: string | null
  image_url: string | null
  image_mobile_url: string | null
  background_color: string
  text_color: string
  template: AdTemplate
  placement: AdPlacement
  display_pages: AdDisplayPage[]
  start_date: string | null
  end_date: string | null
  start_time: string | null
  end_time: string | null
  days_of_week: number[]
  status: AdStatus
  priority: number
  impressions: number
  clicks: number
  created_by: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// GIFT COUPON TYPES
// ============================================================================

export type CouponStatus = 'pending_payment' | 'active' | 'partially_used' | 'fully_used' | 'expired' | 'cancelled'
export type CouponTheme = 'elegant' | 'tropical' | 'celebration' | 'seasonal'
export type CouponValidationMethod = 'qr_scan' | 'code_entry' | 'ai_assistant'

export interface GiftCoupon {
  id: string
  code: string
  amount_cents: number
  remaining_cents: number
  currency: string
  theme: CouponTheme
  purchaser_name: string
  purchaser_email: string
  recipient_name: string | null
  personal_message: string | null
  status: CouponStatus
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  pdf_url: string | null
  pdf_generated_at: string | null
  gdpr_consent: boolean
  gdpr_consent_at: string | null
  data_deletion_requested_at: string | null
  purchased_at: string | null
  expires_at: string
  created_at: string
  updated_at: string
}

export interface GiftCouponPublic {
  code: string
  amount_cents: number
  remaining_cents: number
  currency: string
  theme: CouponTheme
  recipient_name: string | null
  personal_message: string | null
  status: CouponStatus
  pdf_url: string | null
  purchased_at: string | null
  expires_at: string
}

export interface CouponRedemption {
  id: string
  coupon_id: string
  amount_cents: number
  validated_by: string | null
  validation_method: CouponValidationMethod
  notes: string | null
  created_at: string
}

export interface GiftCouponWithRedemptions extends GiftCoupon {
  redemptions: CouponRedemption[]
}

export interface CouponStats {
  totalSold: number
  totalRevenue: number
  activeCount: number
  redeemedCount: number
  expiredCount: number
}

// ============================================================================
// FLOOR PLAN TYPES (centralized from floor-section-tabs)
// ============================================================================

export type TableShapeType = 'round' | 'square' | 'rectangle'
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning'

export interface FloorSection {
  id: string
  name: string
  description?: string
  color?: string
  sort_order?: number
  is_active: boolean
}

export interface FloorTable {
  id: string
  table_number: string
  capacity: number
  x_position: number
  y_position: number
  status: TableStatus
  shape: TableShapeType
  width?: number
  height?: number
  rotation?: number
  section_id?: string
  is_active: boolean
}

// ============================================================================
// ZONE ASSIGNMENT TYPES
// ============================================================================

export interface ZoneAssignment {
  id: string
  section_id: string
  employee_id: string
  shift_id?: string | null
  assignment_date: string
  shift_type?: 'morning' | 'afternoon' | 'night' | null
  notes?: string | null
  assigned_by?: string | null
  created_at: string
  updated_at: string
  // Joined
  section?: FloorSection
  employee?: EmployeeWithProfile
}

// ============================================================================
// WEEKLY TASK PLAN TYPES
// ============================================================================

export type TaskPlanStatus = 'draft' | 'published' | 'archived'
export type PlannedTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

export interface WeeklyTaskPlan {
  id: string
  week_start_date: string
  status: TaskPlanStatus
  created_by: string | null
  published_at: string | null
  published_by: string | null
  notes: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface PlannedTask {
  id: string
  plan_id: string
  template_id?: string | null
  title: string
  description?: string | null
  assigned_to?: string | null
  assigned_role?: string | null
  day_of_week: number  // 0=Monday, 6=Sunday
  shift_type?: 'morning' | 'afternoon' | 'night' | null
  priority: TaskPriority
  estimated_minutes?: number | null
  section_id?: string | null
  sort_order: number
  status: PlannedTaskStatus
  completed_at?: string | null
  completed_by?: string | null
  task_id?: string | null  // generated real staff_task
  created_at: string
  updated_at: string
  // Joined
  assigned_employee?: EmployeeWithProfile
  section?: FloorSection
  template?: StaffTaskTemplate
}

export interface WeeklyTaskPlanWithTasks extends WeeklyTaskPlan {
  planned_tasks: PlannedTask[]
}

export interface BulkPlannedTaskSyncRequest {
  tasks_to_create: Array<{
    title: string
    description?: string
    assigned_to?: string
    assigned_role?: string
    day_of_week: number
    shift_type?: string
    priority?: string
    estimated_minutes?: number
    section_id?: string
    sort_order?: number
    template_id?: string
  }>
  tasks_to_update: Array<{
    id: string
    title?: string
    description?: string
    assigned_to?: string | null
    assigned_role?: string | null
    day_of_week?: number
    shift_type?: string | null
    priority?: string
    estimated_minutes?: number | null
    section_id?: string | null
    sort_order?: number
    status?: PlannedTaskStatus
  }>
  tasks_to_delete: string[]
}

// ============================================================================
// Task Planning Grid Types
// ============================================================================

export interface TaskGridCell {
  date: string
  tasks: PlannedTask[]
  taskCount: number
  totalMinutes: number
  highestPriority: 'urgent' | 'high' | 'medium' | 'low' | null
}

export interface TaskGridRow {
  employee: EmployeeWithProfile
  cells: Record<string, TaskGridCell>
  totalTasks: number
  totalMinutes: number
}

export interface TaskDepartmentGroup {
  role: string
  label: string
  employees: TaskGridRow[]
  totalTasks: number
  totalMinutes: number
}
