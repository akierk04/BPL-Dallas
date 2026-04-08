-- BPL Dallas Supabase Schema
-- Run this in your Supabase SQL editor

-- Captains table
create table captains (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password text not null,
  name text not null,
  group_name text not null check (group_name in ('A', 'B', 'C')),
  wallet integer not null,
  created_at timestamp with time zone default now()
);

-- Players table (managed by admin)
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_name text not null check (group_name in ('A', 'B', 'C')),
  base_price integer not null,
  captain_id uuid references captains(id) on delete set null,
  sold_price integer,
  is_sold boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable realtime on both tables
alter publication supabase_realtime add table captains;
alter publication supabase_realtime add table players;

-- Disable RLS for simplicity (app handles auth manually)
alter table captains disable row level security;
alter table players disable row level security;

-- Seed captains
insert into captains (username, password, name, group_name, wallet) values
  ('Aashay',  'Aashay123',  'Aashay',  'A', 800),
  ('SohamM',  'SohamM123',  'Soham M', 'A', 800),
  ('Nayen',   'Nayen123',   'Nayen',   'B', 1000),
  ('Vedant',  'Vedant123',  'Vedant',  'B', 1000),
  ('Aryan',   'Aryan123',   'Aryan',   'C', 1200),
  ('Tushar',  'Tushar123',  'Tushar',  'C', 1200);
