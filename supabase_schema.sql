-- BPL Dallas Supabase Schema v2
-- Run this in your Supabase SQL editor
-- If you already ran v1, run the RESET block first, then the rest.

-- ── RESET (run if re-running) ──
truncate table players restart identity cascade;
truncate table captains restart identity cascade;

-- ── TABLES ──
create table if not exists captains (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password text not null,
  name text not null,
  group_name text not null check (group_name in ('A', 'B', 'C')),
  wallet integer not null,
  created_at timestamp with time zone default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_name text not null check (group_name in ('A', 'B', 'C')),
  base_price integer not null,
  captain_id uuid references captains(id) on delete set null,
  sold_price integer,
  is_sold boolean default false,
  created_at timestamp with time zone default now()
);

-- ── REALTIME ──
alter publication supabase_realtime add table captains;
alter publication supabase_realtime add table players;

-- ── DISABLE RLS ──
alter table captains disable row level security;
alter table players disable row level security;

-- ── SEED CAPTAINS ──
insert into captains (username, password, name, group_name, wallet) values
  ('Aashay',  'Aashay123',  'Aashay',  'A', 800),
  ('SohamM',  'SohamM123',  'Soham M', 'A', 800),
  ('Nayen',   'Nayen123',   'Nayen',   'B', 1000),
  ('Vedant',  'Vedant123',  'Vedant',  'B', 1000),
  ('Aryan',   'Aryan123',   'Aryan',   'C', 1200),
  ('Tushar',  'Tushar123',  'Tushar',  'C', 1200);

-- ── SEED PLAYERS (28 pool players, captains excluded) ──
-- Group A (base price 200)
insert into players (name, group_name, base_price) values
  ('Akhil R',     'A', 200),
  ('Sehjbir (T)', 'A', 200),
  ('Thomson',     'A', 200),
  ('Thannir',     'A', 200),
  ('Karthik',     'A', 200),
  ('Oneil',       'A', 200),
  ('DJ',          'A', 200),
  ('Rachit',      'A', 200),
  ('Subodh',      'A', 200);

-- Group B (base price 100)
insert into players (name, group_name, base_price) values
  ('Kiran',       'B', 100),
  ('Jose',        'B', 100),
  ('Steve',       'B', 100),
  ('Abhishek K',  'B', 100),
  ('Zafi',        'B', 100),
  ('Soham B',     'B', 100),
  ('Anoop',       'B', 100),
  ('Sharan',      'B', 100),
  ('Sanjith',     'B', 100),
  ('Abhay',       'B', 100);

-- Group C (base price 50)
insert into players (name, group_name, base_price) values
  ('Nihaal (T)',  'C', 50),
  ('Chinmay',     'C', 50),
  ('Akshai',      'C', 50),
  ('Swapnil',     'C', 50),
  ('Moksh',       'C', 50),
  ('Rohit',       'C', 50),
  ('Shrivatsa',   'C', 50),
  ('Yash S',      'C', 50),
  ('Pranav',      'C', 50);
