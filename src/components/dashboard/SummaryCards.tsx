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
      color: "from-blue-400 to-cyan-300",
      icon: (
        <svg
          className="w-5 h-5 text-cyan-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      label: "Taux de complétion",
      value: `${data.completionRate}%`,
      trend: "objectif ≥ 85%",
      color: "from-emerald-400 to-teal-300",
      icon: (
        <svg
          className="w-5 h-5 text-emerald-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: "Réponses / jour",
      value: data.averagePerDay.toString(),
      trend: `${data.responseVelocity.slice(-7).reduce((acc, point) => acc + point.count, 0)} dernières 7j`,
      color: "from-purple-400 to-pink-300",
      icon: (
        <svg
          className="w-5 h-5 text-purple-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
    {
      label: "Dernière maj",
      value: new Date(data.updatedAt).toLocaleString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      subValue: new Date(data.updatedAt).toLocaleString("fr-FR", {
        day: "numeric",
        month: "short",
      }),
      trend: "Données temps réel",
      color: "from-amber-400 to-orange-300",
      icon: (
        <svg
          className="w-5 h-5 text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <section className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group"
        >
          {/* Ambient background glow on hover */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all duration-500" />

          <div className="flex items-start justify-between mb-4 relative z-10">
            <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
              {item.label}
            </p>
            <div className="p-2 rounded-lg bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
              {item.icon}
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <h3
                className={`text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br ${item.color}`}
              >
                {item.value}
              </h3>
              {item.subValue && (
                <span className="text-sm text-slate-400 font-medium">
                  {item.subValue}
                </span>
              )}
              {isRefreshing && (
                <span className="animate-pulse text-white/50">...</span>
              )}
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500 group-hover:text-slate-400 transition-colors">
              {item.trend}
            </p>
          </div>
        </article>
      ))}
    </section>
  );
};
