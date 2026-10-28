-- Migration 009: Advanced Gig Details & Per-Gig Banners
ALTER TABLE provider_services 
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Drop unique constraint on (provider_id, category_id) so a provider can offer multiple specialized gigs per category
ALTER TABLE provider_services DROP CONSTRAINT IF EXISTS provider_services_provider_id_category_id_key;
