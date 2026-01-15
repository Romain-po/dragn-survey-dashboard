import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { env, hasSupabaseCredentials } from "./env";
import { DashboardData, RawSurveyResponse, SurveyDetails } from "./types";

let supabaseClient: SupabaseClient | null = null;

if (hasSupabaseCredentials && env.supabase.url && env.supabase.serviceKey) {
  supabaseClient = createClient(env.supabase.url, env.supabase.serviceKey, {
    auth: { persistSession: false },
  });
}

type RawDataBundle = {
  survey: SurveyDetails;
  responses: RawSurveyResponse[];
};

export const saveRawData = async (
  collectorId: string,
  data: RawDataBundle
) => {
  if (!supabaseClient) return;
  try {
    // Upsert logic or just insert new?
    // Since we want to update the cache, let's insert a new row so we have history,
    // or we could just update the latest.
    // Let's just insert for now, simpler to debug.
    await supabaseClient.from("survey_raw_data").insert({
      collector_id: collectorId,
      data,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("Unable to write raw data to Supabase", error);
  }
};

export const fetchRawData = async (
  collectorId: string
): Promise<RawDataBundle | null> => {
  if (!supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient
      .from("survey_raw_data")
      .select("data")
      .eq("collector_id", collectorId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data.data as RawDataBundle;
  } catch (error) {
    console.warn("Unable to read raw data from Supabase", error);
    return null;
  }
};

export const saveSnapshot = async (snapshot: DashboardData) => {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from("survey_snapshots").insert({
      survey_id: snapshot.surveyId,
      snapshot,
    });
  } catch (error) {
    console.warn("Unable to write snapshot to Supabase", error);
  }
};

export const fetchLatestSnapshot = async (
  surveyId: string,
): Promise<DashboardData | null> => {
  if (!supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient
      .from("survey_snapshots")
      .select("snapshot")
      .eq("survey_id", surveyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data.snapshot as DashboardData;
  } catch (error) {
    console.warn("Unable to read snapshot from Supabase", error);
    return null;
  }
};

