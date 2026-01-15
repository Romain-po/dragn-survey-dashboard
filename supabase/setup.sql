-- 1. Snapshots Table
create table if not exists survey_snapshots (
  id uuid primary key default gen_random_uuid(),
  survey_id text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists survey_snapshots_survey_id_created_at_idx
  on survey_snapshots (survey_id, created_at desc);

-- 2. Raw Data Table
create table if not exists survey_raw_data (
  id uuid primary key default gen_random_uuid(),
  collector_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists survey_raw_data_collector_id_updated_at_idx
  on survey_raw_data (collector_id, updated_at desc);

-- 3. Enable RLS (Row Level Security)
alter table survey_snapshots enable row level security;
alter table survey_raw_data enable row level security;

-- 4. Create Policies
-- Deny public access
create policy "Deny public access" on survey_snapshots for all using (false);
create policy "Deny public access" on survey_raw_data for all using (false);

-- 5. Auth Setup (Optional, manual user creation)
-- You can create users manually in Supabase Dashboard > Authentication > Users
