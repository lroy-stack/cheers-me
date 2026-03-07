CREATE TRIGGER trg_retention_clock_in_out
  BEFORE DELETE ON clock_in_out
  FOR EACH ROW EXECUTE FUNCTION prevent_early_deletion();

CREATE TRIGGER trg_retention_cash_register_closes
  BEFORE DELETE ON cash_register_closes
  FOR EACH ROW EXECUTE FUNCTION prevent_early_deletion();

CREATE TRIGGER trg_retention_overhead_expenses
  BEFORE DELETE ON overhead_expenses
  FOR EACH ROW EXECUTE FUNCTION prevent_early_deletion();
