import {
  DashboardData,
  QuestionInsight,
  QuestionMeta,
  QuestionType,
  RawSurveyResponse,
  SurveyDetails,
} from "./types";
import {
  average,
  median,
  normalizeChoiceLabel,
  safePercentage,
  topWords,
} from "./utils";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  day: "numeric",
});

type BuildDashboardOptions = {
  responses: RawSurveyResponse[];
  survey: SurveyDetails;
  questions: QuestionMeta[];
};

export const buildDashboardData = ({
  responses,
  survey,
  questions,
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
    Math.round(
      (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  const responseVelocity = buildVelocity(sortedResponses);

  const questionInsights = buildQuestionInsights(
    sortedResponses,
    questions ?? [],
  );

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
  questions: QuestionMeta[],
): QuestionInsight[] => {
  const answerBuckets = new Map<string, unknown[]>();
  const fallbackMeta = new Map<
    string,
    { title: string; type: QuestionType | undefined }
  >();

  responses.forEach((response) => {
    response.answers.forEach((answer) => {
      if (!answerBuckets.has(answer.question_id)) {
        answerBuckets.set(answer.question_id, []);
        fallbackMeta.set(answer.question_id, {
          title: answer.question_title,
          type: answer.question_type,
        });
      }
      answerBuckets.get(answer.question_id)!.push(answer.value);
    });
  });

  console.log(`📊 Building insights: ${questions.length} questions from metadata, ${fallbackMeta.size} from responses`);

  const orderedQuestions =
    questions && questions.length > 0
      ? questions
      : Array.from(fallbackMeta.entries()).map(([questionId, meta]) => ({
          id: questionId,
          title: meta.title ?? questionId,
          type: meta.type ?? "unknown",
          choices: undefined,
        }));

  console.log(`📊 Using ${orderedQuestions.length} questions for insights (${questions.length > 0 ? 'from metadata' : 'from responses'})`);

  return orderedQuestions.map((question) => {
    const values = answerBuckets.get(question.id) ?? [];
    const sampleSize = values.length;

    const insight: QuestionInsight = {
      questionId: question.id,
      title: question.title,
      type: question.type,
      sampleSize,
    };

    if (
      question.type === "single_choice" ||
      question.type === "multiple_choice"
    ) {
      const choiceMap = new Map<string, number>();
      values
        .flatMap((value) => {
          if (Array.isArray(value)) return value as string[];
          if (typeof value === "string") return [value];
          return [];
        })
        .forEach((value) => {
          const key = normalizeChoiceLabel(value);
          choiceMap.set(key, (choiceMap.get(key) ?? 0) + 1);
        });

      const orderedChoices =
        question.choices && question.choices.length > 0
          ? question.choices
          : Array.from(choiceMap.keys()).map((key) => ({
              key,
              label: key,
            }));

      const options = orderedChoices.map(({ key, label }) => {
        const count = choiceMap.get(key) ?? 0;
        return {
          label,
          count,
          percentage: safePercentage(count, sampleSize || 1),
        };
      });

      // Append any unexpected answers that were not part of the official choices
      choiceMap.forEach((count, key) => {
        const exists =
          orderedChoices.some((choice) => choice.key === key) ?? false;
        if (!exists) {
          options.push({
            label: key,
            count,
            percentage: safePercentage(count, sampleSize || 1),
          });
        }
      });

      insight.options = options;
    } else if (question.type === "rating" || question.type === "number") {
      const numericValues = values
        .map((value) => (typeof value === "number" ? value : Number(value)))
        .filter((value) => Number.isFinite(value));
      insight.average = average(numericValues);
      insight.median = median(numericValues);
    } else if (question.type === "text") {
      const textValues = values
        .map((value) => (typeof value === "string" ? value : ""))
        .filter(Boolean);
      insight.topTextAnswers = textValues.reverse();
      insight.topWords = topWords(textValues);
    }

    return insight;
  });
};

const formatAnswerValue = (
  value: RawSurveyResponse["answers"][number]["value"],
) => {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return value.toString();
  return value ?? "";
};
