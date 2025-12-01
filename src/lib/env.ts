import { z } from "zod";

const envSchema = z.object({
  DRAGNSURVEY_API_BASE_URL: z
    .string()
    .url()
    .default("https://developer.dragnsurvey.com/api/v2.0.0"),
  DRAGNSURVEY_COLLECTOR_ID: z.string().optional(),
  DRAGNSURVEY_API_KEY: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

const parsed = envSchema.parse({
  DRAGNSURVEY_API_BASE_URL:
    process.env.DRAGNSURVEY_API_BASE_URL ??
    "https://developer.dragnsurvey.com/api/v2.0.0",
  DRAGNSURVEY_COLLECTOR_ID: process.env.DRAGNSURVEY_COLLECTOR_ID,
  DRAGNSURVEY_API_KEY: process.env.DRAGNSURVEY_API_KEY,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

export const env = {
  dragNSurvey: {
    baseUrl: parsed.DRAGNSURVEY_API_BASE_URL,
    collectorId: parsed.DRAGNSURVEY_COLLECTOR_ID,
    apiKey: parsed.DRAGNSURVEY_API_KEY,
  },
  supabase: {
    url: parsed.SUPABASE_URL,
    serviceKey: parsed.SUPABASE_SERVICE_ROLE_KEY,
  },
} as const;

export const hasDragNSurveyCredentials =
  Boolean(env.dragNSurvey.apiKey) && Boolean(env.dragNSurvey.collectorId);

export const hasSupabaseCredentials =
  Boolean(env.supabase.url) && Boolean(env.supabase.serviceKey);

