-- Add the display name captured during admin account registration.
-- Nullable to preserve existing admin_tokopedia accounts without a name.
ALTER TABLE public.admin_tokopedia
  ADD COLUMN IF NOT EXISTS name text;
