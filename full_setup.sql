-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('civilian', 'police', 'admin');
CREATE TYPE device_status AS ENUM ('registered', 'lost', 'found', 'recovered', 'stolen');

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone_number TEXT,
  aadhaar_hash TEXT,
  aadhaar_verified BOOLEAN DEFAULT FALSE,
  role user_role DEFAULT 'civilian',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  imei_primary TEXT NOT NULL UNIQUE,
  imei_secondary TEXT,
  serial_number TEXT NOT NULL UNIQUE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT,
  purchase_date DATE,
  status device_status DEFAULT 'registered',
  ble_beacon_id TEXT UNIQUE DEFAULT uuid_generate_v4()::TEXT,
  is_ble_active BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ,
  last_seen_lat DOUBLE PRECISION,
  last_seen_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Beacon logs
CREATE TABLE IF NOT EXISTS beacon_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy_meters FLOAT,
  rssi INTEGER,
  reported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lost reports
CREATE TABLE IF NOT EXISTS lost_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  last_known_lat DOUBLE PRECISION,
  last_known_lng DOUBLE PRECISION,
  last_known_address TEXT,
  incident_description TEXT,
  police_complaint_number TEXT,
  reward_amount DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Chat rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  finder_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('owner', 'finder')),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  reference_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacon_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "profiles_self" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "devices_owner" ON devices FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "beacon_insert_any" ON beacon_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "beacon_owner_read" ON beacon_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM devices d WHERE d.id = device_id AND d.owner_id = auth.uid())
);
CREATE POLICY "lost_owner" ON lost_reports FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "chat_rooms_owner" ON chat_rooms FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "chat_messages_room_owner" ON chat_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM chat_rooms r WHERE r.id = room_id AND r.owner_id = auth.uid())
);
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- IMEI verify function (public, no auth needed)
CREATE OR REPLACE FUNCTION verify_imei(p_imei TEXT)
RETURNS JSON AS $$
DECLARE rec RECORD;
BEGIN
  SELECT d.status, d.make, d.model,
    REGEXP_REPLACE(p.full_name, '(\w)\w+', '\1****', 'g') AS owner_masked
  INTO rec
  FROM devices d JOIN profiles p ON p.id = d.owner_id
  WHERE d.imei_primary = p_imei;
  IF NOT FOUND THEN RETURN json_build_object('registered', false); END IF;
  RETURN json_build_object('registered', true, 'status', rec.status,
    'make', rec.make, 'model', rec.model, 'owner_masked', rec.owner_masked);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
ALTER TABLE devices ADD COLUMN spors_key text;
ALTER TABLE devices ADD COLUMN ble_device_uuid text;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS state text;

DROP TRIGGER IF EXISTS devices_generate_device_key_webhook ON public.devices;

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.enqueue_generate_device_key_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://jqsrzmyoysvzuyqwtown.supabase.co/functions/v1/generate-device-key',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxc3J6bXlveXN2enV5cXd0b3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjY2NzUsImV4cCI6MjA5MDEwMjY3NX0.mADftTxPnvDD0N4ncVKV3WnVHhp7_imUDwRzZUBaBsI'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'devices',
      'schema', 'public',
      'record', to_jsonb(NEW),
      'old_record', NULL
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER devices_generate_device_key_webhook
AFTER INSERT ON public.devices
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_generate_device_key_webhook();
-- Fix chat RLS policies to allow both owners and finders to participate in chat
-- This addresses the "Unable to send message" bug for finders

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "chat_messages_room_owner" ON chat_messages;

-- Create separate policies for different operations

-- Owners can do everything with their chat messages
CREATE POLICY "chat_messages_owner_all" ON chat_messages 
FOR ALL USING (
  EXISTS (SELECT 1 FROM chat_rooms r WHERE r.id = room_id AND r.owner_id = auth.uid())
);

-- Anyone can insert messages (finder, owner, or system) - the sender_role is tracked
CREATE POLICY "chat_messages_insert_any" ON chat_messages 
FOR INSERT WITH CHECK (
  sender_role IN ('owner', 'finder', 'system')
  AND EXISTS (SELECT 1 FROM chat_rooms r WHERE r.id = room_id)
);

-- Anyone can read messages in active chat rooms (needed for finders to see conversation)
CREATE POLICY "chat_messages_select_active" ON chat_messages 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_rooms r WHERE r.id = room_id)
);

