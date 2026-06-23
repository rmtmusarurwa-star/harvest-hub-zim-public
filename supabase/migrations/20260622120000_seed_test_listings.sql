-- Test data so the marketplace, search_listings/get_market_price tools, and
-- the Harvest AI agent have something real to find — not a permanent fixture,
-- just enough variety across categories/locations/prices to exercise the app.
-- All tied to the signed-in account's own profile id so RLS/ownership checks
-- (edit/delete on your own listings, etc.) behave normally during testing.

insert into public.listings
  (farmer_id, title, category, quantity, unit, price, location, province, description, status)
values
  ('71b9b749-9c90-4155-a837-93f8f491be51', 'White Maize', 'grain', 12000, 'kg', 0.38, 'Chinhoyi', 'Mashonaland West', 'Fresh harvest, dry and graded, ready for collection.', 'active'),
  ('71b9b749-9c90-4155-a837-93f8f491be51', 'Soya Beans', 'grain', 4000, 'kg', 0.72, 'Norton', 'Mashonaland West', 'Certified seed-grade soya, moisture tested.', 'active'),
  ('71b9b749-9c90-4155-a837-93f8f491be51', 'Broiler Chickens (live)', 'poultry', 480, 'bird', 6.40, 'Harare', 'Harare', 'Day-42 broilers, average 2.1kg live weight.', 'active'),
  ('71b9b749-9c90-4155-a837-93f8f491be51', 'Road Runner Chickens', 'poultry', 120, 'bird', 8.00, 'Harare', 'Harare', 'Free-range indigenous breed, vaccinated.', 'active'),
  ('71b9b749-9c90-4155-a837-93f8f491be51', 'Beef Cattle (live)', 'livestock', 18, 'head', 480.00, 'Gweru', 'Midlands', 'Grade A steers, grass-fed, ready for slaughter.', 'active'),
  ('71b9b749-9c90-4155-a837-93f8f491be51', 'Weaner Pigs', 'livestock', 30, 'head', 55.00, 'Marondera', 'Mashonaland East', '8-week weaners, large white cross.', 'active'),
  ('71b9b749-9c90-4155-a837-93f8f491be51', 'Fresh Tomatoes', 'produce', 850, 'kg', 1.10, 'Mutare', 'Manicaland', 'Roma variety, harvested this week.', 'active'),
  ('71b9b749-9c90-4155-a837-93f8f491be51', 'Tomatoes', 'produce', 300, 'crate', 12.50, 'Mbare Musika', 'Harare', 'Bulk crates, good for resellers.', 'active'),
  ('71b9b749-9c90-4155-a837-93f8f491be51', 'Butternut Squash', 'produce', 600, 'kg', 0.45, 'Bulawayo', 'Bulawayo', 'Large butternuts, export grade.', 'active'),
  ('71b9b749-9c90-4155-a837-93f8f491be51', 'Avocados (Hass)', 'produce', 2000, 'kg', 3.10, 'Chipinge', 'Manicaland', 'Export-grade Hass avocados, ready to pick.', 'active'),
  ('71b9b749-9c90-4155-a837-93f8f491be51', 'Raw Cow Milk', 'dairy', 1200, 'liter', 0.70, 'Nyamandlovu', 'Matabeleland North', 'Daily supply available, can deliver locally.', 'active'),
  ('71b9b749-9c90-4155-a837-93f8f491be51', 'Free Range Eggs', 'dairy', 150, 'tray', 4.50, 'Norton', 'Mashonaland West', 'Trays of 30, brown shell.', 'active'),
  ('71b9b749-9c90-4155-a837-93f8f491be51', 'Onions', 'produce', 420, 'bag', 27.00, 'Harare', 'Harare', '50kg bags, red onions, well cured.', 'active'),
  ('71b9b749-9c90-4155-a837-93f8f491be51', 'Cotton Seed', 'other', 3000, 'kg', 0.55, 'Gokwe', 'Midlands', 'Certified seed cotton, current season.', 'active'),
  ('71b9b749-9c90-4155-a837-93f8f491be51', 'Wheat', 'grain', 5000, 'kg', 0.31, 'Featherstone', 'Mashonaland Central', 'Winter wheat, combine-harvested.', 'active');
