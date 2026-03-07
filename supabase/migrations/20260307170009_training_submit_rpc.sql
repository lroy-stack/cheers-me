CREATE OR REPLACE FUNCTION submit_training_test(
  p_employee_id UUID,
  p_guide_code TEXT,
  p_language TEXT,
  p_score INT,
  p_passed BOOLEAN,
  p_answers JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO training_records (employee_id, guide_code, action, language, score, answers)
  VALUES (p_employee_id, p_guide_code, 'test_completed', p_language, p_score, p_answers);

  INSERT INTO training_records (employee_id, guide_code, action, language, score, answers)
  VALUES (p_employee_id, p_guide_code, CASE WHEN p_passed THEN 'test_passed' ELSE 'test_failed' END, p_language, p_score, p_answers);

  IF p_passed THEN
    UPDATE training_assignments
    SET status = 'completed', completed_at = NOW(), score = p_score
    WHERE guide_code = p_guide_code
      AND assigned_to = p_employee_id
      AND status = 'pending';
  END IF;
END;
$$;
