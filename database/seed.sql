-- ========================================================
-- Seed Data for Smart Home Service Automation (HutFix)
-- Portable PostgreSQL - Idempotent
-- ========================================================

-- 1. Official 8 Service Categories
INSERT INTO service_categories (slug, name, icon, description, base_price) VALUES
('appliance-repair', 'Appliance & Gadget Repair', 'bi-tools', 'Expert repair for air conditioners, refrigerators, microwaves, washing machines, and home gadgets.', 800.00),
('plumbing', 'Plumbing', 'bi-droplet', 'Pipe leakage repairs, sanitary fitting installations, water heater servicing, and drainage solutions.', 700.00),
('electrical', 'Electrical', 'bi-lightning-charge', 'Safe electrical wiring, short-circuit troubleshooting, circuit breaker replacement, and lighting fixtures.', 750.00),
('cleaning-pest', 'Cleaning & Pest Control', 'bi-brush', 'Complete deep home cleaning, sofa and carpet shampooing, and certified pest fumigation.', 600.00),
('home-maintenance', 'Home Maintenance', 'bi-house-gear', 'Carpentry repair, drywall and furniture restoration, interior wall painting, and general handyman tasks.', 900.00),
('moving-shifting', 'Moving & Shifting', 'bi-truck', 'Professional home shifting, packing, fragile furniture dismantling, and reliable cargo transport.', 1500.00),
('car-care', 'Car Care & Repair', 'bi-car-front', 'On-demand car wash, oil and battery change, diagnostic scanning, and emergency roadside assistance.', 1200.00),
('personal-care', 'Personal Care', 'bi-person-heart', 'In-home grooming, haircut, massage therapy, and salon services by verified professionals.', 500.00)
ON CONFLICT (slug) DO NOTHING;

