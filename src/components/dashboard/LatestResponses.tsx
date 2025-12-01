import { LatestResponse } from "@/lib/types";

type LatestResponsesProps = {
  responses: LatestResponse[];
};

export const LatestResponses = ({ responses }: LatestResponsesProps) => {
  return (
    <section className="rounded-2xl border-2 border-slate-600 bg-slate-800 p-6 shadow-2xl hover:border-emerald-400 hover:shadow-emerald-500/20 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/60">Dernières réponses</p>
          <p className="text-2xl font-semibold text-white">
            {responses.length} plus récentes
          </p>
        </div>
      </div>
      <div className="mt-6 divide-y divide-white/10">
        {responses.map((response) => (
          <article key={response.id} className="py-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-white">{response.id}</p>
              <p className="text-white/60">
                {response.submittedAt
                  ? new Date(response.submittedAt).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Date inconnue"}
              </p>
            </div>
            <ul className="mt-2 flex flex-wrap gap-2 text-white/70">
              {response.answersPreview.map((answer) => (
                <li
                  key={`${response.id}-${answer.question}`}
                  className="rounded-full bg-white/10 px-3 py-1"
                >
                  <span className="text-white/50">{answer.question}: </span>
                  {answer.value || "—"}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
};

