CREATE TABLE restaurants (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  category TEXT NOT NULL,
  votes    INTEGER NOT NULL DEFAULT 0
);

INSERT INTO restaurants (id, name, category) VALUES
  ('sakura',    'Sakura',             'japanese'),
  ('napoli',    'Pizzeria Napoli',    'pizza'),
  ('trattoria', 'Trattoria da Mario', 'italian');