-- 2. Core Demo Accounts (password: demo1234)
INSERT INTO users (email, password_hash, full_name, phone, role) VALUES
('customer@demo.test', crypt('demo1234', gen_salt('bf')), 'Demo Customer', '+8801700000001', 'customer'),
('provider@demo.test', crypt('demo1234', gen_salt('bf')), 'Demo Provider', '+8801700000002', 'provider'),
('admin@demo.test', crypt('demo1234', gen_salt('bf')), 'Demo Admin', '+8801700000003', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 3. Additional Provider Users (password: demo1234)
INSERT INTO users (email, password_hash, full_name, phone, role) VALUES
('provider1@demo.test', crypt('demo1234', gen_salt('bf')), 'Rahim Electronics & AC Care', '+8801711000001', 'provider'),
('provider2@demo.test', crypt('demo1234', gen_salt('bf')), 'Karim Plumbing Solutions', '+8801711000002', 'provider'),
('provider3@demo.test', crypt('demo1234', gen_salt('bf')), 'Spark Electricians Dhaka', '+8801711000003', 'provider'),
('provider4@demo.test', crypt('demo1234', gen_salt('bf')), 'CleanHome & Pest Defense', '+8801711000004', 'provider'),
('provider5@demo.test', crypt('demo1234', gen_salt('bf')), 'Master Handyman & Carpentry', '+8801711000005', 'provider'),
('provider6@demo.test', crypt('demo1234', gen_salt('bf')), 'Swift Movers & Pack Service', '+8801711000006', 'provider'),
('provider7@demo.test', crypt('demo1234', gen_salt('bf')), 'AutoCare Express Dhaka', '+8801711000007', 'provider'),
('provider8@demo.test', crypt('demo1234', gen_salt('bf')), 'Glow & Wellness Salon At Home', '+8801711000008', 'provider'),
('provider9@demo.test', crypt('demo1234', gen_salt('bf')), 'CoolAir Tech Services', '+8801711000009', 'provider'),
('provider10@demo.test', crypt('demo1234', gen_salt('bf')), 'Urban Shifting Pro', '+8801711000010', 'provider')
ON CONFLICT (email) DO NOTHING;

-- 4. Seed Provider Profiles
-- Demo Provider: Dhanmondi, Appliance Repair focus (AC Repair demo scenario)
INSERT INTO providers (user_id, headline, bio, rating, rating_count, latitude, longitude, address, years_experience, is_active)
SELECT id, 'Certified AC & Home Appliance Specialist', 'Over 8 years of certified HVAC and electrical appliance diagnostics in central Dhaka.', 4.9, 142, 23.7465, 90.3760, 'Road 7A, Dhanmondi, Dhaka', 8, TRUE
FROM users WHERE email = 'provider@demo.test'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO providers (user_id, headline, bio, rating, rating_count, latitude, longitude, address, years_experience, is_active)
SELECT id, 'Senior HVAC & Refrigerator Technician', 'Fast response, certified compressor repair, and genuine parts guarantee.', 4.8, 115, 23.7500, 90.3800, 'Green Road, Dhanmondi, Dhaka', 9, TRUE
FROM users WHERE email = 'provider1@demo.test'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO providers (user_id, headline, bio, rating, rating_count, latitude, longitude, address, years_experience, is_active)
SELECT id, 'Licensed Master Plumber & Pipe Engineer', 'Specializing in residential leak detection, bathroom fittings, and motor installation.', 4.7, 98, 23.8041, 90.3667, 'Section 10, Mirpur, Dhaka', 7, TRUE
FROM users WHERE email = 'provider2@demo.test'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO providers (user_id, headline, bio, rating, rating_count, latitude, longitude, address, years_experience, is_active)
SELECT id, 'Certified Electrician & Wiring Consultant', 'Safe, compliant electrical installations, load analysis, and emergency fix.', 4.9, 180, 23.8759, 90.3795, 'Sector 4, Uttara, Dhaka', 12, TRUE
FROM users WHERE email = 'provider3@demo.test'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO providers (user_id, headline, bio, rating, rating_count, latitude, longitude, address, years_experience, is_active)
SELECT id, 'Eco-Friendly Deep Cleaning & Pest Eradication', 'Hospital-grade sanitization, mattress shampooing, and chemical pest management.', 4.6, 85, 23.7925, 90.4078, 'Road 11, Banani, Dhaka', 5, TRUE
FROM users WHERE email = 'provider4@demo.test'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO providers (user_id, headline, bio, rating, rating_count, latitude, longitude, address, years_experience, is_active)
SELECT id, 'Custom Carpentry & Home Renovation Craftsman', 'Expert wood restoration, modular kitchen fittings, door alignments, and painting.', 4.8, 64, 23.7610, 90.3620, 'Tajmahal Road, Mohammadpur, Dhaka', 10, TRUE
FROM users WHERE email = 'provider5@demo.test'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO providers (user_id, headline, bio, rating, rating_count, latitude, longitude, address, years_experience, is_active)
SELECT id, 'Seamless Household & Corporate Relocation', 'Trained loaders, bubble-wrap safety packaging, and covered van logistics.', 4.5, 42, 23.8150, 90.4250, 'Block C, Bashundhara R/A, Dhaka', 6, TRUE
FROM users WHERE email = 'provider6@demo.test'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO providers (user_id, headline, bio, rating, rating_count, latitude, longitude, address, years_experience, is_active)
SELECT id, 'Doorstep Mobile Auto Wash & Periodic Servicing', 'High-pressure foam wash, computer OBD scanning, battery jumpstart, and lube service.', 4.7, 73, 23.7800, 90.4167, 'Gulshan 1, Dhaka', 4, TRUE
FROM users WHERE email = 'provider7@demo.test'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO providers (user_id, headline, bio, rating, rating_count, latitude, longitude, address, years_experience, is_active)
SELECT id, 'Certified Aesthetician & Personal Grooming Expert', 'Hygienic salon and therapeutic spa treatments delivered in your private living space.', 4.9, 130, 23.7950, 90.4100, 'Road 27, Banani, Dhaka', 8, TRUE
FROM users WHERE email = 'provider8@demo.test'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO providers (user_id, headline, bio, rating, rating_count, latitude, longitude, address, years_experience, is_active)
SELECT id, 'Commercial & Residential Air Con Tech', 'VRF, split, and inverter AC servicing, gas replenishment, and leak fixing.', 4.4, 38, 23.7300, 90.4180, 'Dilkusha, Motijheel, Dhaka', 5, TRUE
FROM users WHERE email = 'provider9@demo.test'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO providers (user_id, headline, bio, rating, rating_count, latitude, longitude, address, years_experience, is_active)
SELECT id, 'Heavy Equipment Moving & Furniture Hoisting', 'Equipped with hydraulic lift trolleys and insured cargo transport.', 4.6, 51, 23.7700, 90.3800, 'Panthapath, Dhaka', 7, TRUE
FROM users WHERE email = 'provider10@demo.test'
ON CONFLICT (user_id) DO NOTHING;

-- 5. Seed Provider Services Mapping (Pricing per category)
INSERT INTO provider_services (provider_id, category_id, price)
SELECT p.id, c.id, 1000.00
FROM providers p
JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'appliance-repair'
WHERE u.email = 'provider@demo.test'
ON CONFLICT (provider_id, category_id) DO NOTHING;

INSERT INTO provider_services (provider_id, category_id, price)
SELECT p.id, c.id, 950.00
FROM providers p
JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'appliance-repair'
WHERE u.email = 'provider1@demo.test'
ON CONFLICT (provider_id, category_id) DO NOTHING;

INSERT INTO provider_services (provider_id, category_id, price)
SELECT p.id, c.id, 750.00
FROM providers p
JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'plumbing'
WHERE u.email = 'provider2@demo.test'
ON CONFLICT (provider_id, category_id) DO NOTHING;

INSERT INTO provider_services (provider_id, category_id, price)
SELECT p.id, c.id, 800.00
FROM providers p
JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'electrical'
WHERE u.email = 'provider3@demo.test'
ON CONFLICT (provider_id, category_id) DO NOTHING;

INSERT INTO provider_services (provider_id, category_id, price)
SELECT p.id, c.id, 650.00
FROM providers p
JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'cleaning-pest'
WHERE u.email = 'provider4@demo.test'
ON CONFLICT (provider_id, category_id) DO NOTHING;

INSERT INTO provider_services (provider_id, category_id, price)
SELECT p.id, c.id, 950.00
FROM providers p
JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'home-maintenance'
WHERE u.email = 'provider5@demo.test'
ON CONFLICT (provider_id, category_id) DO NOTHING;

INSERT INTO provider_services (provider_id, category_id, price)
SELECT p.id, c.id, 1600.00
FROM providers p
JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'moving-shifting'
WHERE u.email = 'provider6@demo.test'
ON CONFLICT (provider_id, category_id) DO NOTHING;

INSERT INTO provider_services (provider_id, category_id, price)
SELECT p.id, c.id, 1300.00
FROM providers p
JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'car-care'
WHERE u.email = 'provider7@demo.test'
ON CONFLICT (provider_id, category_id) DO NOTHING;

INSERT INTO provider_services (provider_id, category_id, price)
SELECT p.id, c.id, 550.00
FROM providers p
JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'personal-care'
WHERE u.email = 'provider8@demo.test'
ON CONFLICT (provider_id, category_id) DO NOTHING;

INSERT INTO provider_services (provider_id, category_id, price)
SELECT p.id, c.id, 850.00
FROM providers p
JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'appliance-repair'
WHERE u.email = 'provider9@demo.test'
ON CONFLICT (provider_id, category_id) DO NOTHING;

INSERT INTO provider_services (provider_id, category_id, price)
SELECT p.id, c.id, 1500.00
FROM providers p
JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'moving-shifting'
WHERE u.email = 'provider10@demo.test'
ON CONFLICT (provider_id, category_id) DO NOTHING;

-- Multi-category capability for providers:
INSERT INTO provider_services (provider_id, category_id, price)
SELECT p.id, c.id, 700.00
FROM providers p
JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'electrical'
WHERE u.email = 'provider@demo.test'
ON CONFLICT (provider_id, category_id) DO NOTHING;

INSERT INTO provider_services (provider_id, category_id, price)
SELECT p.id, c.id, 800.00
FROM providers p
JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'home-maintenance'
WHERE u.email = 'provider2@demo.test'
ON CONFLICT (provider_id, category_id) DO NOTHING;

-- 6. Seed Provider Availability (Weekdays 1 to 6: Mon=1 to Sat=6)
-- Demo provider has slots including Saturday 16:00-18:00 (960 to 1080) for hackathon AC scenario
INSERT INTO provider_availability (provider_id, weekday, start_minute, end_minute)
SELECT p.id, d.w, d.s, d.e
FROM providers p
CROSS JOIN (
  VALUES
    (1, 540, 1080), -- Mon 9:00 - 18:00
    (2, 540, 1080), -- Tue 9:00 - 18:00
    (3, 540, 1080), -- Wed 9:00 - 18:00
    (4, 540, 1080), -- Thu 9:00 - 18:00
    (5, 540, 1080), -- Fri 9:00 - 18:00
    (6, 600, 1200)  -- Sat 10:00 - 20:00 (covers 4-6 PM / 960-1080)
) AS d(w, s, e)
WHERE NOT EXISTS (
  SELECT 1 FROM provider_availability pa
  WHERE pa.provider_id = p.id AND pa.weekday = d.w AND pa.start_minute = d.s
);
