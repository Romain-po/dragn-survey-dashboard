import { NextResponse } from "next/server";

import { getDashboardDataWithFallback } from "@/lib/dashboard";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days");
  const days = daysParam ? Number(daysParam) : undefined;

  try {
    const data = await getDashboardDataWithFallback({
      days: Number.isNaN(days) ? undefined : days,
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
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

