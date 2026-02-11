-- ============================================================================
-- GrandCafe Cheers — Initial Database Schema
-- Platform: Next.js + Supabase
-- Version: 0.1.0
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM (
  'admin',
  'manager',
  'kitchen',
  'bar',
  'waiter',
  'dj',
  'owner'
);

CREATE TYPE shift_type AS ENUM (
  'morning',
  'afternoon',
  'night'
);

CREATE TYPE contract_type AS ENUM (
  'full_time',
  'part_time',
  'casual',
  'contractor'
);

CREATE TYPE allergen_type AS ENUM (
  'celery',
  'crustaceans',
  'eggs',
  'fish',
  'gluten',
  'lupin',
  'milk',
  'molluscs',
  'mustard',
  'nuts',
  'peanuts',
  'sesame',
  'soy',
  'sulfites'
);

CREATE TYPE order_status AS ENUM (
  'pending',
  'in_progress',
  'ready',
  'served',
  'cancelled'
);

CREATE TYPE table_status AS ENUM (
  'available',
  'occupied',
  'reserved',
  'cleaning'
);

CREATE TYPE event_status AS ENUM (
  'pending',
  'confirmed',
  'completed',
  'cancelled'
);

CREATE TYPE sentiment_type AS ENUM (
  'positive',
  'neutral',
  'negative'
);

-- ============================================================================
-- PROFILES & AUTH
-- ============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  role user_role NOT NULL DEFAULT 'waiter',
  avatar_url TEXT,
  language VARCHAR(5) DEFAULT 'en',
  phone VARCHAR(20),
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT true
);

-- ============================================================================
-- STAFF MANAGEMENT
-- ============================================================================

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles ON DELETE CASCADE,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  contract_type contract_type NOT NULL DEFAULT 'casual',
  date_hired DATE,
  date_terminated DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees ON DELETE CASCADE,
  date DATE NOT NULL,
  shift_type shift_type NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration_minutes INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  shift_type shift_type NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees ON DELETE CASCADE,
  date DATE NOT NULL,
  available BOOLEAN NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

CREATE TABLE clock_in_out (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts ON DELETE SET NULL,
  clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE shift_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES employees ON DELETE CASCADE,
  offered_to UUID NOT NULL REFERENCES employees ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLES (moved up — referenced by kitchen_orders and reservations)
-- ============================================================================

CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number VARCHAR(50) NOT NULL UNIQUE,
  capacity INTEGER NOT NULL,
  section VARCHAR(100),
  x_position DECIMAL(10, 2),
  y_position DECIMAL(10, 2),
  status table_status DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SUPPLIERS (moved up — referenced by products)
-- ============================================================================

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  payment_terms VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- DJS (moved up — referenced by events)
-- ============================================================================

CREATE TABLE djs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  genre VARCHAR(100),
  fee DECIMAL(10, 2),
  email VARCHAR(255),
  phone VARCHAR(20),
  social_links TEXT,
  rider_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MENU & KITCHEN
-- ============================================================================

CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES menu_categories ON DELETE RESTRICT,
  name_en VARCHAR(255) NOT NULL,
  name_nl VARCHAR(255),
  name_es VARCHAR(255),
  description_en TEXT,
  description_nl TEXT,
  description_es TEXT,
  price DECIMAL(10, 2) NOT NULL,
  cost_of_goods DECIMAL(10, 2),
  photo_url TEXT,
  prep_time_minutes INTEGER,
  available BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE menu_allergens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items ON DELETE CASCADE,
  allergen allergen_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(menu_item_id, allergen)
);

CREATE TABLE menu_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items ON DELETE CASCADE,
  ingredient_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2),
  unit VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE daily_specials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES menu_items ON DELETE SET NULL,
  date DATE NOT NULL,
  name_en VARCHAR(255),
  description_en TEXT,
  price DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date)
);

