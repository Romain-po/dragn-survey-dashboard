"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import { DashboardData } from "@/lib/types";

import { QuestionBreakdown } from "./QuestionBreakdown";
import { SummaryCards } from "./SummaryCards";

const fetcher = async (input: string) => {
  const response = await fetch(input, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("API error");
  }
  return (await response.json()) as DashboardData;
};

type DashboardShellProps = {
  initialData: DashboardData;
};

export const DashboardShell = ({ initialData }: DashboardShellProps) => {
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const router = useRouter();

  const { data, error, isValidating, mutate } = useSWR<DashboardData>(
    `/api/responses`,
    fetcher,
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
      refreshInterval: 60_000,
    },
  );

  const dashboard = data ?? initialData;

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      // Force refresh the backend cache
      await fetch(`/api/responses?refresh=true`);
      // Then revalidate SWR
      await mutate();
    } catch (error) {
      console.error("Refresh failed", error);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <div className="flex flex-col gap-8 sm:gap-10 py-8 sm:py-12">
      {/* Header Section */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-white/10 pb-8">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs font-bold tracking-[0.2em] text-emerald-400 uppercase">
              Live Dashboard
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {dashboard.surveyTitle}
          </h1>
          {dashboard.surveyDescription && (
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl">
              {dashboard.surveyDescription}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isValidating || isManualRefreshing}
            className="group relative overflow-hidden rounded-xl bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isValidating || isManualRefreshing ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Mise à jour...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Actualiser</span>
                </>
              )}
            </span>
            {/* Hover shine effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-linear-to-r from-transparent via-white/20 to-transparent z-0" />
          </button>
          
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl bg-white/5 border border-white/10 px-6 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Déconnexion</span>
            </span>
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 flex items-center gap-3">
          <svg
            className="w-5 h-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            Erreur lors du chargement des données. Vérifiez votre clé API
            Drag&apos;n Survey.
          </span>
        </div>
      ) : null}

      <SummaryCards
        data={dashboard}
        isRefreshing={isValidating || isManualRefreshing}
      />

      <QuestionBreakdown insights={dashboard.questionInsights} />
    </div>
  );
};
