CREATE TABLE imaginia_gallery_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  state jsonb NOT NULL DEFAULT '{"userWorks":[],"overrides":{}}',
  revision integer NOT NULL DEFAULT 0,
  admin_verifier text
);

INSERT INTO imaginia_gallery_state DEFAULT VALUES;
