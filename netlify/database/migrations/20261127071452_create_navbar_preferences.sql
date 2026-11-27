CREATE TABLE imaginia_navbar_preferences (
  browser_id uuid PRIMARY KEY,
  language text NOT NULL CHECK (language IN ('ko', 'en', 'ja', 'zh', 'fr'))
);
