ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification preferences"
ON notification_preferences
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid())
