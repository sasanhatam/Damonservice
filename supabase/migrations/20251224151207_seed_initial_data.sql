/*
  # Seed Initial Users and Devices

  1. Create initial admin and employee users
  2. Create initial device entries for each category
*/

DO $$
DECLARE
  cat_vrf_id uuid;
  cat_chillers_id uuid;
  cat_ahu_id uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO cat_vrf_id FROM categories WHERE name = 'VRF Systems' LIMIT 1;
  SELECT id INTO cat_chillers_id FROM categories WHERE name = 'Chillers' LIMIT 1;
  SELECT id INTO cat_ahu_id FROM categories WHERE name = 'Air Handling Units (AHU)' LIMIT 1;

  -- Insert users if they don't exist
  INSERT INTO users (username, password, full_name, role, is_active)
  VALUES
    ('admin', 'admin', 'مدیر سیستم', 'admin', true),
    ('ali', '123', 'علی محمدی', 'employee', true),
    ('sara', '123', 'سارا رضایی', 'employee', true)
  ON CONFLICT (username) DO NOTHING;

  -- Insert devices if they don't exist
  INSERT INTO devices (model_name, category_id, is_active, factory_price_eur, length, weight)
  VALUES
    ('VRF-Outdoor-20HP', cat_vrf_id, true, 15000, 2.5, 400),
    ('VRF-Indoor-Cassette', cat_vrf_id, true, 800, 0.8, 30),
    ('Screw-Chiller-100T', cat_chillers_id, true, 45000, 4.0, 2500),
    ('Scroll-Chiller-Mini', cat_chillers_id, true, 12000, 1.5, 600),
    ('AHU-Industrial-5000', cat_ahu_id, true, 8000, 3.0, 900),
    ('AHU-Hygienic-2000', cat_ahu_id, true, 11000, 2.2, 750)
  ON CONFLICT DO NOTHING;
END $$;
