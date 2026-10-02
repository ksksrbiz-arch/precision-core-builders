-- Site plans: a real-world scale.
--
-- The canvas works in pixels, so a drawn "20' wall" was only a label. This
-- records how many canvas pixels equal one foot, which lets the server compute
-- true lengths/areas (the takeoff) from the stored drawing. NULL means "never
-- calibrated" — readers fall back to the default of 1 grid square (20px) = 1 ft.
-- Additive and idempotent; existing plans are untouched.

ALTER TABLE site_plans
  ADD COLUMN IF NOT EXISTS scale_px_per_ft NUMERIC(10, 4)
  CONSTRAINT site_plans_scale_px_per_ft_range
  CHECK (scale_px_per_ft IS NULL OR (scale_px_per_ft >= 0.5 AND scale_px_per_ft <= 5000));
