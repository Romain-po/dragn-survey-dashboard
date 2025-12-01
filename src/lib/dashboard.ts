import { saveSnapshot, fetchLatestSnapshot } from "./cache";
import { fetchSurveyBundle } from "./dragnSurveyClient";
import { env, hasSupabaseCredentials } from "./env";
import { buildDashboardData } from "./aggregation";
import { DashboardData } from "./types";

type DashboardOptions = {
  days?: number;
};

export const getDashboardData = async (
  options: DashboardOptions = {},
): Promise<DashboardData> => {
  const { days } = options;
  const since = days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;
  const { survey, responses } = await fetchSurveyBundle();
  const filteredResponses = since
    ? responses.filter(
        (response) =>
          response.submitted_at &&
          new Date(response.submitted_at).getTime() >= since,
      )
    : responses;

  const dashboard = buildDashboardData({
    responses: filteredResponses,
    survey,
    periodDays: days,
  });

  if (hasSupabaseCredentials) {
    saveSnapshot(dashboard).catch((error) =>
      console.warn("Failed to cache snapshot", error),
    );
  }

  return dashboard;
};

export const getDashboardDataWithFallback = async (
  options: DashboardOptions = {},
) => {
  try {
    return await getDashboardData(options);
  } catch (error) {
    console.error("Dashboard build failed", error);
    if (hasSupabaseCredentials) {
      const cached = await fetchLatestSnapshot(
        env.dragNSurvey.collectorId ?? "fallback-collector",
      );
      if (cached) return cached;
    }
    throw error;
  }
};

