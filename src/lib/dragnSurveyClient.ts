import { fetchRawData, saveRawData } from "./cache";
import { env, hasDragNSurveyCredentials, hasSupabaseCredentials } from "./env";
import { mockPayload } from "./mockData";
import {
  RawSurveyResponse,
  SurveyDetails,
  QuestionType,
  RawAnswer,
  QuestionMeta,
} from "./types";
import { normalizeChoiceLabel } from "./utils";

const API_TIMEOUT_MS = 15_000;
const RATE_LIMIT_DELAY_MS = 500; // Delay between API calls to avoid rate limiting
const CACHE_DURATION_MS = 15 * 60 * 1000; // Cache questions for 15 minutes (questions rarely change)
const MAX_RETRIES = 2; // Number of retries for failed requests

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Simple in-memory cache for questions
let questionsCache: {
  map: QuestionMap | null;
  surveyId: string | null;
  timestamp: number;
} = {
  map: null,
  surveyId: null,
  timestamp: 0, // Set to 0 to force fresh fetch on next load
};

async function fetchJSON<T>(
  endpoint: string,
  init?: RequestInit,
  retries = MAX_RETRIES,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const { baseUrl, apiKey } = env.dragNSurvey;
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint.slice(1)
    : endpoint;
  const url = new URL(normalizedEndpoint, normalizedBase).toString();

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: apiKey ? `Bearer ${apiKey}` : "",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text();

      // Retry on rate limit errors
      if (response.status === 429 && retries > 0) {
        const waitTime = RATE_LIMIT_DELAY_MS * (MAX_RETRIES - retries + 2);
        console.warn(
          `⏳ Rate limited, waiting ${waitTime}ms before retry (${retries} retries left)...`,
        );
        await delay(waitTime);
        return fetchJSON<T>(endpoint, init, retries - 1);
      }

      throw new Error(
        `Drag'n Survey API error (${response.status}): ${errorBody}`,
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

type CollectorData = {
  id: string;
  title?: string;
  respondents?: string[];
  [key: string]: unknown;
};

type SurveyData = {
  id: string;
  title: string;
  description?: string;
  collectors?: string[];
  pages?: string[];
  [key: string]: unknown;
};

type PageData = {
  id: string;
  components?: string[];
  [key: string]: unknown;
};

type ComponentData = {
  id: string;
  type: string;
  title?: string;
  items?: {
    choices?: Array<{ label?: string; [key: string]: unknown }>;
  };
  [key: string]: unknown;
};

type RespondentData = {
  id: string;
  complete?: boolean;
  questions?: Record<string, { choices?: unknown[]; timeStamp?: string }>;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

type QuestionMap = Map<
  string,
  {
    title: string;
    type: QuestionType;
    choices: { label: string; key: string }[];
  }
>;

const mapQuestionType = (apiType: string): QuestionType => {
  if (apiType === "choice" || apiType === "yesNo") {
    return "single_choice";
  }
  if (apiType === "multiple") {
    return "multiple_choice";
  }
  if (apiType === "rating" || apiType === "rate") {
    return "rating";
  }
  if (apiType === "number") {
    return "number";
  }
  if (apiType === "text" || apiType === "freeField") {
    return "text";
  }
  return "unknown";
};

async function fetchQuestionsMap(surveyData: SurveyData): Promise<QuestionMap> {
  // Check cache first
  const now = Date.now();
  if (
    questionsCache.map &&
    questionsCache.surveyId === surveyData.id &&
    now - questionsCache.timestamp < CACHE_DURATION_MS
  ) {
    console.log(
      `📦 Using cached questions (${questionsCache.map.size} questions)`,
    );
    return questionsCache.map;
  }

  console.log(`🔄 Fetching fresh questions from API...`);
  const questionsMap: QuestionMap = new Map();
  const pageIds = surveyData.pages ?? [];

  // Fetch all pages in parallel (they don't depend on each other)
  const pagesPromises = pageIds.map((pageId) =>
    fetchJSON<PageData>(`/pages/${pageId}`).catch((err) => {
      console.warn(`Failed to fetch page ${pageId}:`, err);
      return null;
    })
  );

  const pages = await Promise.all(pagesPromises);

  // Collect all component IDs from all pages
  const allComponentIds: string[] = [];
  pages.forEach((page) => {
    if (page?.components) {
      allComponentIds.push(...page.components);
    }
  });

  console.log(`📋 Found ${allComponentIds.length} components to fetch`);

  // Fetch all components in batches to avoid overwhelming the API
  const BATCH_SIZE = 5;
  const componentBatches: string[][] = [];
  for (let i = 0; i < allComponentIds.length; i += BATCH_SIZE) {
    componentBatches.push(allComponentIds.slice(i, i + BATCH_SIZE));
  }

  for (const batch of componentBatches) {
    const batchPromises = batch.map((componentId) =>
      fetchJSON<ComponentData>(`/components/${componentId}`).catch((err) => {
        console.warn(`Failed to fetch component ${componentId}:`, err);
        return null;
      })
    );

    const components = await Promise.all(batchPromises);

    components.forEach((component) => {
      if (!component) return;

      const cleanTitle = component.title?.replace(/<[^>]*>/g, "").trim() ?? "";

      // Skip non-question components (text blocks, images, etc.)
      const skipTypes = ["textZone", "image", "video", "separator"];
      if (skipTypes.includes(component.type)) {
        console.log(
          `⏭️  Skipping non-question component ${component.id} (type: ${component.type})`,
        );
        return;
      }

      // Skip if title is empty after cleaning (but keep component ID as fallback)
      if (!cleanTitle) {
        console.warn(
          `⚠️  Component ${component.id} has no title, using ID as fallback`,
        );
      }

      const choices =
        component.items?.choices?.map(
          (c) => c.label?.replace(/<[^>]*>/g, "").trim() ?? "",
        ) ?? [];

      // IMPORTANT: Map preserves insertion order.
      // Since we process batches sequentially and components in order, the map will be correctly ordered.
      const questionType = mapQuestionType(component.type);

      questionsMap.set(component.id, {
        title: cleanTitle || component.id,
        type: questionType,
        choices: choices.map((label) => ({
          label,
          key: normalizeChoiceLabel(label),
        })),
      });

      console.log(
        `✓ Loaded question: ${cleanTitle.substring(0, 50)}... (type: ${component.type}, ${choices.length} choices)`,
      );
    });

    // Add a small delay between batches to avoid rate limiting
    if (componentBatches.indexOf(batch) < componentBatches.length - 1) {
      await delay(RATE_LIMIT_DELAY_MS);
    }
  }

  console.log(`✓ Loaded ${questionsMap.size} questions`);

  // Update cache
  questionsCache = {
    map: questionsMap,
    surveyId: surveyData.id,
    timestamp: Date.now(),
  };

  return questionsMap;
}

function transformRespondentData(
  respondent: RespondentData,
  questionsMap: QuestionMap,
): RawSurveyResponse {
  const answers: RawAnswer[] = [];
  if (respondent.questions) {
    for (const [questionId, data] of Object.entries(respondent.questions)) {
      const questionInfo = questionsMap.get(questionId);

      if (!questionInfo) {
        console.warn(
          `⚠️  Question ${questionId} not found in questionsMap - skipping (likely deleted from survey)`,
        );
        continue; // Skip questions that no longer exist in the survey
      }

      const rawValue = data.choices?.[0];

      let displayValue: string | number | string[] | null = rawValue as
        | string
        | number
        | null;

      if (
        questionInfo.type === "single_choice" &&
        typeof rawValue === "number"
      ) {
        const choiceEntry = questionInfo.choices[rawValue - 1];
        if (choiceEntry) {
          displayValue = choiceEntry.label;
        }
      }

      if (
        questionInfo.type === "multiple_choice" &&
        Array.isArray(rawValue)
      ) {
        displayValue = (rawValue as unknown[]).map((value) =>
          typeof value === "number"
            ? questionInfo.choices[value - 1]?.label ?? String(value)
            : String(value),
        );
      }

      answers.push({
        question_id: questionId,
        question_title: questionInfo.title ?? questionId,
        question_type: questionInfo.type,
        value: displayValue,
      });
    }
  }

  return {
    id: respondent.id,
    status: respondent.complete ? "complete" : "partial",
    submitted_at: respondent.updated_at ?? respondent.created_at,
    started_at: respondent.created_at,
    answers,
  };
}

async function fetchCollectorData(): Promise<{
  survey: SurveyDetails;
  responses: RawSurveyResponse[];
  questions: QuestionMeta[];
}> {
  // Fetch collector info
  const collector = await fetchJSON<CollectorData>(
    `/collectors/${env.dragNSurvey.collectorId}`,
  );

  // Find the survey that contains this collector
  const surveysResponse = await fetchJSON<{ data: SurveyData[] }>(`/surveys`);
  const surveyData = surveysResponse.data.find((s) =>
    s.collectors?.includes(env.dragNSurvey.collectorId ?? ""),
  );

  if (!surveyData) {
    throw new Error(
      `No survey found containing collector ${env.dragNSurvey.collectorId}`,
    );
  }

  const survey: SurveyDetails = {
    id: surveyData.id,
    title: surveyData.title,
    description: surveyData.description,
    created_at: (surveyData.created_at as string) || undefined,
  };

  // Fetch questions details
  const questionsMap = await fetchQuestionsMap(surveyData);

  const allRespondentIds = collector.respondents ?? [];
  console.log(`📊 Found ${allRespondentIds.length} total respondents.`);

  // --- INCREMENTAL FETCH LOGIC ---
  let cachedResponses: RawSurveyResponse[] = [];
  if (hasSupabaseCredentials && env.dragNSurvey.collectorId) {
    const cachedBundle = await fetchRawData(env.dragNSurvey.collectorId);
    if (cachedBundle) {
      console.log(
        `📦 Found cached bundle with ${cachedBundle.responses.length} responses.`,
      );
      cachedResponses = cachedBundle.responses;
    }
  }

  const cachedIds = new Set(cachedResponses.map((r) => r.id));
  const newIds = allRespondentIds.filter((id) => !cachedIds.has(id));

  const orderedQuestions: QuestionMeta[] = Array.from(questionsMap.entries()).map(
    ([id, info]) => ({
      id,
      title: info.title,
      type: info.type,
      choices: info.choices,
    }),
  );

  const newResponses: RawSurveyResponse[] = [];

  if (newIds.length > 0) {
    console.log(`🚀 Fetching ${newIds.length} new respondents...`);
    
    // Fetch respondents in batches to speed up loading while avoiding rate limits
    const RESPONDENT_BATCH_SIZE = 5;
    const respondentBatches: string[][] = [];
    for (let i = 0; i < newIds.length; i += RESPONDENT_BATCH_SIZE) {
      respondentBatches.push(newIds.slice(i, i + RESPONDENT_BATCH_SIZE));
    }

    for (const batch of respondentBatches) {
      const batchPromises = batch.map((id) =>
        fetchJSON<RespondentData>(`/respondents/${id}`).catch((err) => {
          console.warn(
            `Failed to fetch respondent ${id}:`,
            (err as Error).message,
          );
          return null;
        })
      );

      const respondents = await Promise.all(batchPromises);

      respondents.forEach((respondent) => {
        if (respondent) {
          const transformed = transformRespondentData(respondent, questionsMap);
          newResponses.push(transformed);
        }
      });

      // Add delay between batches to avoid rate limiting
      if (respondentBatches.indexOf(batch) < respondentBatches.length - 1) {
        await delay(RATE_LIMIT_DELAY_MS);
      }
    }

    console.log(`✓ Successfully fetched ${newResponses.length} new respondents`);
  } else {
    console.log("✅ No new respondents to fetch.");
  }

  // Merge and Save
  const allResponses = [...cachedResponses, ...newResponses];

  // Sort by submitted_at desc (most recent first)
  allResponses.sort((a, b) => {
    const dateA = new Date(a.submitted_at ?? 0).getTime();
    const dateB = new Date(b.submitted_at ?? 0).getTime();
    return dateB - dateA;
  });

  if (
    hasSupabaseCredentials &&
    newResponses.length > 0 &&
    env.dragNSurvey.collectorId
  ) {
    console.log(
      `💾 Saving updated bundle (${allResponses.length} responses) to Supabase...`,
    );
    await saveRawData(env.dragNSurvey.collectorId, {
      survey,
      responses: allResponses,
    });
  }

  console.log(`✓ Returning ${allResponses.length} responses`);

  if (allResponses.length > 0) {
    console.log(`📋 Sample response:`, {
      id: allResponses[0].id,
      answersCount: allResponses[0].answers.length,
      sampleAnswers: allResponses[0].answers.slice(0, 3).map((a) => ({
        title: a.question_title.substring(0, 50),
        type: a.question_type,
        value: a.value,
      })),
    });
  }

  return { survey, responses: allResponses, questions: orderedQuestions };
}

export async function fetchSurveyBundle() {
  if (!hasDragNSurveyCredentials) {
    console.warn("Missing Drag'n Survey credentials, using mock data.");
    return mockPayload();
  }

  try {
    const { survey, responses, questions } = await fetchCollectorData();
    return { survey, responses, questions };
  } catch (error) {
    console.error("Drag'n Survey API error:", error);
    console.warn("Falling back to mock data.");
    return mockPayload();
  }
}
