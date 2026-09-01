"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MonthlyPoint } from "@/types";

interface Props {
  trend: MonthlyPoint[] | undefined;
  loading: boolean;
}

function fmtMonth(m: string): string {
  const [y, mo] = m.split("-");
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString("en-PK", { month: "short", year: "2-digit" });
}

export default function YarnChart({ trend, loading }: Props) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
        Loading chart…
      </div>
    );
  }

  if (!trend || trend.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
        No data for the selected period
      </div>
    );
  }

  const chartData = trend.map((p) => ({
    name: fmtMonth(p.month),
    "Received (kg)": parseFloat(p.received_kg),
    "Dispatched (kg)": parseFloat(p.dispatched_kg),
    "Billed (Rs)": parseFloat(p.billed_amount),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="kg"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v: number) => `${v.toLocaleString()}`}
        />
        <YAxis
          yAxisId="rs"
          orientation="right"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
          }
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
          formatter={(value: number, name: string) => {
            if (name === "Billed (Rs)")
              return [`Rs ${value.toLocaleString()}`, name];
            return [`${value.toLocaleString()} kg`, name];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
        <Bar
          yAxisId="kg"
          dataKey="Received (kg)"
          fill="#10b981"
          radius={[3, 3, 0, 0]}
        />
        <Bar
          yAxisId="kg"
          dataKey="Dispatched (kg)"
          fill="#3b82f6"
          radius={[3, 3, 0, 0]}
        />
        <Bar
          yAxisId="rs"
          dataKey="Billed (Rs)"
          fill="#6366f1"
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
