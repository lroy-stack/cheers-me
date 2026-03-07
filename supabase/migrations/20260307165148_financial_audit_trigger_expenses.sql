CREATE TRIGGER trg_audit_overhead_expenses
  AFTER INSERT OR UPDATE OR DELETE ON overhead_expenses
  FOR EACH ROW EXECUTE FUNCTION log_financial_change();
