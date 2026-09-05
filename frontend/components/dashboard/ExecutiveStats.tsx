"use client";

import { Card, CardContent } from "@/components/ui/card";
import { 
  Package, 
  ArrowDownRight, 
  ArrowUpRight, 
  DollarSign, 
  AlertTriangle, 
  Building2 
} from "lucide-react";

interface StatsProps {
  data: any;
  isLoading: boolean;
  gatePassCount?: number;
}

function fmt(val: string | number | undefined, decimals = 0): string {
  if (val === undefined || val === null) return "0";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "0";
  return n.toLocaleString("en-PK", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function ExecutiveStats({ data, isLoading, gatePassCount = 0 }: StatsProps) {
  const received = parseFloat(data?.total_received_kg || "0");
  const dispatched = parseFloat(data?.total_dispatched_kg || "0");
  const balance = parseFloat(data?.balance_kg || "0");
  const loss = parseFloat(data?.total_loss_kg || "0");
  const billed = parseFloat(data?.total_billed_amount || "0");
  const parties = data?.party_count || 0;

  const lossPercentage = received > 0 ? ((loss / received) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* 1. Net Stock Balance */}
      <Card className="border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-slate-50/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Stock In Hand
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-black text-navy-950">
              {isLoading ? "..." : `${fmt(balance, 1)} kg`}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Net current yarn stock
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
              balance >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}>
              {balance >= 0 ? "Normal" : "Deficit"}
            </span>
            <span className="text-[10px] text-slate-400">Warehouse stock</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Total Yarn Received */}
      <Card className="border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-emerald-50/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Yarn Received
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-black text-emerald-900">
              {isLoading ? "..." : `${fmt(received, 1)} kg`}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {data?.yarn_entry_count || 0} incoming entries
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Inward
            </span>
            <span className="text-[10px] text-slate-400">Raw yarn intake</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Total Fabric Dispatched */}
      <Card className="border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-indigo-50/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Dispatched
            </span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-black text-indigo-900">
              {isLoading ? "..." : `${fmt(dispatched, 1)} kg`}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Finished knitted fabric
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
              Outward
            </span>
            <span className="text-[10px] text-slate-400">Fabric delivery</span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Total Billed Amount */}
      <Card className="border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-amber-50/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Billed
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-black text-slate-900">
              {isLoading ? "..." : `Rs ${fmt(billed, 0)}`}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Production revenue
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
              PKR
            </span>
            <span className="text-[10px] text-slate-400">Knitting charges</span>
          </div>
        </CardContent>
      </Card>

      {/* 5. Process Loss / Wastage */}
      <Card className="border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-rose-50/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Process Loss
            </span>
            <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-black text-rose-900">
              {isLoading ? "..." : `${fmt(loss, 1)} kg`}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Standard tolerance: 2.0%
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
              {lossPercentage}% Loss
            </span>
            <span className="text-[10px] text-slate-400">Efficiency</span>
          </div>
        </CardContent>
      </Card>

      {/* 6. Active Partner Mills */}
      <Card className="border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-sky-50/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Mills
            </span>
            <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-black text-navy-950">
              {isLoading ? "..." : parties}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {gatePassCount} Gate Passes
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
              Connected
            </span>
            <span className="text-[10px] text-slate-400">Accounts active</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
