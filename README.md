## Drag'n Survey Dashboard

One-page dashboard that reads the Drag'n Survey API and turns responses into a clean visual report. The integration follows the official API guide ([developer.dragnsurvey.com](https://developer.dragnsurvey.com/)). Everything (hosting + database) relies on free tiers.

### Stack & features

- **Next.js 15 + App Router** for SSR, easy API routes and upcoming auth.
- **Tailwind CSS v4** for a small, themeable UI footprint.
- **SWR + Recharts** to keep charts live without heavy polling.
- **Supabase (free Postgres)** optional cache of the latest snapshot.
- Mock data fallback so the UI works even without real credentials.

### Quick start

```bash
npm install
cp .env.example .env.local   # fill in the Drag'n Survey + Supabase values
npm run dev                  # http://localhost:3000
```

Environment variables:

| Name | Description |
| --- | --- |
| `DRAGNSURVEY_API_BASE_URL` | Defaults to `https://developer.dragnsurvey.com/api/v2.0.0`. Change it only if support gives you another cluster. |
| `DRAGNSURVEY_COLLECTOR_ID` | The collector ID from your survey (found in the distribution/diffusion section). |
| `DRAGNSURVEY_API_KEY` | API token that has access to the collector responses. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Optional. Enables caching snapshots in `survey_snapshots`. |

### Optional Supabase cache

1. Create a free Supabase project.
2. Enable the `pgcrypto` extension (required for `gen_random_uuid()`).
3. Run `supabase/setup.sql` or paste its content in the SQL editor.
4. Paste the Supabase URL + service role key inside `.env.local`.

Each time the API route fetches Drag'n Survey data it also writes a snapshot to Supabase. When Drag'n Survey is unreachable the API automatically falls back to the latest cached snapshot.

### Deployment (zero-cost)

| Piece | Service | Notes |
| --- | --- | --- |
| Frontend + API | [Netlify free tier](https://www.netlify.com/pricing/) | Push this repo, connect to Netlify, add the env vars, deploy. |
| Database cache | [Supabase free tier](https://supabase.com/pricing) | ~500 MB storage, enough for many snapshots. |

#### Deploy to Netlify

1. Push your code to GitHub/GitLab
2. Go to [app.netlify.com](https://app.netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect your Git repository
5. Add environment variables in Site settings → Environment variables:
   - `DRAGNSURVEY_API_BASE_URL=https://developer.dragnsurvey.com/api/v2.0.0`
   - `DRAGNSURVEY_COLLECTOR_ID=your-collector-id`
   - `DRAGNSURVEY_API_KEY=your-api-key`
   - (Optional) `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
6. Deploy!

Future V2 (auth) can rely on Netlify Functions or Supabase auth without changing the current architecture.

### Developing with mock data

If you omit the Drag'n Survey credentials the API automatically feeds the UI with synthetic data (`src/lib/mockData.ts`). This keeps the dashboard usable during design reviews.

### Project structure

- `src/app/page.tsx` – Server component that fetches a fresh snapshot.
- `src/app/api/responses/route.ts` – Serverless endpoint used by SWR.
- `src/lib/*` – Drag'n Survey client, aggregation logic, caching helper.
- `src/components/dashboard/*` – Reusable widgets (charts, cards, tables).

### Scripts

- `npm run dev` – start the Next.js dev server.
- `npm run build` – production build (used by Vercel).
- `npm start` – serve the production build locally.
