ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;

ALTER TABLE providers ADD COLUMN IF NOT EXISTS nid_number TEXT;

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT INTO platform_settings (key, value) VALUES
  ('bkash_number', '01700000000'),
  ('nagad_number', '01700000000')
ON CONFLICT (key) DO NOTHING;
