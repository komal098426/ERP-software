"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { fetchAnalyticsSummary } from "@/lib/api-client";
import { usePartyFilter } from "@/hooks/usePartyFilter";
import { PartyFilter } from "@/components/filters/PartyFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequireAuth } from "@/components/require-auth";

// Recharts uses browser-only APIs — dynamic import with ssr:false prevents the
// "window is not defined" / blank-chart issue in Next.js App Router.
const YarnChart = dynamic(() => import("@/components/dashboard/YarnChart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
      Loading chart…
    </div>
  ),
});

// ── helpers ────────────────────────────────────────────────────────────────

function fmt(val: string | number | undefined, decimals = 0): string {
  if (val === undefined || val === null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return n.toLocaleString("en-PK", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── stat card ──────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  loading,
  accent,
}: {
  title: string;
  value: string;
  sub?: string;
  loading: boolean;
  accent?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        <p className={`text-2xl font-bold ${accent ?? "text-navy-900"}`}>
          {loading ? "…" : value}
        </p>
        {sub && !loading && (
          <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── main dashboard ─────────────────────────────────────────────────────────

function DashboardContent() {
  const { activePartyId } = usePartyFilter();
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-summary", activePartyId],
    queryFn: () => fetchAnalyticsSummary(activePartyId ?? undefined),
  });

  return (
    <div className="flex flex-col gap-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-navy-900">Dashboard</h1>
        <PartyFilter />
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          title={activePartyId ? "Party" : "Total Parties"}
          value={fmt(data?.party_count)}
          loading={isLoading}
        />
        <StatCard
          title="Yarn Entries"
          value={fmt(data?.yarn_entry_count)}
          loading={isLoading}
        />
        <StatCard
          title="Received"
          value={`${fmt(data?.total_received_kg, 2)} kg`}
          loading={isLoading}
          accent="text-emerald-700"
        />
        <StatCard
          title="Balance (Stock)"
          value={`${fmt(data?.balance_kg, 2)} kg`}
          sub={`Dispatched ${fmt(data?.total_dispatched_kg, 2)} kg`}
          loading={isLoading}
          accent="text-blue-700"
        />
        <StatCard
          title="Total Billed"
          value={`Rs ${fmt(data?.total_billed_amount, 0)}`}
          sub={`Loss ${fmt(data?.total_loss_kg, 2)} kg`}
          loading={isLoading}
          accent="text-indigo-700"
        />
      </div>

      {/* monthly trend chart — loaded client-side only */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Yarn Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <YarnChart trend={data?.monthly_trend} loading={isLoading} />
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400">
        Reconciliation, HR/attendance, and the full analytics formula set land with their respective modules.
      </p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Suspense>
        <DashboardContent />
      </Suspense>
    </RequireAuth>
  );
}
