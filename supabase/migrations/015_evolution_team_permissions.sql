-- ============================================================
-- WhatsApp Evolution API + collaborators/permissions.
-- Idempotent and safe to run after 014_auth_profiles_clinics_bootstrap.sql.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS connection_type TEXT NOT NULL DEFAULT 'meta_api';

ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS evolution_api_url TEXT;

ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS evolution_api_key TEXT;

ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS evolution_instance_name TEXT;

ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS evolution_status TEXT NOT NULL DEFAULT 'disconnected';

ALTER TABLE public.whatsapp_config
  ALTER COLUMN phone_number_id DROP NOT NULL;

ALTER TABLE public.whatsapp_config
  ALTER COLUMN access_token DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'whatsapp_config_connection_type_check'
      AND conrelid = 'public.whatsapp_config'::regclass
  ) THEN
    ALTER TABLE public.whatsapp_config
      DROP CONSTRAINT whatsapp_config_connection_type_check;
  END IF;

  ALTER TABLE public.whatsapp_config
    ADD CONSTRAINT whatsapp_config_connection_type_check
    CHECK (connection_type IN ('meta_api', 'evolution_qrcode'));

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'whatsapp_config_evolution_status_check'
      AND conrelid = 'public.whatsapp_config'::regclass
  ) THEN
    ALTER TABLE public.whatsapp_config
      DROP CONSTRAINT whatsapp_config_evolution_status_check;
  END IF;

  ALTER TABLE public.whatsapp_config
    ADD CONSTRAINT whatsapp_config_evolution_status_check
    CHECK (evolution_status IN ('disconnected', 'waiting_qrcode', 'connected', 'error'));
END $$;

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  position TEXT,
  permissions TEXT[] NOT NULL DEFAULT ARRAY['dashboard']::TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clinic_id, email),
  UNIQUE(user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_members_role_check'
      AND conrelid = 'public.team_members'::regclass
  ) THEN
    ALTER TABLE public.team_members
      ADD CONSTRAINT team_members_role_check
      CHECK (role IN ('administrator', 'attendant', 'commercial', 'financial', 'viewer'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_members_status_check'
      AND conrelid = 'public.team_members'::regclass
  ) THEN
    ALTER TABLE public.team_members
      ADD CONSTRAINT team_members_status_check
      CHECK (status IN ('active', 'disabled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_team_members_clinic_id
  ON public.team_members(clinic_id);

CREATE INDEX IF NOT EXISTS idx_team_members_owner_user_id
  ON public.team_members(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id
  ON public.team_members(user_id);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view own membership" ON public.team_members;
CREATE POLICY "Team members can view own membership"
  ON public.team_members FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Owners can manage team members" ON public.team_members;
CREATE POLICY "Owners can manage team members"
  ON public.team_members FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.team_members;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
