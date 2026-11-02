-- Season 4: playoff games level after 10 minutes are settled by a TGT. Record the winner on the match.
alter table matches add column if not exists tgt_winner_id uuid references captains(id) on delete set null;

-- Optional check: if this returns a CHECK on matches.round, make sure it allows the new slot codes
-- (W1A-W1D, W2A, W2B, WF, L1A, L1B, L2A, L2B, L3, LF, GF, RF).
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'matches'::regclass;
