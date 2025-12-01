import { RawSurveyResponse, SurveyDetails } from "./types";

const baseQuestions = [
  {
    id: "q1",
    title: "Comment avez-vous découvert notre questionnaire ?",
    type: "single_choice",
    options: ["Email", "Réseaux sociaux", "Site web", "Recommandation"],
  },
  {
    id: "q2",
    title: "Quelle est votre satisfaction globale ?",
    type: "rating",
    scale: 5,
  },
  {
    id: "q3",
    title: "Qu'aimeriez-vous améliorer ?",
    type: "text",
  },
  {
    id: "q4",
    title: "Quelles fonctionnalités utilisez-vous ?",
    type: "multiple_choice",
    options: ["Rapports", "Export CSV", "Notifications", "API"],
  },
];

const improvements = [
  "Plus d'automatisation",
  "UI plus rapide",
  "Meilleure intégration API",
  "Export personnalisé",
  "Segmentations avancées",
  "Améliorer la collaboration",
  "Notifications plus fines",
];

export const mockSurvey: SurveyDetails = {
  id: "mock-survey",
  title: "Baromètre Drag'n Survey",
  description: "Données générées pour travailler sans clé API.",
  language: "fr",
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
};

export function generateMockResponses(count = 160): RawSurveyResponse[] {
  const responses: RawSurveyResponse[] = [];
  for (let i = 0; i < count; i += 1) {
    const submitted = new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30);
    const rating = Math.ceil(Math.random() * 5);
    const improvementsShuffle = [...improvements].sort(() => Math.random() - 0.5);
    responses.push({
      id: `mock-${i}`,
      status: Math.random() > 0.1 ? "complete" : "partial",
      submitted_at: submitted.toISOString(),
      answers: [
        {
          question_id: baseQuestions[0].id,
          question_title: baseQuestions[0].title,
          question_type: "single_choice",
          value:
            baseQuestions[0].options[
              Math.floor(Math.random() * baseQuestions[0].options.length)
            ],
        },
        {
          question_id: baseQuestions[1].id,
          question_title: baseQuestions[1].title,
          question_type: "rating",
          value: rating,
        },
        {
          question_id: baseQuestions[2].id,
          question_title: baseQuestions[2].title,
          question_type: "text",
          value: improvementsShuffle.slice(0, 1 + Math.floor(Math.random() * 2)).join(", "),
        },
        {
          question_id: baseQuestions[3].id,
          question_title: baseQuestions[3].title,
          question_type: "multiple_choice",
          value: baseQuestions[3].options
            .filter(() => Math.random() > 0.4)
            .slice(0, 3),
        },
      ],
    });
  }

  return responses;
}

export const mockPayload = () => ({
  survey: mockSurvey,
  responses: generateMockResponses(),
});

