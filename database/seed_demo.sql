-- Rich Demo Seed Data for Presentation & Hackathon Dashboards

-- Ensure past completed requests exist for customer 1 and provider 2
INSERT INTO service_requests (id, customer_id, category_id, assigned_provider_id, address, preferred_date, preferred_start_minute, preferred_end_minute, status, estimated_price, payment_method, trx_id, sender_number, payment_status)
VALUES 
(1, 1, 1, 2, 'House 12, Road 4, Dhanmondi, Dhaka', CURRENT_DATE - 5, 600, 660, 'completed', 950, 'bkash', 'TRX111001', '01711223344', 'verified'),
(2, 1, 1, 2, 'House 12, Road 4, Dhanmondi, Dhaka', CURRENT_DATE - 4, 600, 660, 'completed', 950, 'bkash', 'TRX111002', '01711223344', 'verified'),
(4, 1, 1, 2, 'House 12, Road 4, Dhanmondi, Dhaka', CURRENT_DATE - 3, 600, 660, 'completed', 950, 'bkash', 'TRX111003', '01711223344', 'verified'),
(5, 1, 1, 2, 'House 12, Road 4, Dhanmondi, Dhaka', CURRENT_DATE - 2, 600, 660, 'completed', 950, 'bkash', 'TRX111004', '01711223344', 'verified'),
(6, 1, 1, 2, 'House 12, Road 4, Dhanmondi, Dhaka', CURRENT_DATE - 1, 600, 660, 'completed', 950, 'bkash', 'TRX111005', '01711223344', 'verified')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for service_requests if needed
SELECT setval('service_requests_id_seq', (SELECT GREATEST(MAX(id), 10) FROM service_requests));

-- Pending Payment for Admin to Verify
INSERT INTO service_requests (customer_id, category_id, assigned_provider_id, address, preferred_date, preferred_start_minute, preferred_end_minute, status, estimated_price, payment_method, trx_id, sender_number, payment_status)
VALUES (1, 1, 2, 'Dhanmondi', CURRENT_DATE + 1, 600, 660, 'requested', 950, 'bkash', 'TRX998877', '01711223344', 'pending');

-- Pending Payout for Admin to Approve
INSERT INTO payout_requests (provider_id, amount, status) 
VALUES (2, 4500, 'pending');

-- Open Dispute for Admin to Resolve
INSERT INTO disputes (request_id, raised_by_user_id, reason, status)
VALUES (1, 1, 'The AC technician did not fix the cooling issue.', 'open');

-- 5 Recent Reviews for Provider 2
INSERT INTO ratings (request_id, customer_id, provider_id, stars, comment) 
VALUES 
(1, 1, 2, 5, 'Fixed the AC quickly, very professional.'),
(2, 1, 2, 4, 'Good service, arrived slightly late.'),
(4, 1, 2, 5, 'Clean wiring job and polite behavior.'),
(5, 1, 2, 5, 'Accurate diagnostic and reasonable parts cost.'),
(6, 1, 2, 4, 'Great work, will book again!')
ON CONFLICT (request_id) DO NOTHING;
