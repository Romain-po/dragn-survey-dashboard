import { DashboardData } from "@/lib/types";

type SummaryCardsProps = {
  data: DashboardData;
  isRefreshing?: boolean;
};

export const SummaryCards = ({ data, isRefreshing }: SummaryCardsProps) => {
  const items = [
    {
      label: "Réponses totales",
      value: data.totalResponses.toLocaleString("fr-FR"),
      trend: `${data.completedResponses} complétées`,
    },
    {
      label: "Taux de complétion",
      value: `${data.completionRate}%`,
      trend: "objectif ≥ 85%",
    },
    {
      label: "Réponses / jour",
      value: data.averagePerDay.toString(),
      trend: `${data.responseVelocity.slice(-7).reduce((acc, point) => acc + point.count, 0)} dernières 7j`,
    },
    {
      label: "Actualisation",
      value: new Date(data.updatedAt).toLocaleString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
      }),
      trend: data.periodDays
        ? `Fenêtre ${data.periodDays}j`
        : "Fenêtre complète",
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-2xl border-2 border-slate-600 bg-slate-800 p-5 shadow-2xl hover:border-blue-400 hover:shadow-blue-500/20 transition-all duration-300"
        >
          <p className="text-xs uppercase tracking-wide text-white/60">
            {item.label}
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {item.value}
            {isRefreshing && (
              <span className="ml-2 text-base text-white/60">…</span>
            )}
          </p>
          <p className="mt-1 text-sm text-white/70">{item.trend}</p>
        </article>
      ))}
    </section>
  );
};

