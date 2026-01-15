import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getDashboardDataWithFallback } from "@/lib/dashboard";

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
