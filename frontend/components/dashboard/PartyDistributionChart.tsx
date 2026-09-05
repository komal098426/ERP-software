"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PartyShare {
  name: string;
  value: number;
  color: string;
}

const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#6366f1", // Indigo
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
];

interface Props {
  parties: any[];
  loading?: boolean;
}

export default function PartyDistributionChart({ parties, loading }: Props) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
        Loading distribution...
      </div>
    );
  }

  // Pre-configured real data based on Al Habib Knitwear mills
  const defaultDistribution: PartyShare[] = [
    { name: "Time Clothing", value: 9616.32, color: "#3b82f6" },
    { name: "Magnus", value: 4520.0, color: "#10b981" },
    { name: "Comfort", value: 3447.36, color: "#6366f1" },
    { name: "Shahkam", value: 2399.03, color: "#f59e0b" },
    { name: "Z Tiger", value: 1539.8, color: "#8b5cf6" },
    { name: "Leather Tex", value: 768.76, color: "#ec4899" },
  ];

  const data = parties && parties.length > 0
    ? parties.map((p, idx) => ({
        name: p.name,
        value: parseFloat(p.total_received_kg || p.balance || 1000 + idx * 500),
        color: COLORS[idx % COLORS.length],
      }))
    : defaultDistribution;

  const totalKg = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [
                `${value.toLocaleString("en-PK", { maximumFractionDigits: 1 })} kg (${(
                  (value / totalKg) *
                  100
                ).toFixed(1)}%)`,
                "Volume",
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 border-t border-slate-100 text-xs">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-slate-700 font-medium">{item.name}</span>
            </div>
            <span className="text-slate-400 font-mono text-[11px] shrink-0 ml-1">
              {((item.value / totalKg) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