CREATE TABLE menu_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE kitchen_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(50) NOT NULL UNIQUE,
  table_id UUID REFERENCES tables ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE kitchen_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_order_id UUID NOT NULL REFERENCES kitchen_orders ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STOCK & INVENTORY
-- ============================================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10, 2),
  max_stock DECIMAL(10, 2),
  cost_per_unit DECIMAL(10, 2),
  supplier_id UUID REFERENCES suppliers ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  recorded_by UUID REFERENCES employees ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers ON DELETE RESTRICT,
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products ON DELETE RESTRICT,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2),
  received_quantity DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE waste_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products ON DELETE CASCADE,
  quantity DECIMAL(10, 2) NOT NULL,
  reason VARCHAR(100),
  recorded_by UUID REFERENCES employees ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE stock_takes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products ON DELETE CASCADE,
  physical_count DECIMAL(10, 2) NOT NULL,
  system_count DECIMAL(10, 2) NOT NULL,
  variance DECIMAL(10, 2),
  recorded_by UUID REFERENCES employees ON DELETE SET NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SALES & POS
-- ============================================================================

CREATE TABLE daily_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  food_revenue DECIMAL(10, 2) DEFAULT 0,
  drinks_revenue DECIMAL(10, 2) DEFAULT 0,
  cocktails_revenue DECIMAL(10, 2) DEFAULT 0,
  desserts_revenue DECIMAL(10, 2) DEFAULT 0,
  other_revenue DECIMAL(10, 2) DEFAULT 0,
  tips DECIMAL(10, 2) DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  ticket_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE shift_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cash_register_closes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  expected_amount DECIMAL(10, 2) NOT NULL,
  actual_amount DECIMAL(10, 2) NOT NULL,
  variance DECIMAL(10, 2),
  notes TEXT,
  closed_by UUID REFERENCES employees ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- RESERVATIONS
-- ============================================================================

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES tables ON DELETE SET NULL,
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255),
  guest_phone VARCHAR(20),
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  party_size INTEGER NOT NULL,
  special_requests TEXT,
  status VARCHAR(50) DEFAULT 'confirmed',
  confirmed_at TIMESTAMP WITH TIME ZONE,
  show_status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name VARCHAR(255) NOT NULL,
  guest_phone VARCHAR(20),
  party_size INTEGER NOT NULL,
  estimated_wait_time_minutes INTEGER,
  position INTEGER,
  status VARCHAR(50) DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- EVENTS & DJ MANAGEMENT
-- ============================================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  event_type VARCHAR(100),
  dj_id UUID REFERENCES djs ON DELETE SET NULL,
  status event_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE event_equipment_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events ON DELETE CASCADE,
  equipment_name VARCHAR(255) NOT NULL,
  is_checked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE music_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events ON DELETE CASCADE,
  guest_name VARCHAR(255),
  song_title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MARKETING & SOCIAL MEDIA
-- ============================================================================

CREATE TABLE content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content_text TEXT,
  image_url TEXT,
  platform VARCHAR(100),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'draft',
  language VARCHAR(5),
  created_by UUID REFERENCES employees ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_calendar_id UUID REFERENCES content_calendar ON DELETE CASCADE,
  platform VARCHAR(100) NOT NULL,
  platform_post_id VARCHAR(255),
  caption TEXT,
  hashtags TEXT,
  image_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending',
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  html_content TEXT,
  segment VARCHAR(100),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'draft',
  recipient_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES employees ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  language VARCHAR(5) DEFAULT 'en',
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- FINANCE & REPORTING
-- ============================================================================

CREATE TABLE daily_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  revenue DECIMAL(10, 2) DEFAULT 0,
  cost_of_goods_sold DECIMAL(10, 2) DEFAULT 0,
  labor_cost DECIMAL(10, 2) DEFAULT 0,
  overhead_cost DECIMAL(10, 2) DEFAULT 0,
  profit DECIMAL(10, 2) DEFAULT 0,
  food_cost_ratio DECIMAL(5, 2),
  beverage_cost_ratio DECIMAL(5, 2),
  labor_cost_ratio DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CRM & CUSTOMERS
