CREATE TRIGGER trg_audit_cash_register_closes
  AFTER INSERT OR UPDATE OR DELETE ON cash_register_closes
  FOR EACH ROW EXECUTE FUNCTION log_financial_change();
