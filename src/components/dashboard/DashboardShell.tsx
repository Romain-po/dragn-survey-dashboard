"use client";

import { useTransition, useState } from "react";
import useSWR from "swr";

import { DashboardData } from "@/lib/types";

import { QuestionBreakdown } from "./QuestionBreakdown";
import { ResponseVelocityChart } from "./ResponseVelocityChart";
import { SummaryCards } from "./SummaryCards";

const fetcher = async (input: string) => {
  const response = await fetch(input, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("API error");
  }
  return (await response.json()) as DashboardData;
};

const PERIODS = [
  { label: "7 jours", value: 7 },
  { label: "30 jours", value: 30 },
  { label: "90 jours", value: 90 },
];

type DashboardShellProps = {
  initialData: DashboardData;
};

export const DashboardShell = ({ initialData }: DashboardShellProps) => {
  const defaultPeriod = initialData.periodDays ?? 30;
  const [period, setPeriod] = useState(defaultPeriod);
  const [isRefreshing, startTransition] = useTransition();

  const { data, error, isValidating, mutate } = useSWR<DashboardData>(
    `/api/responses?days=${period}`,
    fetcher,
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
      refreshInterval: 60_000,
    },
  );

  const dashboard = data ?? initialData;

  const handleRefresh = () => {
    startTransition(() => {
      mutate();
    });
  };

  return (
    <div className="flex flex-col gap-8 py-10">
      <header className="flex flex-col gap-4 border-b-2 border-slate-600 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-400 font-medium uppercase tracking-wide">Dashboard Drag&apos;n Survey</p>
          <h1 className="text-4xl font-bold text-white mt-2">{dashboard.surveyTitle}</h1>
          {dashboard.surveyDescription && (
            <p className="text-sm text-white/70">
              {dashboard.surveyDescription}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex rounded-full bg-slate-700 border border-slate-600 p-1">
            {PERIODS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPeriod(item.value)}
                className={`rounded-full px-4 py-1 text-sm transition ${
                  period === item.value
                    ? "bg-white text-black"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isValidating || isRefreshing}
            className="rounded-full border-2 border-slate-600 bg-slate-700 px-4 py-1 text-sm text-white font-medium transition hover:bg-slate-600 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Actualiser
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">
          Erreur lors du chargement des données. Merci de vérifier votre clé API
          Drag&apos;n Survey.
        </div>
      ) : null}

      <SummaryCards
        data={dashboard}
        isRefreshing={isValidating || isRefreshing}
      />

      <ResponseVelocityChart points={dashboard.responseVelocity} />

      <QuestionBreakdown insights={dashboard.questionInsights} />
    </div>
  );
};

