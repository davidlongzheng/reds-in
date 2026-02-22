-- Reds In - Database Migration
-- Run this in your Supabase SQL Editor

-- rooms
create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'lobby',
  current_question_index int default 0,
  question_order jsonb,
  question_deadline timestamptz,
  created_at timestamptz default now()
);

-- players
create table players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  name text not null,
  score int default 0,
  created_at timestamptz default now()
);

-- questions
create table questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  player_id uuid references players(id),
  text text not null,
  number int not null,
  created_at timestamptz default now()
);

-- votes
create table votes (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  player_id uuid references players(id),
  vote text not null check (vote in ('red', 'black')),
  created_at timestamptz default now(),
  unique(question_id, player_id)
);

-- Enable RLS on all tables with permissive policies (public game, no auth)
alter table rooms enable row level security;
alter table players enable row level security;
alter table questions enable row level security;
alter table votes enable row level security;

create policy "rooms_all" on rooms for all using (true) with check (true);
create policy "players_all" on players for all using (true) with check (true);
create policy "questions_all" on questions for all using (true) with check (true);
create policy "votes_all" on votes for all using (true) with check (true);

-- After running this migration, enable Realtime on all 4 tables:
-- Go to Database → Replication and enable realtime for rooms, players, questions, votes
