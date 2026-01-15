import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getDashboardDataWithFallback } from "@/lib/dashboard";

// Revalidate this page every 60 seconds (ISR - Incremental Static Regeneration)
// This means: serve cached version, rebuild in background every 60s
export const revalidate = 60;

export default async function Home() {
  const dashboard = await getDashboardDataWithFallback({ days: 30 });

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 md:px-8">
        <DashboardShell initialData={dashboard} />
      </div>
    </main>
  );
}
