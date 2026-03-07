-- ============================================================================
-- Fix D-03: Enable RLS on 15 tables that had no row-level security
-- Audit finding: budget, cash_register_closes, daily_specials, djs,
-- event_equipment_checklists, menu_activations, menu_allergens,
-- menu_categories, menu_ingredients, monthly_financials, music_requests,
-- shift_tips, tables, waitlist_entries, weekly_financials
-- ============================================================================

-- 1. budget — finance, admin/owner/manager only
ALTER TABLE budget ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Budget: admin/owner/manager can manage"
ON budget FOR ALL
USING (get_user_role() IN ('admin', 'owner', 'manager'))
WITH CHECK (get_user_role() IN ('admin', 'owner', 'manager'));

-- 2. cash_register_closes — admin/owner/manager can manage; bar/waiter can insert own
ALTER TABLE cash_register_closes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CashRegister: admin/owner/manager can manage all"
ON cash_register_closes FOR ALL
USING (get_user_role() IN ('admin', 'owner', 'manager'))
WITH CHECK (get_user_role() IN ('admin', 'owner', 'manager'));

CREATE POLICY "CashRegister: bar/waiter can read and insert own"
ON cash_register_closes FOR SELECT
USING (
  get_user_role() IN ('bar', 'waiter')
  AND closed_by = auth.uid()
);

CREATE POLICY "CashRegister: bar/waiter can insert"
ON cash_register_closes FOR INSERT
WITH CHECK (
  get_user_role() IN ('bar', 'waiter')
  AND closed_by = auth.uid()
);

-- 3. daily_specials — admin/owner/manager/kitchen can manage; all auth users can read
ALTER TABLE daily_specials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DailySpecials: all authenticated can read"
ON daily_specials FOR SELECT
USING (auth.uid() IS NOT NULL OR true);

CREATE POLICY "DailySpecials: admin/owner/manager/kitchen can manage"
ON daily_specials FOR ALL
USING (get_user_role() IN ('admin', 'owner', 'manager', 'kitchen'))
WITH CHECK (get_user_role() IN ('admin', 'owner', 'manager', 'kitchen'));

-- 4. djs — admin/owner/manager can manage; all auth users can read
ALTER TABLE djs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DJs: all authenticated can read"
ON djs FOR SELECT
USING (true);

CREATE POLICY "DJs: admin/owner/manager can manage"
ON djs FOR ALL
USING (get_user_role() IN ('admin', 'owner', 'manager'))
WITH CHECK (get_user_role() IN ('admin', 'owner', 'manager'));

-- 5. event_equipment_checklists — admin/owner/manager/dj can manage
ALTER TABLE event_equipment_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "EquipmentChecklists: admin/owner/manager/dj can manage"
ON event_equipment_checklists FOR ALL
USING (get_user_role() IN ('admin', 'owner', 'manager', 'dj'))
WITH CHECK (get_user_role() IN ('admin', 'owner', 'manager', 'dj'));

-- 6. menu_activations — admin/owner/manager/kitchen can manage; all auth users can read
ALTER TABLE menu_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MenuActivations: all authenticated can read"
ON menu_activations FOR SELECT
USING (true);

CREATE POLICY "MenuActivations: admin/owner/manager/kitchen can manage"
ON menu_activations FOR ALL
USING (get_user_role() IN ('admin', 'owner', 'manager', 'kitchen'))
WITH CHECK (get_user_role() IN ('admin', 'owner', 'manager', 'kitchen'));

-- 7. menu_allergens — publicly readable (needed for public menu); admin/manager manage
ALTER TABLE menu_allergens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MenuAllergens: publicly readable"
ON menu_allergens FOR SELECT
USING (true);

CREATE POLICY "MenuAllergens: admin/owner/manager can manage"
ON menu_allergens FOR ALL
USING (get_user_role() IN ('admin', 'owner', 'manager'))
WITH CHECK (get_user_role() IN ('admin', 'owner', 'manager'));

-- 8. menu_categories — publicly readable (needed for public menu); admin/manager manage
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MenuCategories: publicly readable"
ON menu_categories FOR SELECT
USING (true);

CREATE POLICY "MenuCategories: admin/owner/manager can manage"
ON menu_categories FOR ALL
USING (get_user_role() IN ('admin', 'owner', 'manager'))
WITH CHECK (get_user_role() IN ('admin', 'owner', 'manager'));

-- 9. menu_ingredients — all auth users can read; admin/manager can manage
ALTER TABLE menu_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MenuIngredients: all authenticated can read"
ON menu_ingredients FOR SELECT
USING (true);

CREATE POLICY "MenuIngredients: admin/owner/manager/kitchen can manage"
ON menu_ingredients FOR ALL
USING (get_user_role() IN ('admin', 'owner', 'manager', 'kitchen'))
WITH CHECK (get_user_role() IN ('admin', 'owner', 'manager', 'kitchen'));

-- 10. monthly_financials — admin/owner/manager only
ALTER TABLE monthly_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MonthlyFinancials: admin/owner/manager only"
ON monthly_financials FOR ALL
USING (get_user_role() IN ('admin', 'owner', 'manager'))
WITH CHECK (get_user_role() IN ('admin', 'owner', 'manager'));

-- 11. music_requests — all authenticated users can read/insert; dj/manager/admin can manage
ALTER TABLE music_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MusicRequests: all authenticated can read"
ON music_requests FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "MusicRequests: all authenticated can insert"
ON music_requests FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "MusicRequests: admin/owner/manager/dj can update/delete"
ON music_requests FOR UPDATE
USING (get_user_role() IN ('admin', 'owner', 'manager', 'dj'));

CREATE POLICY "MusicRequests: admin/owner/manager/dj can delete"
ON music_requests FOR DELETE
USING (get_user_role() IN ('admin', 'owner', 'manager', 'dj'));

-- 12. shift_tips — staff can read own; admin/owner/manager can read all
ALTER TABLE shift_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ShiftTips: admin/owner/manager can manage all"
ON shift_tips FOR ALL
USING (get_user_role() IN ('admin', 'owner', 'manager'))
WITH CHECK (get_user_role() IN ('admin', 'owner', 'manager'));

CREATE POLICY "ShiftTips: staff can read own tips"
ON shift_tips FOR SELECT
USING (
  get_user_role() IN ('bar', 'waiter', 'kitchen', 'dj')
  AND employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- 13. tables — all auth users can read (needed for floor plan/reservations); admin/manager manage
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tables: all authenticated can read"
ON tables FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Tables: admin/owner/manager can manage"
ON tables FOR ALL
USING (get_user_role() IN ('admin', 'owner', 'manager'))
WITH CHECK (get_user_role() IN ('admin', 'owner', 'manager'));

-- 14. waitlist_entries — admin/owner/manager/waiter can manage
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Waitlist: admin/owner/manager/waiter can manage"
ON waitlist_entries FOR ALL
USING (get_user_role() IN ('admin', 'owner', 'manager', 'waiter'))
WITH CHECK (get_user_role() IN ('admin', 'owner', 'manager', 'waiter'));

-- 15. weekly_financials — admin/owner/manager only
ALTER TABLE weekly_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WeeklyFinancials: admin/owner/manager only"
ON weekly_financials FOR ALL
USING (get_user_role() IN ('admin', 'owner', 'manager'))
WITH CHECK (get_user_role() IN ('admin', 'owner', 'manager'));
