"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { QuestionInsight } from "@/lib/types";

type TooltipEntry = {
  payload?: {
    percentage?: number;
  };
};

type QuestionBreakdownProps = {
  insights: QuestionInsight[];
};

export const QuestionBreakdown = ({ insights }: QuestionBreakdownProps) => {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/60">Analyse par question</p>
          <p className="text-2xl font-semibold text-white">
            {insights.length} questions suivies
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {insights.map((insight) => (
          <article
            key={insight.questionId}
            className="rounded-2xl border-2 border-slate-600 bg-slate-800 p-6 shadow-2xl hover:border-purple-400 hover:shadow-purple-500/20 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50 uppercase">
                  {typeLabel(insight.type)}
                </p>
                <p className="text-lg font-semibold text-white">
                  {insight.title}
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                {insight.sampleSize} réponses
              </span>
            </div>
            <div className="mt-4">
              {renderInsight(insight)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

const renderInsight = (insight: QuestionInsight) => {
  if (insight.options?.length) {
    // Truncate long labels for chart display
    const chartData = insight.options.map((option) => ({
      label: option.label.length > 40 ? option.label.substring(0, 37) + '...' : option.label,
      fullLabel: option.label,
      count: option.count,
      percentage: option.percentage,
    }));
    return (
      <>
        <div className="h-48 w-full -ml-8">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={160}
                tick={{ fill: "#e2e8f0", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <Tooltip
                formatter={(
                  value: number,
                  name: string,
                  payload: TooltipEntry,
                ) => [
                  `${value} réponses (${payload?.payload?.percentage ?? 0}%)`,
                  name,
                ]}
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "1rem",
                  color: "white",
                }}
              />
              <Bar dataKey="count" fill="url(#colorGradient)" radius={8} />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-3 text-xs text-white/70">
          {chartData.map((option) => (
            <li key={option.fullLabel}>
              {option.fullLabel}: {option.count} réponses • {option.percentage}%
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (typeof insight.average === "number") {
    const maxRating = 5;
    const percentage = (insight.average / maxRating) * 100;
    const color = percentage >= 80 ? "#10b981" : percentage >= 60 ? "#3b82f6" : percentage >= 40 ? "#f59e0b" : "#ef4444";
    
    return (
      <div className="space-y-4">
        <div className="flex items-end gap-6">
          <div>
            <p className="text-sm text-white/60 mb-1">Moyenne</p>
            <p className="text-5xl font-bold text-white">
              {insight.average.toFixed(1)}
              <span className="text-2xl text-white/40 ml-1">/ {maxRating}</span>
            </p>
          </div>
          {typeof insight.median === "number" && (
            <div className="pb-2">
              <p className="text-sm text-white/60">Médiane</p>
              <p className="text-3xl font-semibold text-white">{insight.median.toFixed(1)}</p>
            </div>
          )}
        </div>
        
        {/* Visual rating bar */}
        <div className="space-y-2">
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${percentage}%`,
                background: `linear-gradient(90deg, ${color}, ${color}dd)`
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/50">
            <span>Très insatisfait</span>
            <span>Très satisfait</span>
          </div>
        </div>
      </div>
    );
  }

  if (insight.topTextAnswers?.length) {
    return (
      <div className="flex flex-col gap-3">
        {insight.topTextAnswers.map((answer, index) => (
          <blockquote
            key={answer}
            className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80"
          >
            <span className="mr-2 text-white/40">#{index + 1}</span>
            {answer}
          </blockquote>
        ))}
        {insight.topWords?.length ? (
          <p className="text-xs text-white/60">
            Mots clés&nbsp;:{" "}
            {insight.topWords.map((word) => `${word.word} (${word.count})`).join(", ")}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="text-sm text-white/60">
      <p>Pas encore de données analysables.</p>
      <p className="mt-2 text-xs text-white/40">
        Type: {insight.type} • {insight.sampleSize} réponse(s)
      </p>
    </div>
  );
};

const typeLabel = (type: QuestionInsight["type"]) => {
  switch (type) {
    case "single_choice":
      return "Choix unique";
    case "multiple_choice":
      return "Choix multiple";
    case "rating":
      return "Notation";
    case "text":
      return "Texte libre";
    default:
      return "Question";
  }
};

