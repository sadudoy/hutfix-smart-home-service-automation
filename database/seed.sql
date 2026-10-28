-- ========================================================
-- Seed Data for Smart Home Service Automation (HutFix)
-- Portable PostgreSQL - Idempotent
-- ========================================================

-- 1. Official Service Categories
INSERT INTO service_categories (slug, name, icon, description, base_price) VALUES
('appliance-repair', 'Appliance & Gadget Repair', 'bi-tools', 'Expert repair for air conditioners, refrigerators, microwaves, washing machines, and home gadgets.', 800.00),
('plumbing', 'Plumbing', 'bi-droplet', 'Pipe leakage repairs, sanitary fitting installations, water heater servicing, and drainage solutions.', 700.00),
('electrical', 'Electrical', 'bi-lightning-charge', 'Safe electrical wiring, short-circuit troubleshooting, circuit breaker replacement, and lighting fixtures.', 750.00),
('cleaning-pest', 'Cleaning & Pest Control', 'bi-brush', 'Complete deep home cleaning, sofa and carpet shampooing, and certified pest fumigation.', 600.00),
('home-painting', 'Home & Commercial Painting', 'bi-brush', 'Interior and exterior wall painting, waterproof damping treatment, and modern wall textures.', 1200.00),
('carpentry', 'Carpentry & Furniture Assembly', 'bi-wrench', 'Custom furniture crafting, wooden door installation, kitchen cabinet fixing, and woodwork polishing.', 850.00),
('packers-movers', 'Packers & Movers', 'bi-truck', 'Hassle-free residential shifting, office relocation, delicate item packing, and transportation across Dhaka.', 2500.00),
('ac-repair-specialist', 'Emergency AC Repair & Master Gas Charge', 'bi-snow', '24/7 emergency dispatch for split and cassette air conditioners, refrigerant leakage tests, and master cleaning.', 950.00)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price;

-- 2. Official 3 Demo Users (password: demo1234)
INSERT INTO users (email, password_hash, full_name, phone, role) VALUES
('customer@demo.test', crypt('demo1234', gen_salt('bf')), 'Demo Customer', '+8801700000001', 'customer'),
('provider@demo.test', crypt('demo1234', gen_salt('bf')), 'Rahim Electronics', '+8801700000002', 'provider'),
('admin@demo.test', crypt('demo1234', gen_salt('bf')), 'Demo Admin', '+8801700000003', 'admin')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role;

-- 3. Seed Provider Profile for Rahim Electronics
INSERT INTO providers (user_id, headline, bio, rating, rating_count, latitude, longitude, address, years_experience, is_active)
SELECT id, 'Certified AC & Home Appliance Specialist', 'Over 8 years of certified HVAC and electrical appliance diagnostics in central Dhaka.', 4.9, 142, 23.7465, 90.3760, 'Road 7A, Dhanmondi, Dhaka', 8, TRUE
FROM users WHERE email = 'provider@demo.test'
ON CONFLICT (user_id) DO UPDATE SET
  headline = EXCLUDED.headline,
  bio = EXCLUDED.bio,
  rating = EXCLUDED.rating,
  address = EXCLUDED.address,
  years_experience = EXCLUDED.years_experience,
  is_active = TRUE;

-- 4. Seed Provider Services for Rahim Electronics
INSERT INTO provider_services (provider_id, category_id, price)
SELECT p.id, sc.id, 850.00
FROM providers p
JOIN users u ON u.id = p.user_id AND u.email = 'provider@demo.test'
CROSS JOIN service_categories sc
WHERE sc.slug = 'appliance-repair'
ON CONFLICT (provider_id, category_id) DO UPDATE SET price = EXCLUDED.price;

INSERT INTO provider_services (provider_id, category_id, price)
SELECT p.id, sc.id, 750.00
FROM providers p
JOIN users u ON u.id = p.user_id AND u.email = 'provider@demo.test'
CROSS JOIN service_categories sc
WHERE sc.slug = 'electrical'
ON CONFLICT (provider_id, category_id) DO UPDATE SET price = EXCLUDED.price;

INSERT INTO provider_services (provider_id, category_id, price)
SELECT p.id, sc.id, 700.00
FROM providers p
JOIN users u ON u.id = p.user_id AND u.email = 'provider@demo.test'
CROSS JOIN service_categories sc
WHERE sc.slug = 'plumbing'
ON CONFLICT (provider_id, category_id) DO UPDATE SET price = EXCLUDED.price;

-- 5. Seed Provider Availability (Weekdays 1 to 6: Mon=1 to Sat=6)
INSERT INTO provider_availability (provider_id, weekday, start_minute, end_minute)
SELECT p.id, d.w, d.s, d.e
FROM providers p
JOIN users u ON u.id = p.user_id AND u.email = 'provider@demo.test'
CROSS JOIN (
  VALUES
    (1, 540, 1080), -- Mon 9:00 - 18:00
    (2, 540, 1080), -- Tue 9:00 - 18:00
    (3, 540, 1080), -- Wed 9:00 - 18:00
    (4, 540, 1080), -- Thu 9:00 - 18:00
    (5, 540, 1080), -- Fri 9:00 - 18:00
    (6, 600, 1200)  -- Sat 10:00 - 20:00
) AS d(w, s, e)
WHERE NOT EXISTS (
  SELECT 1 FROM provider_availability pa
  WHERE pa.provider_id = p.id AND pa.weekday = d.w AND pa.start_minute = d.s
);

-- 6. Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT INTO platform_settings (key, value) VALUES
  ('bkash_number', '01700000000'),
  ('nagad_number', '01700000000')
ON CONFLICT (key) DO NOTHING;
