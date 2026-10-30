-- ========================================================
-- HutFix Seed Data - Official Clean Release
-- 3 Demo Users, 1 Provider, 4 Gigs, Platform Settings
-- ========================================================

-- 1. Truncate all dynamic tables and restart sequence identities
TRUNCATE TABLE 
  users, 
  providers, 
  provider_services, 
  provider_availability, 
  provider_blackouts, 
  service_requests, 
  request_status_events, 
  provider_bookings, 
  ratings, 
  invoices, 
  notifications, 
  disputes, 
  payout_requests, 
  support_tickets, 
  ticket_messages, 
  addresses, 
  favorites, 
  platform_settings 
RESTART IDENTITY CASCADE;

-- 2. Official Service Categories
INSERT INTO service_categories (slug, name, icon, description, base_price) VALUES
('appliance-repair', 'Appliance & Gadget Repair', 'bi-tools', 'Expert repair for air conditioners, refrigerators, microwaves, washing machines, and home gadgets.', 800.00),
('plumbing', 'Plumbing', 'bi-droplet', 'Pipe leakage repairs, sanitary fitting installations, water heater servicing, and drainage solutions.', 700.00),
('electrical', 'Electrical', 'bi-lightning-charge', 'Safe electrical wiring, short-circuit troubleshooting, circuit breaker replacement, and lighting fixtures.', 750.00),
('cleaning-pest', 'Cleaning & Pest Control', 'bi-brush', 'Complete deep home cleaning, sofa and carpet shampooing, and certified pest fumigation.', 600.00),
('home-maintenance', 'Home Maintenance', 'bi-house-gear', 'Carpentry, furniture repair, door fixing, and general residential maintenance.', 850.00),
('moving-shifting', 'Moving & Shifting', 'bi-truck', 'Hassle-free residential shifting, office relocation, delicate item packing, and transport.', 2500.00),
('car-care', 'Car Care & Repair', 'bi-car-front', 'On-demand car washing, interior detailing, emergency battery jumps, and oil changes.', 1000.00),
('personal-care', 'Personal Care', 'bi-scissors', 'Home salon and personal grooming services by vetted professionals.', 500.00)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price;

-- 3. Official 3 Users (Password: demo1234 for all)
INSERT INTO users (email, password_hash, full_name, phone, role) VALUES
('admin@demo.test', crypt('demo1234', gen_salt('bf', 10)), 'Demo Admin', '+8801700000003', 'admin'),
('customer@demo.test', crypt('demo1234', gen_salt('bf', 10)), 'Demo Customer', '+8801700000001', 'customer'),
('provider@demo.test', crypt('demo1234', gen_salt('bf', 10)), 'Rahim Electronics', '+8801700000002', 'provider');

-- 4. Provider Details: Link provider@demo.test to the providers table
INSERT INTO providers (user_id, headline, bio, rating, rating_count, latitude, longitude, address, years_experience, is_active, logo_url, banner_url)
SELECT 
  id, 
  'Certified AC & Home Appliance Specialist', 
  'Certified AC & Home Appliance Specialist', 
  4.9, 
  142, 
  23.7465, 
  90.3760, 
  'Road 7A, Dhanmondi, Dhaka', 
  8, 
  TRUE, 
  NULL, 
  NULL
FROM users 
WHERE email = 'provider@demo.test';

-- 5. 4 Gigs for the Provider (No images/banners, just text)
-- Gig 1: AC Repair & Servicing (Appliance & Gadget Repair, Price: 800, Duration: 60 mins)
INSERT INTO provider_services (provider_id, category_id, title, description, duration_minutes, price, banner_url)
SELECT 
  p.id, 
  sc.id, 
  'AC Repair & Servicing', 
  'Comprehensive diagnostic inspection, filter cleaning, cooling coil wash, and gas pressure check for split and window AC units.', 
  60, 
  800.00, 
  NULL
FROM providers p
JOIN users u ON u.id = p.user_id AND u.email = 'provider@demo.test'
JOIN service_categories sc ON sc.slug = 'appliance-repair';

-- Gig 2: Emergency Pipe Leak Fix (Plumbing, Price: 950, Duration: 45 mins)
INSERT INTO provider_services (provider_id, category_id, title, description, duration_minutes, price, banner_url)
SELECT 
  p.id, 
  sc.id, 
  'Emergency Pipe Leak Fix', 
  'Immediate repair of leaking pipes, burst joints, faucet replacements, and drain unblocking with heavy-duty sealant.', 
  45, 
  950.00, 
  NULL
FROM providers p
JOIN users u ON u.id = p.user_id AND u.email = 'provider@demo.test'
JOIN service_categories sc ON sc.slug = 'plumbing';

-- Gig 3: Circuit Breaker Diagnosis (Electrical, Price: 1200, Duration: 90 mins)
INSERT INTO provider_services (provider_id, category_id, title, description, duration_minutes, price, banner_url)
SELECT 
  p.id, 
  sc.id, 
  'Circuit Breaker Diagnosis', 
  'Full electrical circuit inspection, trip detection, load balancing, and faulty MCB or fuse replacement to prevent fire hazards.', 
  90, 
  1200.00, 
  NULL
FROM providers p
JOIN users u ON u.id = p.user_id AND u.email = 'provider@demo.test'
JOIN service_categories sc ON sc.slug = 'electrical';

-- Gig 4: Deep Home Cleaning (Cleaning & Pest Control, Price: 1500, Duration: 180 mins)
INSERT INTO provider_services (provider_id, category_id, title, description, duration_minutes, price, banner_url)
SELECT 
  p.id, 
  sc.id, 
  'Deep Home Cleaning', 
  'Thorough sanitization and deep scrubbing of all rooms, kitchens, bathrooms, floor buffing, and window glass wiping.', 
  180, 
  1500.00, 
  NULL
FROM providers p
JOIN users u ON u.id = p.user_id AND u.email = 'provider@demo.test'
JOIN service_categories sc ON sc.slug = 'cleaning-pest';

-- 6. Provider Availability (Monday to Saturday: Mon-Fri 9:00 - 18:00, Sat 10:00 - 20:00)
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
) AS d(w, s, e);

-- 7. Platform Settings (bKash & Nagad numbers)
INSERT INTO platform_settings (key, value) VALUES
  ('bkash_number', '01700000000'),
  ('nagad_number', '01700000000')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