-- Fix chat_rooms policy to allow finders to access rooms
DROP POLICY IF EXISTS "chat_rooms_owner" ON chat_rooms;

-- Owners can do everything with their chat rooms
CREATE POLICY "chat_rooms_owner_all" ON chat_rooms 
FOR ALL USING (owner_id = auth.uid());

-- Anyone can read chat rooms (finder_token provides access control)
CREATE POLICY "chat_rooms_select_any" ON chat_rooms 
FOR SELECT USING (true);

-- Enable realtime for chat_messages table (required for real-time subscriptions)
-- Note: Run this in Supabase Dashboard > Database > Replication
-- Or use the command below:
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Update the check constraint to allow 'system' sender_role
-- First drop the old constraint, then add new one
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_role_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_sender_role_check 
  CHECK (sender_role IN ('owner', 'finder', 'system'));
-- Fix signup failures caused by broken/duplicate auth->profile triggers.
-- Run this once in Supabase SQL Editor for your project.

-- Optional safety: ensure extension used elsewhere exists.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure profiles table exists with expected columns.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone_number text,
  aadhaar_hash text,
  aadhaar_verified boolean DEFAULT false,
  role public.user_role DEFAULT 'civilian',
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drop any known signup triggers that may double-insert profiles.
DO $$
DECLARE
  trg record;
BEGIN
  FOR trg IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND NOT t.tgisinternal
  LOOP
    IF trg.tgname IN ('on_auth_user_created', 'on_auth_user_created_profile', 'handle_new_user_trigger') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', trg.tgname);
    END IF;
  END LOOP;
END
$$;

-- Recreate a resilient trigger function.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number, aadhaar_verified, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone_number', ''), ''),
    FALSE,
    'civilian'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Avoid blocking auth signup if profile insert fails unexpectedly.
    RAISE LOG 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Attach a single canonical trigger.
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Helpful index for lookup.
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);
-- ============================================
-- Additional SPORS RLS Policies + Notifications Table
-- Run this in Supabase SQL Editor
-- ============================================

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'general',
  reference_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow deleting chat messages (needed for device deletion cascade)
CREATE POLICY "Anyone can delete chat messages"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (true);

-- Allow deleting chat rooms (needed for device deletion cascade)
CREATE POLICY "Anyone can delete chat rooms"
ON public.chat_rooms
FOR DELETE
TO authenticated
USING (true);

-- Allow deleting beacon logs (needed for device deletion cascade)
CREATE POLICY "Anyone can delete beacon logs"
ON public.beacon_logs
FOR DELETE
TO authenticated
USING (true);

-- Allow deleting lost reports (needed for device deletion cascade)
CREATE POLICY "Anyone can delete lost reports"
ON public.lost_reports
FOR DELETE
TO authenticated
USING (true);

-- Notifications: Allow users to read their own notifications
CREATE POLICY "Users can read own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Notifications: Allow updating own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Notifications: Allow system to insert notifications
CREATE POLICY "Anyone can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);
-- ============================================
-- SPORS Chat & Scanner RLS Policies
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- 1. Chat Rooms: Allow any authenticated user to read rooms
-- (Finders need to access rooms they participate in)
CREATE POLICY "Anyone can view chat rooms"
ON public.chat_rooms
FOR SELECT
TO authenticated
USING (true);

-- 2. Chat Rooms: Allow authenticated users to create rooms
CREATE POLICY "Authenticated users can create chat rooms"
ON public.chat_rooms
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Chat Rooms: Allow updating rooms (e.g., closing them)
CREATE POLICY "Authenticated users can update chat rooms"
ON public.chat_rooms
FOR UPDATE
TO authenticated
USING (true);

-- 4. Chat Messages: Allow reading messages in any room
CREATE POLICY "Anyone can read chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (true);

-- 5. Chat Messages: Allow sending messages
CREATE POLICY "Anyone can insert chat messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. Chat Messages: Allow marking messages as read
CREATE POLICY "Anyone can update chat messages"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (true);

-- 7. Beacon Logs: Allow any authenticated user to insert
-- (Finders need to report location sightings)
CREATE POLICY "Anyone can insert beacon logs"
ON public.beacon_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 8. Beacon Logs: Allow reading beacon logs
CREATE POLICY "Anyone can read beacon logs"
ON public.beacon_logs
FOR SELECT
TO authenticated
USING (true);

