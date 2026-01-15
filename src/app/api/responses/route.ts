import { NextResponse } from "next/server";

import { getDashboardDataWithFallback } from "@/lib/dashboard";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days");
  const days = daysParam ? Number(daysParam) : undefined;
  const refreshParam = searchParams.get("refresh");
  const forceRefresh = refreshParam === "true";

  try {
    const data = await getDashboardDataWithFallback({
      days: Number.isNaN(days) ? undefined : days,
      forceRefresh,
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": forceRefresh 
          ? "no-store, max-age=0" 
          : "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
        "CDN-Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Failed to serve /api/responses", error);
    return NextResponse.json(
      { message: "Impossible de récupérer les réponses." },
      { status: 500 },
    );
  }
}

