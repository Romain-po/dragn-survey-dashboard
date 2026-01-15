import { saveSnapshot, fetchLatestSnapshot } from "./cache";
import { fetchSurveyBundle } from "./dragnSurveyClient";
import { env, hasSupabaseCredentials } from "./env";
import { buildDashboardData } from "./aggregation";
import { DashboardData } from "./types";

type DashboardOptions = {
  days?: number;
  forceRefresh?: boolean;
};

const SNAPSHOT_FRESHNESS_MS = 15 * 60 * 1000; // 15 minutes
const MEMORY_CACHE_MS = 60 * 1000; // 1 minute in-memory cache

// In-memory cache for super fast responses
let memoryCache: {
  data: DashboardData | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

export const fetchFreshDashboardData = async (
  options: DashboardOptions = {},
): Promise<DashboardData> => {
  // This now uses the smart incremental fetch
  const { survey, responses, questions } = await fetchSurveyBundle();
  
  const dashboard = buildDashboardData({
    responses,
    survey,
    questions,
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
  const { forceRefresh } = options;

  // 0. Try In-Memory Cache First (Level 0: Fastest - In-Memory)
  if (!forceRefresh && memoryCache.data) {
    const age = Date.now() - memoryCache.timestamp;
    if (age < MEMORY_CACHE_MS) {
      console.log(`⚡ Using in-memory cache (age: ${Math.round(age/1000)}s)`);
      return memoryCache.data;
    }
  }

  // 1. Try Supabase Cache (Level 1: Processed Snapshot)
  if (!forceRefresh && hasSupabaseCredentials) {
    try {
      const cached = await fetchLatestSnapshot(
        env.dragNSurvey.collectorId ?? "fallback-collector",
      );
      
      // Check freshness
      const age = cached ? Date.now() - new Date(cached.updatedAt).getTime() : Infinity;
      const isFresh = age < SNAPSHOT_FRESHNESS_MS;

      if (cached && isFresh) {
        console.log(`📦 Using valid dashboard snapshot (age: ${Math.round(age/1000)}s)`);
        // Update in-memory cache
        memoryCache = {
          data: cached,
          timestamp: Date.now(),
        };
        return cached;
      }
      
      if (cached) {
        console.log(`⌛ Snapshot found but stale (age: ${Math.round(age/1000)}s). Fetching fresh...`);
      }
    } catch (e) {
      console.warn("Failed to read cache check", e);
    }
  }

  // 2. Fetch Fresh (Level 2: Smart Raw Data Fetch)
  try {
    console.log("🔄 Building fresh dashboard data...");
    const freshData = await fetchFreshDashboardData(options);
    
    // Update in-memory cache with fresh data
    memoryCache = {
      data: freshData,
      timestamp: Date.now(),
    };
    
    return freshData;
  } catch (error) {
    console.error("Dashboard build failed", error);
    
    // Fallback to potentially stale cache if fresh fetch fails
    if (hasSupabaseCredentials) {
      console.warn("⚠️ Falling back to stale cache due to error");
      const cached = await fetchLatestSnapshot(
        env.dragNSurvey.collectorId ?? "fallback-collector",
      );
      if (cached) {
        // Update in-memory cache even with stale data
        memoryCache = {
          data: cached,
          timestamp: Date.now(),
        };
        return cached;
      }
    }
    throw error;
  }
};
