import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { env, hasSupabaseCredentials } from "./env";
import { DashboardData } from "./types";

let supabaseClient: SupabaseClient | null = null;

if (hasSupabaseCredentials && env.supabase.url && env.supabase.serviceKey) {
  supabaseClient = createClient(env.supabase.url, env.supabase.serviceKey, {
    auth: { persistSession: false },
  });
}

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

