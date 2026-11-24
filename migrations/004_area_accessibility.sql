ALTER TABLE public.area_observations ADD COLUMN IF NOT EXISTS accessibility jsonb NOT NULL DEFAULT '{}';
