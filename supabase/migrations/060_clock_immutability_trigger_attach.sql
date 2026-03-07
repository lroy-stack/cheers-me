-- Migration 060: Attach clock immutability trigger to clock_in_out table (Feature #38)

CREATE TRIGGER prevent_clock_modification
  BEFORE UPDATE ON clock_in_out
  FOR EACH ROW
  EXECUTE FUNCTION prevent_clock_modification()
