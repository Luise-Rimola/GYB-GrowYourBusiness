"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type ChartPoint = {
  date: string;
  value: number;
  confidence?: number;
  rawDate: Date | string;
};

type KpiHistoryChartProps = {
  data: ChartPoint[];
};

export function KpiHistoryChart({ data }: KpiHistoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
        Keine Verlaufsdaten
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.2} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "var(--muted)" }}
            tickLine={{ stroke: "var(--muted)" }}
            axisLine={{ stroke: "var(--card-border)" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--muted)" }}
            tickLine={{ stroke: "var(--muted)" }}
            axisLine={{ stroke: "var(--card-border)" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--card-border)",
              borderRadius: "0.5rem",
            }}
            labelStyle={{ color: "var(--foreground)" }}
            formatter={(value: number) => [value, "Wert"]}
            labelFormatter={(label) => `Datum: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            name="Wert"
            stroke="#0d9488"
            strokeWidth={2}
            dot={{ r: 4, fill: "#0d9488" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
