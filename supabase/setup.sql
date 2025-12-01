create table if not exists survey_snapshots (
  id uuid primary key default gen_random_uuid(),
  survey_id text not null,
  snapshot jsonb not null,
  summary jsonb generated always as (
    jsonb_build_object(
      'totalResponses', snapshot->>'totalResponses',
      'completionRate', snapshot->>'completionRate',
      'updatedAt', snapshot->>'updatedAt'
    )
  ) stored,
  created_at timestamptz not null default now()
);

create index if not exists survey_snapshots_survey_id_created_at_idx
  on survey_snapshots (survey_id, created_at desc);
