"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { TrendPoint } from "@/lib/types";

type ResponseVelocityChartProps = {
  points: TrendPoint[];
};

export const ResponseVelocityChart = ({
  points,
}: ResponseVelocityChartProps) => {
  return (
    <section className="rounded-2xl border-2 border-slate-600 bg-slate-800 p-6 shadow-2xl hover:border-cyan-400 hover:shadow-cyan-500/20 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/60">Volume de réponses</p>
          <p className="text-2xl font-semibold text-white">
            {points.reduce((acc, point) => acc + point.count, 0)} réponses
          </p>
        </div>
      </div>
      <div className="mt-6 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points}>
            <defs>
              <linearGradient id="velocity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="15%" stopColor="rgb(255,255,255)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="rgb(255,255,255)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              stroke="rgba(255,255,255,0.5)"
              tickLine={false}
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "16px",
                color: "white",
              }}
            />
            <Area
              dataKey="count"
              stroke="#38bdf8"
              strokeWidth={3}
              fill="url(#velocity)"
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

