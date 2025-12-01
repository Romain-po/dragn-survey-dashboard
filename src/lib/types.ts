export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "rating"
  | "text"
  | "number"
  | "unknown";

export type RawAnswer = {
  question_id: string;
  question_title: string;
  question_type?: QuestionType;
  value: string | number | string[] | null;
  option_id?: string | string[] | null;
};

export type RawSurveyResponse = {
  id: string;
  contact?: string;
  status?: "complete" | "partial" | "abandoned";
  submitted_at?: string;
  started_at?: string;
  answers: RawAnswer[];
};

export type SurveyDetails = {
  id: string;
  title: string;
  description?: string;
  language?: string;
  created_at?: string;
};

export type TrendPoint = {
  date: string;
  count: number;
  label?: string;
};

export type QuestionOptionStat = {
  label: string;
  count: number;
  percentage: number;
};

export type QuestionInsight = {
  questionId: string;
  title: string;
  type: QuestionType;
  sampleSize: number;
  options?: QuestionOptionStat[];
  average?: number;
  median?: number;
  topTextAnswers?: string[];
  topWords?: { word: string; count: number }[];
};

export type LatestResponse = {
  id: string;
  submittedAt?: string;
  status?: string;
  answersPreview: { question: string; value: string }[];
};

export type DashboardData = {
  surveyId: string;
  surveyTitle: string;
  surveyDescription?: string;
  totalResponses: number;
  completedResponses: number;
  completionRate: number;
  averagePerDay: number;
  updatedAt: string;
  periodDays?: number;
  responseVelocity: TrendPoint[];
  questionInsights: QuestionInsight[];
  latestResponses: LatestResponse[];
};

