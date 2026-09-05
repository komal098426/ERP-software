"use client";

import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchAnalyticsSummary, listGatePasses, listParties } from "@/lib/api-client";
import { usePartyFilter } from "@/hooks/usePartyFilter";
import { PartyFilter } from "@/components/filters/PartyFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "@/components/require-auth";
import { ExecutiveStats } from "@/components/dashboard/ExecutiveStats";
import { PartyMatrixTable } from "@/components/dashboard/PartyMatrixTable";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { 
  BarChart3, 
  PieChart as PieIcon, 
  FileSpreadsheet, 
  Truck, 
  PlusCircle, 
  Users, 
  Building2,
  Calendar,
  Sparkles
} from "lucide-react";

// Recharts dynamically imported client-side
const YarnChart = dynamic(() => import("@/components/dashboard/YarnChart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center text-slate-400 text-sm">
      Loading chart…
    </div>
  ),
});

const PartyDistributionChart = dynamic(
  () => import("@/components/dashboard/PartyDistributionChart"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
        Loading distribution…
      </div>
    ),
  }
);

function DashboardContent() {
  const { activePartyId } = usePartyFilter();
  const [currentDateStr, setCurrentDateStr] = useState("");

  useEffect(() => {
    const d = new Date();
    setCurrentDateStr(
      d.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  // Fetch summary analytics
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["analytics-summary", activePartyId],
    queryFn: () => fetchAnalyticsSummary(activePartyId ?? undefined),
  });

  // Fetch gate passes
  const { data: gatePassesData } = useQuery({
    queryKey: ["gate-passes", "recent"],
    queryFn: () => listGatePasses({ cursor: undefined }),
  });

  // Fetch parties
  const { data: partiesData } = useQuery({
    queryKey: ["parties", "list", "active"],
    queryFn: () => listParties({ status: "active" }),
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-navy-800">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-md">
            <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight">
                Al Habib Knitwear Dashboard
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                <Sparkles className="h-3 w-3" /> Live ERP
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-2 font-medium">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>{currentDateStr || "Saturday, September 5, 2026"}</span>
              <span className="text-slate-500">•</span>
              <span>Commission Knitting & Production Analytics</span>
            </p>
          </div>
        </div>

        {/* Quick Action Buttons & Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <PartyFilter />
          <Link href="/gate-pass/ogp">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm">
              <Truck className="h-3.5 w-3.5 mr-1.5" /> New OGP
            </Button>
          </Link>
          <Link href="/gate-pass/igp">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm">
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> New IGP
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <ExecutiveStats
        data={summaryData}
        isLoading={isSummaryLoading}
        gatePassCount={gatePassesData?.data?.length || 5}
      />

      {/* 3. Visual Charts Grid (Activity Trend & Party Share) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Inward/Outward Activity & Billing */}
        <Card className="lg:col-span-2 border border-slate-200/90 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-navy-950">
                  Monthly Yarn Activity & Dispatch Trends
                </CardTitle>
                <p className="text-xs text-slate-400">
                  Inward receipts (kg), Outward fabric dispatches (kg), and Billing (PKR)
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              12 Months Trend
            </span>
          </CardHeader>
          <CardContent className="pt-4">
            <YarnChart trend={summaryData?.monthly_trend} loading={isSummaryLoading} />
          </CardContent>
        </Card>

        {/* Right 1 Col: Party Volume Share Donut */}
        <Card className="border border-slate-200/90 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
                <PieIcon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-navy-950">
                  Partner Mills Share
                </CardTitle>
                <p className="text-xs text-slate-400">
                  Volume distribution by client
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <PartyDistributionChart
              parties={partiesData?.data || []}
              loading={isSummaryLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* 4. Operational Tables & Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Comprehensive Mills Ledger Matrix */}
        <Card className="lg:col-span-2 border border-slate-200/90 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-navy-950">
                  Partner Mills Operations & Ledger Summary
                </CardTitle>
                <p className="text-xs text-slate-400">
                  Current balances, intake, dispatches, and process loss per party
                </p>
              </div>
            </div>
            <Link
              href="/parties"
              className="text-xs font-semibold text-navy-800 hover:text-blue-600 hover:underline"
            >
              View Parties →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <PartyMatrixTable />
          </CardContent>
        </Card>

        {/* Right 1 Col: Live Gate Passes & Recent Activity */}
        <Card className="border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-navy-950">
                  Recent Gate Passes
                </CardTitle>
                <p className="text-xs text-slate-400">
                  Recent material dispatch & receipt logs
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <RecentActivityFeed gatePasses={gatePassesData?.data || []} />
          </CardContent>
        </Card>
      </div>

      {/* 5. Bottom Navigation & Departmental Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
        <Link
          href="/gate-pass/ogp"
          className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-3"
        >
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-navy-950 group-hover:text-blue-600">
              Outward Gate Pass (OGP)
            </h4>
            <p className="text-[11px] text-slate-400">Generate dispatch passes</p>
          </div>
        </Link>

        <Link
          href="/gate-pass/igp"
          className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all flex items-center gap-3"
        >
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-navy-950 group-hover:text-emerald-600">
              Inward Gate Pass (IGP)
            </h4>
            <p className="text-[11px] text-slate-400">Record incoming raw yarn</p>
          </div>
        </Link>

        <Link
          href="/parties"
          className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all flex items-center gap-3"
        >
          <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-navy-950 group-hover:text-purple-600">
              Parties & Client Mills
            </h4>
            <p className="text-[11px] text-slate-400">Reconciliation & ledgers</p>
          </div>
        </Link>

        <Link
          href="/reports"
          className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all flex items-center gap-3"
        >
          <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-navy-950 group-hover:text-amber-600">
              Financial & Yarn Reports
            </h4>
            <p className="text-[11px] text-slate-400">Download Excel & PDF</p>
          </div>
        </Link>
      </div>
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
