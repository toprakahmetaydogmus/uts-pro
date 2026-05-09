-- ════════════════════════════════════════════════════════════════
--  UTS PRO — visitor_logs tablosu güncellemesi
--  Supabase SQL Editor'da çalıştırın
-- ════════════════════════════════════════════════════════════════

-- Tablo yoksa oluştur
CREATE TABLE IF NOT EXISTS visitor_logs (
  id         bigserial PRIMARY KEY,
  ip_address text,
  action     text,
  user_agent text,
  country    text,
  city       text,
  created_at timestamptz DEFAULT now()
);

-- Yeni kolonları ekle (varsa hata vermez)
ALTER TABLE visitor_logs
  ADD COLUMN IF NOT EXISTS region   text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS referer  text,
  ADD COLUMN IF NOT EXISTS page     text DEFAULT '/',
  ADD COLUMN IF NOT EXISTS device   text;

-- RLS aktif et
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;

-- Service role her şeyi yazabilsin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'visitor_logs'
    AND policyname  = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access"
    ON visitor_logs FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END
$$;

-- Sonucu kontrol et
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'visitor_logs'
ORDER BY ordinal_position;
