CREATE TABLE IF NOT EXISTS reservation_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  time_slot TIME NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4 CHECK (capacity >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (day_of_week, time_slot)
);
