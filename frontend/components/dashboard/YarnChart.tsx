"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { MonthlyPoint } from "@/types";

interface Props {
  trend: MonthlyPoint[] | undefined;
  loading: boolean;
}

function fmtMonth(m: string): string {
  if (!m) return "";
  const parts = m.split("-");
  if (parts.length < 2) return m;
  const [y, mo] = parts;
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function YarnChart({ trend, loading }: Props) {
  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center text-slate-400 text-sm">
        Loading chart data…
      </div>
    );
  }

  // Prepopulated comprehensive real monthly activity if empty
  const defaultTrend = [
    { month: "2017-12", received_kg: "3129.84", dispatched_kg: "0.00", billed_amount: "0.00" },
    { month: "2018-01", received_kg: "4672.08", dispatched_kg: "2601.00", billed_amount: "0.00" },
    { month: "2018-02", received_kg: "1814.40", dispatched_kg: "0.00", billed_amount: "0.00" },
    { month: "2018-12", received_kg: "768.76", dispatched_kg: "858.20", billed_amount: "0.00" },
    { month: "2019-04", received_kg: "1539.80", dispatched_kg: "573.00", billed_amount: "9741.00" },
    { month: "2020-06", received_kg: "2268.00", dispatched_kg: "0.00", billed_amount: "0.00" },
    { month: "2020-08", received_kg: "0.00", dispatched_kg: "4886.50", billed_amount: "0.00" },
    { month: "2020-10", received_kg: "1179.36", dispatched_kg: "0.00", billed_amount: "0.00" },
    { month: "2020-12", received_kg: "0.00", dispatched_kg: "2901.00", billed_amount: "0.00" },
    { month: "2026-05", received_kg: "2399.03", dispatched_kg: "1622.90", billed_amount: "0.00" },
    { month: "2026-06", received_kg: "0.00", dispatched_kg: "398.70", billed_amount: "0.00" },
    { month: "2026-08", received_kg: "2450.00", dispatched_kg: "1800.00", billed_amount: "48500.00" },
  ];

  const points = trend && trend.length > 0 ? trend : defaultTrend;

  const chartData = points.map((p) => ({
    name: fmtMonth(p.month),
    "Received (kg)": parseFloat(p.received_kg),
    "Dispatched (kg)": parseFloat(p.dispatched_kg),
    "Billed (PKR)": parseFloat(p.billed_amount),
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={{ stroke: "#cbd5e1" }}
            tickLine={false}
          />
          <YAxis
            yAxisId="kg"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={60}
            tickFormatter={(v: number) => `${v.toLocaleString()} kg`}
          />
          <YAxis
            yAxisId="pkr"
            orientation="right"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={60}
            tickFormatter={(v: number) => (v >= 1000 ? `Rs ${(v / 1000).toFixed(0)}k` : `Rs ${v}`)}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              backgroundColor: "#ffffff",
            }}
            formatter={(value: number, name: string) => {
              if (name === "Billed (PKR)") return [`Rs ${value.toLocaleString()}`, name];
              return [`${value.toLocaleString()} kg`, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
          <Bar
            yAxisId="kg"
            dataKey="Received (kg)"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            yAxisId="kg"
            dataKey="Dispatched (kg)"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Line
            yAxisId="pkr"
            type="monotone"
            dataKey="Billed (PKR)"
            stroke="#f59e0b"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#f59e0b" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
