CREATE OR REPLACE FUNCTION public.is_valid_produks_features(p_features jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $function$
  SELECT
    jsonb_typeof(p_features) = 'array'
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(p_features) = 'array' THEN p_features
          ELSE '[]'::jsonb
        END
      ) AS feature(item)
      WHERE jsonb_typeof(feature.item) <> 'object'
         OR NOT (feature.item ? 'label')
         OR NOT (feature.item ? 'value')
         OR jsonb_typeof(feature.item -> 'label') <> 'string'
         OR jsonb_typeof(feature.item -> 'value') <> 'string'
    );
$function$;

ALTER TABLE public.produks
  ADD COLUMN IF NOT EXISTS features jsonb
  DEFAULT '[{"label":"Kondisi","value":"Bekas"},{"label":"Etalase","value":""}]'::jsonb;

UPDATE public.produks
SET features = '[{"label":"Kondisi","value":"Bekas"},{"label":"Etalase","value":""}]'::jsonb
WHERE features IS NULL;

ALTER TABLE public.produks
  ALTER COLUMN features SET DEFAULT '[{"label":"Kondisi","value":"Bekas"},{"label":"Etalase","value":""}]'::jsonb,
  ALTER COLUMN features SET NOT NULL;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'produks_features_valid_array'
      AND conrelid = 'public.produks'::regclass
  ) THEN
    ALTER TABLE public.produks
      ADD CONSTRAINT produks_features_valid_array
      CHECK (public.is_valid_produks_features(features));
  END IF;
END;
$constraint$;
