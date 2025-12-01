import {
  DashboardData,
  QuestionInsight,
  RawSurveyResponse,
  SurveyDetails,
} from "./types";
import { average, median, safePercentage, topWords } from "./utils";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  day: "numeric",
});

type BuildDashboardOptions = {
  responses: RawSurveyResponse[];
  survey: SurveyDetails;
  periodDays?: number;
};

export const buildDashboardData = ({
  responses,
  survey,
  periodDays,
}: BuildDashboardOptions): DashboardData => {
  const sortedResponses = [...responses].sort((a, b) => {
    const aDate = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
    const bDate = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
    return aDate - bDate;
  });

  const totalResponses = sortedResponses.length;
  const completedResponses = sortedResponses.filter(
    (response) => response.status !== "partial",
  ).length;
  const completionRate = safePercentage(completedResponses, totalResponses);

  const firstDate = sortedResponses.at(0)?.submitted_at
    ? new Date(sortedResponses[0].submitted_at as string)
    : new Date();
  const lastDate = sortedResponses.at(-1)?.submitted_at
    ? new Date(sortedResponses.at(-1)?.submitted_at as string)
    : new Date();
  const diffDays = Math.max(
    1,
    Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const responseVelocity = buildVelocity(sortedResponses);

  const questionInsights = buildQuestionInsights(sortedResponses);

  const latestResponses = sortedResponses
    .slice(-6)
    .reverse()
    .map((response) => ({
      id: response.id,
      submittedAt: response.submitted_at,
      status: response.status,
      answersPreview: response.answers.slice(0, 3).map((answer) => ({
        question: answer.question_title,
        value: formatAnswerValue(answer.value),
      })),
    }));

  return {
    surveyId: survey.id,
    surveyTitle: survey.title,
    surveyDescription: survey.description,
    totalResponses,
    completedResponses,
    completionRate,
    averagePerDay: Math.round((totalResponses / diffDays) * 10) / 10,
    updatedAt: new Date().toISOString(),
    periodDays,
    responseVelocity,
    questionInsights,
    latestResponses,
  };
};

const buildVelocity = (responses: RawSurveyResponse[]) => {
  const map = new Map<string, number>();

  responses.forEach((response) => {
    if (!response.submitted_at) return;
    const key = response.submitted_at.slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, count]) => ({
      date,
      count,
      label: DATE_FORMATTER.format(new Date(date)),
    }));
};

const buildQuestionInsights = (
  responses: RawSurveyResponse[],
): QuestionInsight[] => {
  const questionMap = new Map<
    string,
    { title: string; type: QuestionInsight["type"]; values: unknown[] }
  >();

  responses.forEach((response) => {
    response.answers.forEach((answer) => {
      const entry = questionMap.get(answer.question_id) ?? {
        title: answer.question_title,
        type: answer.question_type ?? "unknown",
        values: [],
      };
      entry.values.push(answer.value);
      questionMap.set(answer.question_id, entry);
    });
  });

  return Array.from(questionMap.entries()).map(([questionId, payload]) => {
    const sampleSize = payload.values.length;
    const insight: QuestionInsight = {
      questionId,
      title: payload.title,
      type: payload.type ?? "unknown",
      sampleSize,
    };

    if (payload.type === "single_choice" || payload.type === "multiple_choice") {
      const choiceMap = new Map<string, number>();
    const responsesCount = payload.values.length || 1;
      payload.values
        .flatMap((value) => {
          if (Array.isArray(value)) return value;
          if (typeof value === "string") return [value];
          return [];
        })
        .forEach((value) => {
          choiceMap.set(value, (choiceMap.get(value) ?? 0) + 1);
        });
      insight.options = Array.from(choiceMap.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([label, count]) => ({
          label,
          count,
        percentage: safePercentage(count, responsesCount),
        }));
    } else if (payload.type === "rating" || payload.type === "number") {
      const numericValues = payload.values
        .map((value) => (typeof value === "number" ? value : Number(value)))
        .filter((value) => Number.isFinite(value));
      insight.average = average(numericValues);
      insight.median = median(numericValues);
    } else if (payload.type === "text") {
      const textValues = payload.values
        .map((value) => (typeof value === "string" ? value : ""))
        .filter(Boolean);
      insight.topTextAnswers = textValues.slice(-3).reverse();
      insight.topWords = topWords(textValues);
    }

    return insight;
  });
};

const formatAnswerValue = (value: RawSurveyResponse["answers"][number]["value"]) => {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return value.toString();
  return value ?? "";
};

