import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getDashboardDataWithFallback } from "@/lib/dashboard";

export default async function Home() {
  const dashboard = await getDashboardDataWithFallback({ days: 30 });

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <DashboardShell initialData={dashboard} />
      </div>
    </main>
  );
}