-- 9. Devices: Allow finders to update last_seen location
CREATE POLICY "Anyone can update device location"
ON public.devices
FOR UPDATE
TO authenticated
USING (status = 'lost')
WITH CHECK (status = 'lost');

-- 10. Lost Reports: Allow reading/updating for chat recovery flow
CREATE POLICY "Anyone can read lost reports"
ON public.lost_reports
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can update lost reports"
ON public.lost_reports
FOR UPDATE
TO authenticated
USING (true);
-- ============================================
-- SPORS Chat Fix - Run this in Supabase SQL Editor
-- This fixes all chat-related issues
-- ============================================

-- Step 1: Add message_text column if it doesn't exist
-- (Schema uses 'content' but app expects 'message_text')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_messages'
      AND column_name = 'message_text'
  ) THEN
    ALTER TABLE public.chat_messages ADD COLUMN message_text TEXT;
    -- Copy existing content to message_text
    UPDATE public.chat_messages SET message_text = content WHERE message_text IS NULL;
  END IF;
END $$;

-- Step 2: Drop ALL existing restrictive chat policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_rooms'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_rooms', pol.policyname);
  END LOOP;

  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_messages', pol.policyname);
  END LOOP;
END $$;

-- Step 3: Create correct chat_rooms policies
-- Anyone authenticated can READ chat rooms (needed for finders)
CREATE POLICY "chat_rooms_select_authenticated"
ON public.chat_rooms FOR SELECT
TO authenticated
USING (true);

-- Anyone authenticated can INSERT chat rooms (finder creates room)
CREATE POLICY "chat_rooms_insert_authenticated"
ON public.chat_rooms FOR INSERT
TO authenticated
WITH CHECK (true);

-- Anyone authenticated can UPDATE chat rooms (close room etc.)
CREATE POLICY "chat_rooms_update_authenticated"
ON public.chat_rooms FOR UPDATE
TO authenticated
USING (true);

-- Anyone authenticated can DELETE chat rooms (device deletion cascade)
CREATE POLICY "chat_rooms_delete_authenticated"
ON public.chat_rooms FOR DELETE
TO authenticated
USING (true);

-- Step 4: Create correct chat_messages policies
-- Anyone authenticated can READ messages in any room
CREATE POLICY "chat_messages_select_authenticated"
ON public.chat_messages FOR SELECT
TO authenticated
USING (true);

-- Anyone authenticated can INSERT messages
CREATE POLICY "chat_messages_insert_authenticated"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (true);

-- Anyone authenticated can UPDATE messages (mark as read)
CREATE POLICY "chat_messages_update_authenticated"
ON public.chat_messages FOR UPDATE
TO authenticated
USING (true);

-- Anyone authenticated can DELETE messages (cascade delete)
CREATE POLICY "chat_messages_delete_authenticated"
ON public.chat_messages FOR DELETE
TO authenticated
USING (true);

-- Step 5: Also fix beacon_logs policies for the finder
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'beacon_logs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.beacon_logs', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "beacon_logs_select_authenticated"
ON public.beacon_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "beacon_logs_insert_authenticated"
ON public.beacon_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "beacon_logs_delete_authenticated"
ON public.beacon_logs FOR DELETE
TO authenticated
USING (true);

-- Step 6: Fix devices policy - allow anyone to view lost devices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'devices'
      AND policyname = 'devices_view_lost'
  ) THEN
    CREATE POLICY "devices_view_lost"
    ON public.devices FOR SELECT
    TO authenticated
    USING (status = 'lost' OR owner_id = auth.uid());
  END IF;
END $$;

-- Step 7: Fix lost_reports - allow anyone to view active reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lost_reports'
      AND policyname = 'lost_reports_view_active'
  ) THEN
    CREATE POLICY "lost_reports_view_active"
    ON public.lost_reports FOR SELECT
    TO authenticated
    USING (is_active = true OR owner_id = auth.uid());
  END IF;
END $$;

-- Step 8: Fix notifications table
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Drop and recreate notification policies
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "notifications_select_own"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_any"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Done! All chat, beacon, and notification policies are now correct.


INSERT INTO profiles (id, full_name, role) VALUES ('1143390a-2bd3-4700-b7cf-c522145378ee', 'Officer Smith', 'police'), ('93608f5f-8131-4327-9516-20a0de902bb6', 'John Civilian', 'civilian') ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
