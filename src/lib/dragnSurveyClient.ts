import { env, hasDragNSurveyCredentials } from "./env";
import { mockPayload } from "./mockData";
import { RawSurveyResponse, SurveyDetails, QuestionType, RawAnswer } from "./types";

const API_TIMEOUT_MS = 15_000;
const RATE_LIMIT_DELAY_MS = 500; // Delay between API calls to avoid rate limiting (increased to 500ms)
const CACHE_DURATION_MS = 1 * 60 * 1000; // Cache questions for 1 minute
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

async function fetchJSON<T>(endpoint: string, init?: RequestInit, retries = MAX_RETRIES): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const { baseUrl, apiKey } = env.dragNSurvey;
  const normalizedBase = baseUrl.endsWith("/")
    ? baseUrl
    : `${baseUrl}/`;
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
        console.warn(`⏳ Rate limited, waiting ${waitTime}ms before retry (${retries} retries left)...`);
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
    type: string;
    choices: string[];
  }
>;

async function fetchQuestionsMap(surveyData: SurveyData): Promise<QuestionMap> {
  // Check cache first
  const now = Date.now();
  if (
    questionsCache.map &&
    questionsCache.surveyId === surveyData.id &&
    now - questionsCache.timestamp < CACHE_DURATION_MS
  ) {
    console.log(`📦 Using cached questions (${questionsCache.map.size} questions)`);
    return questionsCache.map;
  }

  console.log(`🔄 Fetching fresh questions from API...`);
  const questionsMap: QuestionMap = new Map();
  const pageIds = surveyData.pages ?? [];

  for (const pageId of pageIds) {
    try {
      const page = await fetchJSON<PageData>(`/pages/${pageId}`);
      await delay(RATE_LIMIT_DELAY_MS);
      
      const componentIds = page.components ?? [];

      // Fetch components sequentially to avoid rate limiting
      for (const componentId of componentIds) {
        try {
          const component = await fetchJSON<ComponentData>(`/components/${componentId}`);
          await delay(RATE_LIMIT_DELAY_MS);

          const cleanTitle = component.title
            ?.replace(/<[^>]*>/g, "")
            .trim() ?? "";

          // Skip non-question components (text blocks, images, etc.)
          const skipTypes = ['textZone', 'image', 'video', 'separator'];
          if (skipTypes.includes(component.type)) {
            console.log(`⏭️  Skipping non-question component ${componentId} (type: ${component.type})`);
            continue;
          }

          // Skip if title is empty after cleaning (but keep component ID as fallback)
          if (!cleanTitle) {
            console.warn(`⚠️  Component ${componentId} has no title, using ID as fallback`);
          }

          const choices =
            component.items?.choices?.map(
              (c) => c.label?.replace(/<[^>]*>/g, "").trim() ?? "",
            ) ?? [];

          questionsMap.set(component.id, {
            title: cleanTitle || component.id,
            type: component.type,
            choices,
          });
          
          console.log(`✓ Loaded question: ${cleanTitle.substring(0, 50)}... (type: ${component.type}, ${choices.length} choices)`);
        } catch (err) {
          console.warn(`Failed to fetch component ${componentId}:`, err);
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch page ${pageId}:`, err);
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

async function fetchCollectorData(): Promise<{
  survey: SurveyDetails;
  responses: RawSurveyResponse[];
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
  };

  // Fetch questions details
  const questionsMap = await fetchQuestionsMap(surveyData);

  const respondentIds = collector.respondents ?? [];
  console.log(`📊 Fetching ${respondentIds.length} respondents...`);

  // Fetch respondents sequentially to avoid rate limiting
  const respondents: (RespondentData | null)[] = [];
  for (const id of respondentIds) {
    try {
      const respondent = await fetchJSON<RespondentData>(`/respondents/${id}`);
      respondents.push(respondent);
      await delay(RATE_LIMIT_DELAY_MS);
    } catch (err) {
      console.warn(`Failed to fetch respondent ${id}:`, (err as Error).message);
      respondents.push(null);
    }
  }

  const responses: RawSurveyResponse[] = respondents
    .filter((r): r is RespondentData => r !== null)
    .map((respondent) => {
      const answers: RawAnswer[] = [];
      if (respondent.questions) {
        for (const [questionId, data] of Object.entries(respondent.questions)) {
          const questionInfo = questionsMap.get(questionId);
          
          if (!questionInfo) {
            console.warn(`⚠️  Question ${questionId} not found in questionsMap - skipping (likely deleted from survey)`);
            continue; // Skip questions that no longer exist in the survey
          }
          
          const rawValue = data.choices?.[0];

          let displayValue: string | number | string[] | null = rawValue as string | number | null;

          // Map choice index to label for choice questions (including yesNo)
          if (
            (questionInfo?.type === "choice" || questionInfo?.type === "yesNo") &&
            typeof rawValue === "number" &&
            questionInfo.choices[rawValue - 1]
          ) {
            displayValue = questionInfo.choices[rawValue - 1];
          }

          // Map API type to our QuestionType
          let questionType: QuestionType = "unknown";
          if (questionInfo?.type === "choice") {
            questionType = "single_choice";
          } else if (questionInfo?.type === "text" || questionInfo?.type === "freeField") {
            questionType = "text";
          } else if (questionInfo?.type === "rating" || questionInfo?.type === "rate") {
            questionType = "rating";
          } else if (questionInfo?.type === "number") {
            questionType = "number";
          } else if (questionInfo?.type === "yesNo") {
            questionType = "single_choice";
          }

          answers.push({
            question_id: questionId,
            question_title: questionInfo?.title ?? questionId,
            question_type: questionType,
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
    });

  console.log(`✓ Fetched ${responses.length} complete responses`);
  if (responses.length > 0) {
    console.log(`📋 Sample response:`, {
      id: responses[0].id,
      answersCount: responses[0].answers.length,
      sampleAnswers: responses[0].answers.slice(0, 3).map(a => ({
        title: a.question_title.substring(0, 50),
        type: a.question_type,
        value: a.value,
      })),
    });
  }

  return { survey, responses };
}

export async function fetchSurveyBundle() {
  if (!hasDragNSurveyCredentials) {
    console.warn("Missing Drag'n Survey credentials, using mock data.");
    return mockPayload();
  }

  try {
    const { survey, responses } = await fetchCollectorData();
    return { survey, responses };
  } catch (error) {
    console.error("Drag'n Survey API error:", error);
    console.warn("Falling back to mock data.");
    return mockPayload();
  }
}

