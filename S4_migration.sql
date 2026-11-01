-- BPL Dallas Season 4: auction queue migration
-- Run once in the Supabase SQL Editor BEFORE the auction.
--
-- unsold_at is the queue marker for "unsold players go to the back of the queue".
--   NULL      = never offered (drawn at random first)
--   timestamp = went unsold; returns after every fresh player has been offered,
--               oldest-unsold first
-- Nothing else in the schema changes. This is additive and does not touch bidding_state.

alter table players add column if not exists unsold_at timestamptz;


-- ─────────────────────────────────────────────────────────────
-- Season 4 data setup. COMMENTED OUT ON PURPOSE.
-- Run these only AFTER Season 3 is archived (hall_of_fame / archive_* tables),
-- because they overwrite live auction data. Adjust to however you normally reset a season.
--
-- Purse is stored in whole $M: 60 = $60M. Base price is 5 = $5M.
-- group_name is a legacy column; S4 uses the constant '1' so constraints keep passing.
--
-- update captains set wallet = 60;
-- update players set base_price = 5, group_name = '1',
--   is_sold = false, captain_id = null, sold_price = null, sold_at = null, unsold_at = null;
-- ─────────────────────────────────────────────────────────────
