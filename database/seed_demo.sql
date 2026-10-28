-- Rich Demo Seed Data for Presentation & Hackathon Dashboards
-- All records link to:
--   customer@demo.test (Demo Customer)
--   provider@demo.test (Rahim Electronics)
--   admin@demo.test (Demo Admin)

DO $$
DECLARE
  v_cust_id BIGINT;
  v_prov_id BIGINT;
  v_cat_id BIGINT;
  v_req1 BIGINT;
  v_req2 BIGINT;
  v_req3 BIGINT;
  v_req4 BIGINT;
  v_req5 BIGINT;
  v_req_pending BIGINT;
BEGIN
  SELECT id INTO v_cust_id FROM users WHERE email = 'customer@demo.test';
  SELECT p.id INTO v_prov_id FROM providers p JOIN users u ON u.id = p.user_id WHERE u.email = 'provider@demo.test';
  SELECT id INTO v_cat_id FROM service_categories WHERE slug = 'appliance-repair';

  IF v_cust_id IS NOT NULL AND v_prov_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    -- 1. Completed Service Requests
    INSERT INTO service_requests (customer_id, category_id, assigned_provider_id, address, preferred_date, preferred_start_minute, preferred_end_minute, status, estimated_price, payment_method, trx_id, sender_number, payment_status)
    VALUES (v_cust_id, v_cat_id, v_prov_id, 'House 12, Road 4, Dhanmondi, Dhaka', CURRENT_DATE - 5, 600, 660, 'completed', 950, 'bkash', 'TRX111001', '01711223344', 'verified')
    RETURNING id INTO v_req1;

    INSERT INTO service_requests (customer_id, category_id, assigned_provider_id, address, preferred_date, preferred_start_minute, preferred_end_minute, status, estimated_price, payment_method, trx_id, sender_number, payment_status)
    VALUES (v_cust_id, v_cat_id, v_prov_id, 'House 12, Road 4, Dhanmondi, Dhaka', CURRENT_DATE - 4, 600, 660, 'completed', 850, 'bkash', 'TRX111002', '01711223344', 'verified')
    RETURNING id INTO v_req2;

    INSERT INTO service_requests (customer_id, category_id, assigned_provider_id, address, preferred_date, preferred_start_minute, preferred_end_minute, status, estimated_price, payment_method, trx_id, sender_number, payment_status)
    VALUES (v_cust_id, v_cat_id, v_prov_id, 'House 12, Road 4, Dhanmondi, Dhaka', CURRENT_DATE - 3, 600, 660, 'completed', 1200, 'nagad', 'TRX111003', '01711223344', 'verified')
    RETURNING id INTO v_req3;

    INSERT INTO service_requests (customer_id, category_id, assigned_provider_id, address, preferred_date, preferred_start_minute, preferred_end_minute, status, estimated_price, payment_method, trx_id, sender_number, payment_status)
    VALUES (v_cust_id, v_cat_id, v_prov_id, 'House 12, Road 4, Dhanmondi, Dhaka', CURRENT_DATE - 2, 600, 660, 'completed', 750, 'cash', NULL, NULL, 'verified')
    RETURNING id INTO v_req4;

    INSERT INTO service_requests (customer_id, category_id, assigned_provider_id, address, preferred_date, preferred_start_minute, preferred_end_minute, status, estimated_price, payment_method, trx_id, sender_number, payment_status)
    VALUES (v_cust_id, v_cat_id, v_prov_id, 'House 12, Road 4, Dhanmondi, Dhaka', CURRENT_DATE - 1, 600, 660, 'completed', 950, 'bkash', 'TRX111005', '01711223344', 'verified')
    RETURNING id INTO v_req5;

    -- 2. Pending Payment for Admin to Verify
    INSERT INTO service_requests (customer_id, category_id, assigned_provider_id, address, preferred_date, preferred_start_minute, preferred_end_minute, status, estimated_price, payment_method, trx_id, sender_number, payment_status)
    VALUES (v_cust_id, v_cat_id, v_prov_id, 'House 14, Road 7A, Dhanmondi, Dhaka', CURRENT_DATE + 1, 600, 660, 'requested', 950, 'bkash', 'TRX998877', '01711223344', 'pending')
    RETURNING id INTO v_req_pending;

    -- 3. Pending Payout for Admin to Approve
    INSERT INTO payout_requests (provider_id, amount, status) 
    VALUES (v_prov_id, 4500, 'pending');

    -- 4. Open Dispute for Admin to Resolve
    IF v_req1 IS NOT NULL THEN
      INSERT INTO disputes (request_id, raised_by_user_id, reason, status)
      VALUES (v_req1, v_cust_id, 'The AC technician did not fix the cooling issue completely.', 'open');
    END IF;

    -- 5. Reviews for Provider
    IF v_req1 IS NOT NULL THEN
      INSERT INTO ratings (request_id, customer_id, provider_id, stars, comment)
      VALUES (v_req1, v_cust_id, v_prov_id, 5, 'Fixed the AC quickly, very professional.')
      ON CONFLICT (request_id) DO NOTHING;
    END IF;

    IF v_req2 IS NOT NULL THEN
      INSERT INTO ratings (request_id, customer_id, provider_id, stars, comment)
      VALUES (v_req2, v_cust_id, v_prov_id, 4, 'Good service, arrived on time.')
      ON CONFLICT (request_id) DO NOTHING;
    END IF;

    IF v_req3 IS NOT NULL THEN
      INSERT INTO ratings (request_id, customer_id, provider_id, stars, comment)
      VALUES (v_req3, v_cust_id, v_prov_id, 5, 'Clean wiring job and polite behavior.')
      ON CONFLICT (request_id) DO NOTHING;
    END IF;
  END IF;
END $$;
