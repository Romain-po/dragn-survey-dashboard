"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
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
    <section className="glass-card rounded-2xl p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-bold tracking-wider text-indigo-400 uppercase mb-1">
            Deep Dive
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Analyse par Question
          </h2>
        </div>
        <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-slate-400 font-medium">
          {insights.length} questions suivies
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {insights.map((insight) => (
          <article
            key={insight.questionId}
            className="glass-card glass-card-hover rounded-xl p-6 relative group overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-slate-300 border border-white/5">
                    {typeLabel(insight.type)}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-white leading-snug">
                  {insight.title}
                </h3>
              </div>
              <span className="shrink-0 text-xs font-medium text-slate-500 bg-slate-900/50 px-2 py-1 rounded border border-white/5">
                {insight.sampleSize} réponses
              </span>
            </div>
            
            <div className="relative z-10">
              <InsightContent insight={insight} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

const InsightContent = ({ insight }: { insight: QuestionInsight }) => {
  const [showAllText, setShowAllText] = useState(false);

  if (insight.options?.length) {
    const chartData = insight.options.map((option) => ({
      label:
        option.label.length > 40
          ? option.label.substring(0, 37) + "..."
          : option.label,
      fullLabel: option.label,
      count: option.count,
      percentage: option.percentage,
    }));

    return (
      <>
        <div className="h-48 w-full -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 0, right: 10, top: 5, bottom: 5 }}
              barSize={20}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={120}
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-white/10 rounded-lg p-3 shadow-xl">
                        <p className="text-white font-medium text-sm mb-1">{data.fullLabel}</p>
                        <div className="text-xs text-slate-400 flex gap-3">
                          <span>{data.count} votes</span>
                          <span className="text-indigo-400 font-bold">{data.percentage}%</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                ))}
              </Bar>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </>
    );
  }

  if (typeof insight.average === "number") {
    const maxRating = 5;
    return (
      <div className="bg-white/5 rounded-xl p-6 border border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-500/10 to-purple-500/10 blur-xl" />
        
        <div className="relative z-10">
          <div className="flex items-baseline justify-center gap-1 mb-2">
            <span className="text-5xl font-black text-white tracking-tight">
              {insight.average.toFixed(1)}
            </span>
            <span className="text-xl text-slate-500 font-medium">
              / {maxRating}
            </span>
          </div>
          
          <div className="mb-4">
            <StarRating rating={insight.average} max={maxRating} />
          </div>
          
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-linear-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
              style={{ width: `${(insight.average / maxRating) * 100}%` }}
            />
          </div>
          <div className="flex justify-between w-full text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">
            <span>Min</span>
            <span>Max</span>
          </div>
        </div>
      </div>
    );
  }

  if (insight.topTextAnswers?.length) {
    const displayAnswers = showAllText
      ? insight.topTextAnswers
      : insight.topTextAnswers.slice(0, 3);
    const hasMore = insight.topTextAnswers.length > 3;

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 mb-4">
          {insight.topWords?.slice(0, 5).map((word) => (
            <span 
              key={word.word}
              className="px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-300 text-xs border border-indigo-500/30"
            >
              #{word.word} <span className="opacity-50">({word.count})</span>
            </span>
          ))}
        </div>

        <div className="space-y-3">
          {displayAnswers.map((answer, index) => (
            <div
              key={index}
              className="relative pl-4 border-l-2 border-white/10 hover:border-indigo-500/50 transition-colors py-1"
            >
              <p className="text-sm text-slate-300 italic leading-relaxed">
                "{answer}"
              </p>
            </div>
          ))}
        </div>

        {hasMore && (
          <button
            onClick={() => setShowAllText(!showAllText)}
            className="mt-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 uppercase tracking-wider"
          >
            {showAllText ? "Réduire" : `Lire ${insight.topTextAnswers.length - 3} autres avis`}
            <svg className={`w-3 h-3 transition-transform ${showAllText ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-white/5 rounded-xl">
      <p className="text-slate-500 font-medium text-sm">En attente de données</p>
      <p className="text-slate-600 text-xs mt-1">
        {insight.sampleSize} réponse(s) reçue(s)
      </p>
    </div>
  );
};

const typeLabel = (type: QuestionInsight["type"]) => {
  switch (type) {
    case "single_choice": return "Choix Unique";
    case "multiple_choice": return "Choix Multiple";
    case "rating": return "Notation";
    case "text": return "Verbatim";
    default: return "Question";
  }
};

const StarRating = ({ rating, max = 5 }: { rating: number; max?: number }) => {
  const percentage = (rating / max) * 100;

  return (
    <div className="relative inline-block">
      <div className="flex gap-1.5 text-slate-700">
        {Array.from({ length: max }).map((_, i) => (
          <StarIcon key={`bg-${i}`} />
        ))}
      </div>
      <div
        className="absolute top-0 left-0 flex gap-1.5 text-amber-400 overflow-hidden whitespace-nowrap"
        style={{ width: `${percentage}%` }}
      >
        {Array.from({ length: max }).map((_, i) => (
          <StarIcon key={`fg-${i}`} />
        ))}
      </div>
    </div>
  );
};

const StarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 drop-shadow-lg"
  >
    <path
      fillRule="evenodd"
      d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
      clipRule="evenodd"
    />
  </svg>
);
