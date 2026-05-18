-- Photos table, trust promotion triggers, storage bucket + policies.
-- Applied via Supabase MCP; this file is the documented source of truth.

CREATE SEQUENCE IF NOT EXISTS welchfest.unit_seq START 1;

ALTER TABLE welchfest.guests
  ADD COLUMN IF NOT EXISTS trust_status TEXT NOT NULL DEFAULT 'unknown'
  CHECK (trust_status IN ('unknown', 'trusted'));

CREATE TABLE IF NOT EXISTS welchfest.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_number INT NOT NULL DEFAULT nextval('welchfest.unit_seq'),
  guest_id UUID NOT NULL REFERENCES welchfest.guests(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('photo', '360')),
  caption TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  moderated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS photos_status_idx ON welchfest.photos(status);
CREATE INDEX IF NOT EXISTS photos_created_idx ON welchfest.photos(created_at DESC);
CREATE INDEX IF NOT EXISTS photos_guest_idx ON welchfest.photos(guest_id);

-- BEFORE INSERT: trusted uploaders get instant approval.
CREATE OR REPLACE FUNCTION welchfest.set_initial_photo_status()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT trust_status FROM welchfest.guests WHERE id = NEW.guest_id) = 'trusted' THEN
    NEW.status := 'approved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS photos_initial_status ON welchfest.photos;
CREATE TRIGGER photos_initial_status
BEFORE INSERT ON welchfest.photos
FOR EACH ROW
EXECUTE FUNCTION welchfest.set_initial_photo_status();

-- AFTER UPDATE: an approval promotes the uploader to trusted.
CREATE OR REPLACE FUNCTION welchfest.promote_guest_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE welchfest.guests
      SET trust_status = 'trusted'
      WHERE id = NEW.guest_id AND trust_status = 'unknown';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS photos_promote_on_approval ON welchfest.photos;
CREATE TRIGGER photos_promote_on_approval
AFTER UPDATE ON welchfest.photos
FOR EACH ROW
EXECUTE FUNCTION welchfest.promote_guest_on_approval();

ALTER TABLE welchfest.photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS photos_select_anon ON welchfest.photos;
CREATE POLICY photos_select_anon ON welchfest.photos FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS photos_insert_anon ON welchfest.photos;
CREATE POLICY photos_insert_anon ON welchfest.photos FOR INSERT TO anon WITH CHECK (true);
-- Updates only via service role (moderation runs server-side).

GRANT ALL ON ALL TABLES IN SCHEMA welchfest TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA welchfest TO anon, authenticated;

-- Storage bucket: public read, anon insert.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('welchfest-photos', 'welchfest-photos', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anon can upload to welchfest-photos" ON storage.objects;
CREATE POLICY "Anon can upload to welchfest-photos"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'welchfest-photos');

DROP POLICY IF EXISTS "Public read on welchfest-photos" ON storage.objects;
CREATE POLICY "Public read on welchfest-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'welchfest-photos');
