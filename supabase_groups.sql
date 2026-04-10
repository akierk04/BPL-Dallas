-- Add tournament_group column to captains
alter table captains add column if not exists tournament_group text check (tournament_group in ('1','2'));

-- Assign groups based on random draw
update captains set tournament_group = '1' where name in ('Abhay','Vedant','Nayen','Soham M');
update captains set tournament_group = '2' where name in ('Aryan','Tushar','Aashay','Swapnil');

-- Clear existing unplayed league fixtures (if any from previous seed)
delete from matches where played = false and is_knockout = false;

-- Seed Group 1 fixtures
insert into matches (home_captain_id, away_captain_id, home_score, away_score, played, is_knockout, knockout_label)
select h.id, a.id, 0, 0, false, false, null
from
  (values
    ('Abhay','Vedant'),('Abhay','Nayen'),('Abhay','Soham M'),
    ('Vedant','Nayen'),('Vedant','Soham M'),('Nayen','Soham M')
  ) as f(h,a)
join captains h on h.name = f.h
join captains a on a.name = f.a;

-- Seed Group 2 fixtures
insert into matches (home_captain_id, away_captain_id, home_score, away_score, played, is_knockout, knockout_label)
select h.id, a.id, 0, 0, false, false, null
from
  (values
    ('Aryan','Tushar'),('Aryan','Aashay'),('Aryan','Swapnil'),
    ('Tushar','Aashay'),('Tushar','Swapnil'),('Aashay','Swapnil')
  ) as f(h,a)
join captains h on h.name = f.h
join captains a on a.name = f.a;

-- Update passwords
update captains set password = 'AashayA'  where username = 'Aashay';
update captains set password = 'SohamMA'  where username = 'SohamM';
update captains set password = 'NayenB'   where username = 'Nayen';
update captains set password = 'VedantB'  where username = 'Vedant';
update captains set password = 'AbhayB'   where username = 'Abhay';
update captains set password = 'AryanC'   where username = 'Aryan';
update captains set password = 'TusharC'  where username = 'Tushar';
update captains set password = 'SwapnilC' where username = 'Swapnil';
