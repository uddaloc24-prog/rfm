-- ============================================================
-- Seed Data — Bangalore Vendors
-- ============================================================

insert into public.vendors (
  name, slug, category, known_for, open_since, hours, price_range,
  lat, lng, address_text, neighbourhood, city, status,
  verification_count, community_score, daily_count, daily_score, total_rating_count
) values
(
  'Shantamma Dosa Stall',
  'shantamma-dosa-stall',
  'street_food',
  'Ghee masala dosa',
  1987,
  '6:30 AM – 11 AM',
  '₹40–₹80',
  12.9281, 77.5836,
  'Near BDA Complex, Jayanagar 4th Block',
  'Jayanagar 4th Block',
  'Bangalore',
  'verified',
  38, 9.4, 247, 9.4, 1842
),
(
  'Trupthi Mess',
  'trupthi-mess',
  'mess_tiffin',
  'Thali & ragi mudde',
  2004,
  '7 AM – 3 PM, 7 PM – 10 PM',
  '₹80–₹140',
  13.0057, 77.5648,
  'Malleswaram 8th Cross, Near Mantri Mall',
  'Malleswaram 8th Cross',
  'Bangalore',
  'verified',
  24, 9.1, 183, 9.1, 1204
),
(
  'Idli Ashok',
  'idli-ashok',
  'mess_tiffin',
  'Rava idli',
  1993,
  '7 AM – 12 PM',
  '₹30–₹60',
  12.9765, 77.6033,
  'Near Brigade Junction, MG Road',
  'MG Road, Brigade Junction',
  'Bangalore',
  'verified',
  31, 8.9, 156, 8.9, 987
),
(
  'Ramanna Chai',
  'ramanna-chai',
  'chai_snacks',
  'Masala chai',
  2010,
  '6 AM – 9 PM',
  '₹10–₹30',
  12.9352, 77.6245,
  '5th Block, Near Forum Mall, Koramangala',
  'Koramangala 5th Block',
  'Bangalore',
  'verified',
  19, 8.7, 134, 8.7, 743
),
(
  'Kamath Udupi',
  'kamath-udupi',
  'restaurant',
  'Bisi bele bath',
  1978,
  '8 AM – 10 PM',
  '₹120–₹250',
  12.9784, 77.6408,
  '12th Main, HAL 2nd Stage, Indiranagar',
  'Indiranagar 12th Main',
  'Bangalore',
  'verified',
  42, 8.5, 98, 8.5, 2156
);
