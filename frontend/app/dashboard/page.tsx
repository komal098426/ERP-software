"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAnalyticsSummary } from "@/lib/api-client";
import { usePartyFilter } from "@/hooks/usePartyFilter";
import { PartyFilter } from "@/components/filters/PartyFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequireAuth } from "@/components/require-auth";

function DashboardContent() {
  const { activePartyId } = usePartyFilter();
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-summary", activePartyId],
    queryFn: () => fetchAnalyticsSummary(activePartyId ?? undefined),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-navy-900">Dashboard</h1>
        <PartyFilter />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{activePartyId ? "Party Transactions" : "Total Parties"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-navy-900">
              {isLoading ? "..." : activePartyId ? data?.transaction_count : data?.party_count}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-navy-900">{isLoading ? "..." : data?.transaction_count}</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-slate-500">
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
