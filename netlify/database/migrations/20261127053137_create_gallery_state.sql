CREATE TABLE IF NOT EXISTS imaginia_gallery_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  user_works jsonb NOT NULL DEFAULT '[]'::jsonb,
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_password_hash text
);
