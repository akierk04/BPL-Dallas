-- BPL Dallas Season 4: auction queue migration
-- Run once in the Supabase SQL Editor BEFORE the auction.
--
-- unsold_at is the queue marker for "unsold players go to the back of the queue".
--   NULL      = never offered (drawn at random first)
--   timestamp = went unsold; returns after every fresh player has been offered,
--               oldest-unsold first
-- Nothing else in the schema changes. This is additive and does not touch bidding_state.

alter table players add column if not exists unsold_at timestamptz;

-- is_top marks top-skill players. Draw Next Player mixes them in between regular draws (see draw-logic.js).
alter table players add column if not exists is_top boolean not null default false;


-- ─────────────────────────────────────────────────────────────
-- Season 4 data setup. COMMENTED OUT ON PURPOSE.
-- Run these only AFTER Season 3 is archived (hall_of_fame / archive_* tables),
-- because they overwrite live auction data. Adjust to however you normally reset a season.
--
-- Purse is stored in whole $M: 100 = $100M. Base price is 10 = $10M.
-- group_name is a legacy column; S4 uses the constant '1' so constraints keep passing.
--
-- update captains set wallet = 100;
-- update players set base_price = 10, group_name = '1',
--   is_sold = false, captain_id = null, sold_price = null, sold_at = null, unsold_at = null;
-- ─────────────────────────────────────────────────────────────