-- ============================================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  language VARCHAR(5),
  visit_count INTEGER DEFAULT 0,
  last_visit DATE,
  birthday DATE,
  anniversary DATE,
  preferences TEXT,
  notes TEXT,
  vip BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE customer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers ON DELETE CASCADE,
  platform VARCHAR(100),
  rating DECIMAL(3, 1),
  review_text TEXT,
  sentiment sentiment_type,
  response_draft TEXT,
  response_sent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers ON DELETE CASCADE,
  visit_milestone INTEGER,
  reward_description TEXT,
  reward_issued_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AI ASSISTANT
-- ============================================================================

CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ai_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_employees_profile_id ON employees(profile_id);
CREATE INDEX idx_shifts_employee_id ON shifts(employee_id);
CREATE INDEX idx_shifts_date ON shifts(date);
CREATE INDEX idx_clock_in_out_employee_id ON clock_in_out(employee_id);
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX idx_daily_sales_date ON daily_sales(date);
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_reservations_table_id ON reservations(table_id);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_social_posts_platform ON social_posts(platform);
CREATE INDEX idx_social_posts_published_at ON social_posts(published_at);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_visit_count ON customers(visit_count);
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_kitchen_orders_created_at ON kitchen_orders(created_at);
CREATE INDEX idx_kitchen_orders_status ON kitchen_orders(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE clock_in_out ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile, admins can read all
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Employees: Visible to staff, managers, admins
CREATE POLICY "Staff can read employees"
ON employees FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'kitchen', 'bar', 'waiter')
);

-- Shifts: Staff can see own shifts, managers can see all
CREATE POLICY "Staff can read own shifts"
ON shifts FOR SELECT
USING (
  employee_id = (SELECT id FROM employees WHERE profile_id = auth.uid()) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Menu Items: Everyone can read published menu items
CREATE POLICY "Menu items are public"
ON menu_items FOR SELECT
USING (true);

-- Stock: Kitchen, bar, and managers can see stock
CREATE POLICY "Kitchen and bar can read stock"
ON products FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'kitchen', 'bar')
);

-- Sales: Managers and owner can read sales data
CREATE POLICY "Sales visible to managers and owner"
ON daily_sales FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'owner')
);

-- Reservations: All staff can read, customers can read own
CREATE POLICY "Staff can read reservations"
ON reservations FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'waiter')
);

-- Events: All staff can read
CREATE POLICY "Staff can read events"
ON events FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'dj', 'bar', 'waiter')
);

-- AI Conversations: Users can read own
CREATE POLICY "Users can read own AI conversations"
ON ai_conversations FOR SELECT
USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Update profiles.updated_at on changes
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at();

-- Similar trigger for employees
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION update_employees_updated_at();

-- Calculate daily_sales.total_revenue
CREATE OR REPLACE FUNCTION update_daily_sales_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_revenue = COALESCE(NEW.food_revenue, 0) + COALESCE(NEW.drinks_revenue, 0) +
                      COALESCE(NEW.cocktails_revenue, 0) + COALESCE(NEW.desserts_revenue, 0) +
                      COALESCE(NEW.other_revenue, 0) + COALESCE(NEW.tips, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daily_sales_total
BEFORE INSERT OR UPDATE ON daily_sales
FOR EACH ROW
EXECUTE FUNCTION update_daily_sales_total();

-- Stock movement updates product current_stock
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type = 'in' THEN
    UPDATE products SET current_stock = current_stock + NEW.quantity WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'out' OR NEW.movement_type = 'waste' THEN
    UPDATE products SET current_stock = current_stock - NEW.quantity WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'adjustment' THEN
    UPDATE products SET current_stock = current_stock + NEW.quantity WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_movement_update
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();
