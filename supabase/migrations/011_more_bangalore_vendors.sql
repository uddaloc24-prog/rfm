-- Migration 011: Expanded Bangalore restaurant seed — 200+ more places.
-- Re-running is safe: ON CONFLICT (slug) DO NOTHING.

INSERT INTO public.vendors
  (id, name, slug, category, neighbourhood, city, lat, lng,
   address_text, status, community_score, daily_count, daily_score,
   total_rating_count, verification_count, created_at)
VALUES

  -- ── Vasudev Adiga's (chain) ──────────────────────────────────────
  (gen_random_uuid(),'Vasudev Adiga''s','vasudev-adigas','mess_tiffin','Koramangala','Bangalore',12.9346,77.6258,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Vasudev Adiga''s Indiranagar','vasudev-adigas-indiranagar','mess_tiffin','Indiranagar','Bangalore',12.9782,77.6400,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Vasudev Adiga''s Malleshwaram','vasudev-adigas-malleshwaram','mess_tiffin','Malleshwaram','Bangalore',13.0015,77.5618,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Vasudev Adiga''s Jayanagar','vasudev-adigas-jayanagar','mess_tiffin','Jayanagar','Bangalore',12.9227,77.5844,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Vasudev Adiga''s BTM','vasudev-adigas-btm','mess_tiffin','BTM Layout','Bangalore',12.9121,77.6171,NULL,'verified',0,0,0,0,0,now()),

  -- ── Empire Restaurant (more locations) ──────────────────────────
  (gen_random_uuid(),'Empire Restaurant BTM','empire-restaurant-btm','restaurant','BTM Layout','Bangalore',12.9118,77.6168,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Empire Restaurant Jayanagar','empire-restaurant-jayanagar','restaurant','Jayanagar','Bangalore',12.9230,77.5844,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Empire Restaurant Malleshwaram','empire-restaurant-malleshwaram','restaurant','Malleshwaram','Bangalore',13.0018,77.5622,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Empire Restaurant Whitefield','empire-restaurant-whitefield','restaurant','Whitefield','Bangalore',12.9698,77.7499,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Empire Restaurant HSR','empire-restaurant-hsr','restaurant','HSR Layout','Bangalore',12.9117,77.6449,NULL,'verified',0,0,0,0,0,now()),

  -- ── Truffles (more locations) ────────────────────────────────────
  (gen_random_uuid(),'Truffles HSR','truffles-hsr','restaurant','HSR Layout','Bangalore',12.9118,77.6448,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Truffles Jayanagar','truffles-jayanagar','restaurant','Jayanagar','Bangalore',12.9224,77.5839,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Truffles Whitefield','truffles-whitefield','restaurant','Whitefield','Bangalore',12.9696,77.7501,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Truffles Bannerghatta','truffles-bannerghatta','restaurant','Bannerghatta Road','Bangalore',12.8904,77.5972,NULL,'verified',0,0,0,0,0,now()),

  -- ── Biryani ──────────────────────────────────────────────────────
  (gen_random_uuid(),'Paradise Biryani','paradise-biryani','restaurant','Indiranagar','Bangalore',12.9775,77.6403,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Paradise Biryani Koramangala','paradise-biryani-koramangala','restaurant','Koramangala','Bangalore',12.9347,77.6260,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Meghana Foods BTM','meghana-foods-btm','restaurant','BTM Layout','Bangalore',12.9122,77.6170,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Meghana Foods Whitefield','meghana-foods-whitefield','restaurant','Whitefield','Bangalore',12.9699,77.7497,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Hyderabadi Biryani House','hyderabadi-biryani-house','restaurant','Koramangala','Bangalore',12.9340,77.6248,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Al Saba Restaurant','al-saba-restaurant','restaurant','Frazer Town','Bangalore',12.9792,77.6181,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Naati Biryani','naati-biryani','restaurant','Koramangala','Bangalore',12.9352,77.6254,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Kolkata Biryani House','kolkata-biryani-house','restaurant','Shivajinagar','Bangalore',12.9838,77.6045,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Royal India Biryani','royal-india-biryani','restaurant','Marathahalli','Bangalore',12.9591,77.7009,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Donne Biryani House','donne-biryani-house','restaurant','HSR Layout','Bangalore',12.9113,77.6447,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Shivaji Military Hotel HSR','shivaji-military-hotel-hsr','mess_tiffin','HSR Layout','Bangalore',12.9114,77.6451,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Shivaji Military Hotel Indiranagar','shivaji-military-hotel-indiranagar','mess_tiffin','Indiranagar','Bangalore',12.9780,77.6397,NULL,'verified',0,0,0,0,0,now()),

  -- ── Third Wave Coffee (more locations) ──────────────────────────
  (gen_random_uuid(),'Third Wave Coffee Koramangala','third-wave-coffee-koramangala','chai_snacks','Koramangala','Bangalore',12.9349,77.6261,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Third Wave Coffee HSR','third-wave-coffee-hsr','chai_snacks','HSR Layout','Bangalore',12.9115,77.6450,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Third Wave Coffee Whitefield','third-wave-coffee-whitefield','chai_snacks','Whitefield','Bangalore',12.9697,77.7503,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Third Wave Coffee Jayanagar','third-wave-coffee-jayanagar','chai_snacks','Jayanagar','Bangalore',12.9225,77.5840,NULL,'verified',0,0,0,0,0,now()),

  -- ── Blue Tokai (more locations) ──────────────────────────────────
  (gen_random_uuid(),'Blue Tokai Koramangala','blue-tokai-koramangala','chai_snacks','Koramangala','Bangalore',12.9351,77.6259,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Blue Tokai Whitefield','blue-tokai-whitefield','chai_snacks','Whitefield','Bangalore',12.9695,77.7505,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Blue Tokai HSR','blue-tokai-hsr','chai_snacks','HSR Layout','Bangalore',12.9112,77.6453,NULL,'verified',0,0,0,0,0,now()),

  -- ── Brewpubs & Bars ──────────────────────────────────────────────
  (gen_random_uuid(),'Toit HSR','toit-hsr','restaurant','HSR Layout','Bangalore',12.9115,77.6449,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Arbor Brewing Company','arbor-brewing-company','restaurant','Indiranagar','Bangalore',12.9772,77.6393,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Ironhill Brewery','ironhill-brewery','restaurant','Electronic City','Bangalore',12.8529,77.6640,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Independence Brewing Company','independence-brewing-company','restaurant','Koramangala','Bangalore',12.9342,77.6244,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'The Bier Library','the-bier-library','restaurant','Koramangala','Bangalore',12.9355,77.6261,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Bflat Bar','bflat-bar','restaurant','MG Road','Bangalore',12.9746,77.6059,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'High Ultra Lounge','high-ultra-lounge','restaurant','MG Road','Bangalore',12.9748,77.6052,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Skyye','skyye','restaurant','UB City','Bangalore',12.9714,77.5963,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Farzi Cafe','farzi-cafe','restaurant','UB City','Bangalore',12.9716,77.5962,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Byg Brewski Sarjapur','byg-brewski-sarjapur','restaurant','Sarjapur Road','Bangalore',12.9077,77.6810,NULL,'verified',0,0,0,0,0,now()),

  -- ── BTM Layout ───────────────────────────────────────────────────
  (gen_random_uuid(),'BTM Chaat Stalls','btm-chaat-stalls','street_food','BTM Layout','Bangalore',12.9120,77.6168,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Hotel Nagarjuna BTM','hotel-nagarjuna-btm','mess_tiffin','BTM Layout','Bangalore',12.9119,77.6172,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Spice Garden BTM','spice-garden-btm','restaurant','BTM Layout','Bangalore',12.9123,77.6174,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Meghana Foods HSR','meghana-foods-hsr','restaurant','HSR Layout','Bangalore',12.9116,77.6446,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Sanman Restaurant BTM','sanman-restaurant-btm','mess_tiffin','BTM Layout','Bangalore',12.9124,77.6175,NULL,'verified',0,0,0,0,0,now()),

  -- ── JP Nagar ─────────────────────────────────────────────────────
  (gen_random_uuid(),'Nandhana Palace JP Nagar','nandhana-palace-jp-nagar','restaurant','JP Nagar','Bangalore',12.9063,77.5981,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Hotel Pai Viceroy JP Nagar','hotel-pai-viceroy-jp-nagar','restaurant','JP Nagar','Bangalore',12.9057,77.5978,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Shanthi Sagar JP Nagar','shanthi-sagar-jp-nagar','mess_tiffin','JP Nagar','Bangalore',12.9061,77.5980,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Chutneys JP Nagar','chutneys-jp-nagar','restaurant','JP Nagar','Bangalore',12.9058,77.5982,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Imperial Restaurant JP Nagar','imperial-restaurant-jp-nagar','restaurant','JP Nagar','Bangalore',12.9064,77.5975,NULL,'verified',0,0,0,0,0,now()),

  -- ── Whitefield ───────────────────────────────────────────────────
  (gen_random_uuid(),'Dialogues Cafe Whitefield','dialogues-cafe-whitefield','chai_snacks','Whitefield','Bangalore',12.9693,77.7508,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Hammered Whitefield','hammered-whitefield','restaurant','Whitefield','Bangalore',12.9700,77.7502,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Windmills Whitefield','windmills-whitefield','restaurant','Whitefield','Bangalore',12.9702,77.7498,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Khan Saheb Whitefield','khan-saheb-whitefield','restaurant','Whitefield','Bangalore',12.9694,77.7506,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Onesta Whitefield','onesta-whitefield','restaurant','Whitefield','Bangalore',12.9691,77.7510,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Hotel Janardhan Whitefield','hotel-janardhan-whitefield','mess_tiffin','Whitefield','Bangalore',12.9696,77.7497,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Angeethi Whitefield','angeethi-whitefield','restaurant','Whitefield','Bangalore',12.9701,77.7504,NULL,'verified',0,0,0,0,0,now()),

  -- ── Marathahalli ─────────────────────────────────────────────────
  (gen_random_uuid(),'Meghana Foods Marathahalli','meghana-foods-marathahalli','restaurant','Marathahalli','Bangalore',12.9588,77.7009,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Empire Restaurant Marathahalli','empire-restaurant-marathahalli','restaurant','Marathahalli','Bangalore',12.9592,77.7007,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Khan Saheb Marathahalli','khan-saheb-marathahalli','restaurant','Marathahalli','Bangalore',12.9585,77.7011,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Hotel Harsha Marathahalli','hotel-harsha-marathahalli','mess_tiffin','Marathahalli','Bangalore',12.9590,77.7005,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Onesta Marathahalli','onesta-marathahalli','restaurant','Marathahalli','Bangalore',12.9587,77.7013,NULL,'verified',0,0,0,0,0,now()),

  -- ── Electronic City / Bannerghatta Road ─────────────────────────
  (gen_random_uuid(),'Truffles Electronic City','truffles-electronic-city','restaurant','Electronic City','Bangalore',12.8531,77.6638,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Nandhana Palace Electronic City','nandhana-palace-electronic-city','restaurant','Electronic City','Bangalore',12.8527,77.6641,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Empire Restaurant Electronic City','empire-restaurant-electronic-city','restaurant','Electronic City','Bangalore',12.8533,77.6635,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Food Street Bannerghatta','food-street-bannerghatta','street_food','Bannerghatta Road','Bangalore',12.8908,77.5975,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Farhat Restaurant','farhat-restaurant','restaurant','Electronic City','Bangalore',12.8525,77.6645,NULL,'verified',0,0,0,0,0,now()),

  -- ── Rajajinagar / Vijayanagar / Rajajinagar ─────────────────────
  (gen_random_uuid(),'CTR Rajajinagar','ctr-rajajinagar','mess_tiffin','Rajajinagar','Bangalore',12.9988,77.5551,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Hotel Tip Top','hotel-tip-top','mess_tiffin','Rajajinagar','Bangalore',12.9985,77.5554,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Sanman Restaurant Rajajinagar','sanman-restaurant-rajajinagar','restaurant','Rajajinagar','Bangalore',12.9987,77.5550,NULL,'verified',0,0,0,0,0,now()),

  -- ── Yeshwanthpur / Hebbal ────────────────────────────────────────
  (gen_random_uuid(),'Meghana Foods Yeshwanthpur','meghana-foods-yeshwanthpur','restaurant','Yeshwanthpur','Bangalore',13.0238,77.5454,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Empire Restaurant Hebbal','empire-restaurant-hebbal','restaurant','Hebbal','Bangalore',13.0421,77.5968,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Nandhana Palace Hebbal','nandhana-palace-hebbal','restaurant','Hebbal','Bangalore',13.0418,77.5970,NULL,'verified',0,0,0,0,0,now()),

  -- ── Yelahanka ────────────────────────────────────────────────────
  (gen_random_uuid(),'Kamath Restaurant Yelahanka','kamath-restaurant-yelahanka','mess_tiffin','Yelahanka','Bangalore',13.1007,77.5963,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Empire Restaurant Yelahanka','empire-restaurant-yelahanka','restaurant','Yelahanka','Bangalore',13.1005,77.5966,NULL,'verified',0,0,0,0,0,now()),

  -- ── Frazer Town / Cox Town ───────────────────────────────────────
  (gen_random_uuid(),'Jewel of India','jewel-of-india','restaurant','Frazer Town','Bangalore',12.9791,77.6177,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Hotel Sharief','hotel-sharief','restaurant','Frazer Town','Bangalore',12.9789,77.6179,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Arabian Hut','arabian-hut','restaurant','Frazer Town','Bangalore',12.9793,77.6173,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Nagarjuna Frazer Town','nagarjuna-frazer-town','restaurant','Frazer Town','Bangalore',12.9787,77.6181,NULL,'verified',0,0,0,0,0,now()),

  -- ── Church Street / Brigade Road ─────────────────────────────────
  (gen_random_uuid(),'Corner House Church Street','corner-house-church-street','restaurant','Church Street','Bangalore',12.9742,77.6071,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Starbucks Brigade Road','starbucks-brigade-road','chai_snacks','Brigade Road','Bangalore',12.9740,77.6071,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Barbeque Nation Brigade Road','barbeque-nation-brigade-road','restaurant','Brigade Road','Bangalore',12.9738,77.6075,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'The Bflat','the-bflat','restaurant','Church Street','Bangalore',12.9744,77.6068,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Paul''s Bakery','pauls-bakery','chai_snacks','Church Street','Bangalore',12.9741,77.6069,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Subway Church Street','subway-church-street','restaurant','Church Street','Bangalore',12.9739,77.6072,NULL,'verified',0,0,0,0,0,now()),

  -- ── South Indian chains ──────────────────────────────────────────
  (gen_random_uuid(),'Chutneys Indiranagar','chutneys-indiranagar','restaurant','Indiranagar','Bangalore',12.9776,77.6402,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Chutneys Koramangala','chutneys-koramangala','restaurant','Koramangala','Bangalore',12.9348,77.6256,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Chutneys Malleshwaram','chutneys-malleshwaram','restaurant','Malleshwaram','Bangalore',13.0017,77.5619,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Nandhana Palace Koramangala','nandhana-palace-koramangala','restaurant','Koramangala','Bangalore',12.9341,77.6243,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Nandhana Palace Indiranagar','nandhana-palace-indiranagar','restaurant','Indiranagar','Bangalore',12.9778,77.6406,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Shanthi Sagar Koramangala','shanthi-sagar-koramangala','mess_tiffin','Koramangala','Bangalore',12.9345,77.6250,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Shanthi Sagar Indiranagar','shanthi-sagar-indiranagar','mess_tiffin','Indiranagar','Bangalore',12.9774,77.6398,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Sri Sagar Restaurant','sri-sagar-restaurant','mess_tiffin','Basavanagudi','Bangalore',12.9441,77.5748,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Guru Prasad Hotel','guru-prasad-hotel','mess_tiffin','Malleshwaram','Bangalore',13.0008,77.5613,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Hotel Swagath','hotel-swagath','mess_tiffin','Indiranagar','Bangalore',12.9781,77.6404,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Hotel Pai Viceroy Koramangala','hotel-pai-viceroy-koramangala','restaurant','Koramangala','Bangalore',12.9343,77.6246,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Hotel Pai Viceroy Indiranagar','hotel-pai-viceroy-indiranagar','restaurant','Indiranagar','Bangalore',12.9773,77.6395,NULL,'verified',0,0,0,0,0,now()),

  -- ── North Indian ─────────────────────────────────────────────────
  (gen_random_uuid(),'Khan Saheb Koramangala','khan-saheb-koramangala','restaurant','Koramangala','Bangalore',12.9353,77.6264,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Khan Saheb Indiranagar','khan-saheb-indiranagar','restaurant','Indiranagar','Bangalore',12.9768,77.6393,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Delhi Highway','delhi-highway','restaurant','Koramangala','Bangalore',12.9344,77.6241,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Punjabi Rasoi','punjabi-rasoi','restaurant','Indiranagar','Bangalore',12.9783,77.6402,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Angeethi Koramangala','angeethi-koramangala','restaurant','Koramangala','Bangalore',12.9338,77.6236,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Angeethi Indiranagar','angeethi-indiranagar','restaurant','Indiranagar','Bangalore',12.9771,77.6392,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Tandoor Square','tandoor-square','restaurant','Koramangala','Bangalore',12.9349,77.6253,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Kabab Magic Indiranagar','kabab-magic-indiranagar','restaurant','Indiranagar','Bangalore',12.9769,77.6391,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Rajdhani Restaurant','rajdhani-restaurant','restaurant','UB City','Bangalore',12.9713,77.5959,NULL,'verified',0,0,0,0,0,now()),

  -- ── Chinese / Asian ──────────────────────────────────────────────
  (gen_random_uuid(),'Chinese Room','chinese-room','restaurant','Indiranagar','Bangalore',12.9767,77.6394,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Mainland China Koramangala','mainland-china-koramangala','restaurant','Koramangala','Bangalore',12.9342,77.6240,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'The Fatty Bao Koramangala','the-fatty-bao-koramangala','restaurant','Koramangala','Bangalore',12.9347,77.6249,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Hao Shi Restaurant','hao-shi-restaurant','restaurant','Indiranagar','Bangalore',12.9778,77.6408,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Chopsticks Indiranagar','chopsticks-indiranagar','restaurant','Indiranagar','Bangalore',12.9776,77.6406,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Noodle House','noodle-house','restaurant','Koramangala','Bangalore',12.9340,77.6237,NULL,'verified',0,0,0,0,0,now()),

  -- ── Pizza ────────────────────────────────────────────────────────
  (gen_random_uuid(),'Brik Oven HSR','brik-oven-hsr','restaurant','HSR Layout','Bangalore',12.9113,77.6446,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'La Pino''z Pizza Koramangala','la-pinoz-pizza-koramangala','restaurant','Koramangala','Bangalore',12.9356,77.6266,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Slice of Italy','slice-of-italy','restaurant','Indiranagar','Bangalore',12.9769,77.6399,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Italian Bay','italian-bay','restaurant','Koramangala','Bangalore',12.9341,77.6239,NULL,'verified',0,0,0,0,0,now()),

  -- ── Desserts & Ice Cream ─────────────────────────────────────────
  (gen_random_uuid(),'Corner House BTM','corner-house-btm','chai_snacks','BTM Layout','Bangalore',12.9120,77.6169,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Corner House HSR','corner-house-hsr','chai_snacks','HSR Layout','Bangalore',12.9111,77.6451,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Corner House Koramangala','corner-house-koramangala','chai_snacks','Koramangala','Bangalore',12.9352,77.6257,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Corner House Malleshwaram','corner-house-malleshwaram','chai_snacks','Malleshwaram','Bangalore',13.0009,77.5616,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Frozen Bottle','frozen-bottle','chai_snacks','Koramangala','Bangalore',12.9354,77.6263,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Naturals Ice Cream','naturals-ice-cream','chai_snacks','Indiranagar','Bangalore',12.9780,77.6404,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Scoops Ice Cream','scoops-ice-cream','chai_snacks','Indiranagar','Bangalore',12.9774,77.6396,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Theobroma','theobroma','chai_snacks','Koramangala','Bangalore',12.9346,77.6246,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Just Baked','just-baked','chai_snacks','Indiranagar','Bangalore',12.9766,77.6394,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Anand Sweets & Savouries','anand-sweets-savouries','chai_snacks','Jayanagar','Bangalore',12.9224,77.5841,NULL,'verified',0,0,0,0,0,now()),

  -- ── Cafes ────────────────────────────────────────────────────────
  (gen_random_uuid(),'Dyu Art Cafe','dyu-art-cafe','chai_snacks','Koramangala','Bangalore',12.9338,77.6234,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Dialogues Cafe Indiranagar','dialogues-cafe-indiranagar','chai_snacks','Indiranagar','Bangalore',12.9775,77.6402,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Cafe Azzure','cafe-azzure','chai_snacks','Koramangala','Bangalore',12.9345,77.6248,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Araku Coffee','araku-coffee','chai_snacks','Indiranagar','Bangalore',12.9768,77.6398,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Cafe Terra','cafe-terra','chai_snacks','Koramangala','Bangalore',12.9343,77.6252,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'The Hole in the Wall Cafe Koramangala','hole-in-wall-koramangala','chai_snacks','Koramangala','Bangalore',12.9351,77.6257,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Kulmane Coffee Indiranagar','kulmane-coffee-indiranagar','chai_snacks','Indiranagar','Bangalore',12.9782,77.6406,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Bohemian Square','bohemian-square','chai_snacks','Koramangala','Bangalore',12.9346,77.6253,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Starbucks Koramangala','starbucks-koramangala','chai_snacks','Koramangala','Bangalore',12.9355,77.6261,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Starbucks HSR','starbucks-hsr','chai_snacks','HSR Layout','Bangalore',12.9114,77.6449,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Starbucks Whitefield','starbucks-whitefield','chai_snacks','Whitefield','Bangalore',12.9698,77.7500,NULL,'verified',0,0,0,0,0,now()),

  -- ── Basavanagudi / Jayanagar / South Bangalore ──────────────────
  (gen_random_uuid(),'Vidyarthi Bhavan Jayanagar','vidyarthi-bhavan-jayanagar','mess_tiffin','Jayanagar','Bangalore',12.9224,77.5840,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Ram Ashraya','ram-ashraya','mess_tiffin','Basavanagudi','Bangalore',12.9437,77.5742,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Indian Coffee House','indian-coffee-house','chai_snacks','MG Road','Bangalore',12.9749,77.6052,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Lakshmi Tiffin Room','lakshmi-tiffin-room','mess_tiffin','Basavanagudi','Bangalore',12.9439,77.5741,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Hotel Dwaraka','hotel-dwaraka','mess_tiffin','Malleshwaram','Bangalore',13.0007,77.5615,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Hotel Hari Prasad','hotel-hari-prasad','mess_tiffin','Basavanagudi','Bangalore',12.9438,77.5743,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Sri Krishna Tiffin Room','sri-krishna-tiffin-room','mess_tiffin','Jayanagar','Bangalore',12.9221,77.5837,NULL,'verified',0,0,0,0,0,now()),

  -- ── Popular newer restaurants ────────────────────────────────────
  (gen_random_uuid(),'Monkey Bar','monkey-bar','restaurant','Indiranagar','Bangalore',12.9777,77.6400,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'The Fatty Bao HSR','the-fatty-bao-hsr','restaurant','HSR Layout','Bangalore',12.9116,77.6449,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Lupa','lupa','restaurant','Koramangala','Bangalore',12.9342,77.6242,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Rim Naam','rim-naam','restaurant','Indiranagar','Bangalore',12.9771,77.6391,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Braai The Barbeque Nation','braai-the-barbeque','restaurant','HSR Layout','Bangalore',12.9119,77.6453,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Kokoon','kokoon','restaurant','Koramangala','Bangalore',12.9350,77.6244,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Miso Hungry','miso-hungry','restaurant','Indiranagar','Bangalore',12.9770,77.6395,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Chilli Vanilla','chilli-vanilla','restaurant','Indiranagar','Bangalore',12.9768,77.6393,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Two One Two Bar & Grill','two-one-two-bar-grill','restaurant','Indiranagar','Bangalore',12.9775,77.6399,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'The Only Place','the-only-place','restaurant','MG Road','Bangalore',12.9744,77.6056,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'The Fatty Bao Indiranagar','the-fatty-bao-indiranagar','restaurant','Indiranagar','Bangalore',12.9771,77.6397,NULL,'verified',0,0,0,0,0,now()),

  -- ── Street Food ──────────────────────────────────────────────────
  (gen_random_uuid(),'Koramangala Food Street','koramangala-food-street','street_food','Koramangala','Bangalore',12.9353,77.6258,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Malleshwaram Market Food','malleshwaram-market-food','street_food','Malleshwaram','Bangalore',13.0011,77.5624,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Indiranagar Chaat Corner','indiranagar-chaat-corner','street_food','Indiranagar','Bangalore',12.9779,77.6397,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Avenue Road Pav Bhaji','avenue-road-pav-bhaji','street_food','Avenue Road','Bangalore',12.9733,77.5811,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Pao Bhaji Stall Koramangala','pao-bhaji-stall-koramangala','street_food','Koramangala','Bangalore',12.9347,77.6255,NULL,'verified',0,0,0,0,0,now()),

  -- ── Sarjapur Road / Outer Ring Road ──────────────────────────────
  (gen_random_uuid(),'Meghana Foods Sarjapur','meghana-foods-sarjapur','restaurant','Sarjapur Road','Bangalore',12.9075,77.6812,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Empire Restaurant Sarjapur','empire-restaurant-sarjapur','restaurant','Sarjapur Road','Bangalore',12.9078,77.6809,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Truffles Sarjapur','truffles-sarjapur','restaurant','Sarjapur Road','Bangalore',12.9076,77.6813,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Dialougues Cafe Sarjapur','dialogues-cafe-sarjapur','chai_snacks','Sarjapur Road','Bangalore',12.9073,77.6815,NULL,'verified',0,0,0,0,0,now()),

  -- ── Miscellaneous popular places ────────────────────────────────
  (gen_random_uuid(),'The Box Kitchen & Bar','the-box-kitchen-bar','restaurant','Koramangala','Bangalore',12.9340,77.6236,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Pot Pourri','pot-pourri','restaurant','Koramangala','Bangalore',12.9348,77.6246,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Namma Bengaluru','namma-bengaluru','restaurant','MG Road','Bangalore',12.9743,77.6049,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'The Tao Terrrace','the-tao-terrace','restaurant','MG Road','Bangalore',12.9745,77.6053,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Indijoe','indijoe','restaurant','Koramangala','Bangalore',12.9341,77.6241,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Chili''s Koramangala','chilis-koramangala','restaurant','Koramangala','Bangalore',12.9344,77.6258,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'The Humming Tree HSR','the-humming-tree-hsr','restaurant','HSR Layout','Bangalore',12.9112,77.6447,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Wok In The Clouds','wok-in-the-clouds','restaurant','Indiranagar','Bangalore',12.9772,77.6395,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Toscano','toscano','restaurant','UB City','Bangalore',12.9716,77.5963,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Lantern Indiranagar','lantern-indiranagar','restaurant','Indiranagar','Bangalore',12.9770,77.6395,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Eatsome','eatsome','restaurant','Indiranagar','Bangalore',12.9784,77.6410,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Ants Cafe','ants-cafe','chai_snacks','Indiranagar','Bangalore',12.9769,77.6392,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Smoke House Deli','smoke-house-deli','restaurant','Koramangala','Bangalore',12.9353,77.6265,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Loft 38','loft-38','restaurant','Koramangala','Bangalore',12.9346,77.6262,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Biere Club','biere-club','restaurant','Lavelle Road','Bangalore',12.9719,77.5973,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Caperberry','caperberry','restaurant','Lavelle Road','Bangalore',12.9720,77.5976,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Toscano Indiranagar','toscano-indiranagar','restaurant','Indiranagar','Bangalore',12.9773,77.6396,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'The Curry House','the-curry-house','restaurant','HSR Layout','Bangalore',12.9118,77.6454,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Biryani House Indiranagar','biryani-house-indiranagar','restaurant','Indiranagar','Bangalore',12.9783,77.6407,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Taste of Bengal','taste-of-bengal','restaurant','Frazer Town','Bangalore',12.9794,77.6176,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Hotel Harsha Koramangala','hotel-harsha-koramangala','mess_tiffin','Koramangala','Bangalore',12.9349,77.6254,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Sri Udupi Park','sri-udupi-park','mess_tiffin','Indiranagar','Bangalore',12.9777,77.6401,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Spiga','spiga','restaurant','Indiranagar','Bangalore',12.9767,77.6389,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Hoppipola Indiranagar','hoppipola-indiranagar','restaurant','Indiranagar','Bangalore',12.9776,77.6403,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Daddy''s Deli','daddys-deli','restaurant','Indiranagar','Bangalore',12.9775,77.6400,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Tawakkal Shawarma','tawakkal-shawarma','street_food','Frazer Town','Bangalore',12.9790,77.6180,NULL,'verified',0,0,0,0,0,now()),
  (gen_random_uuid(),'Shivanna Tiffin Room','shivanna-tiffin-room','mess_tiffin','Koramangala','Bangalore',12.9346,77.6244,NULL,'verified',0,0,0,0,0,now())

ON CONFLICT (slug) DO NOTHING;
