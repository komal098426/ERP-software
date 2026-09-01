"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function GatePassLandingContent() {
  return (
    <div className="flex flex-col gap-8 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Gate Pass Management</h1>
        <p className="text-sm text-slate-500">
          Track inward and outward material movements, generate passes, and manage store allocations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <Link href="/gate-pass/igp" className="group block">
          <Card className="h-full border border-slate-200 transition-all duration-200 group-hover:border-navy-500 group-hover:shadow-md cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 transition-colors group-hover:bg-emerald-200">
                <span className="text-lg font-bold">IGP</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <CardTitle className="text-lg font-semibold text-navy-900 group-hover:text-navy-700 transition-colors">
                Inward Gate Pass (IGP)
              </CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                Record material coming into the factory from vendors and parties. Direct yarn incoming inventory to designated yarn stores.
              </p>
              <div className="mt-6 flex items-center text-sm font-medium text-emerald-700 group-hover:translate-x-1 transition-transform">
                Go to IGP Records →
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/gate-pass/ogp" className="group block">
          <Card className="h-full border border-slate-200 transition-all duration-200 group-hover:border-navy-500 group-hover:shadow-md cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-800 transition-colors group-hover:bg-blue-200">
                <span className="text-lg font-bold">OGP</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <CardTitle className="text-lg font-semibold text-navy-900 group-hover:text-navy-700 transition-colors">
                Outward Gate Pass (OGP)
              </CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                Record material dispatched to other parties. Manage returnable outward movement, set expected returns, and track issue counts.
              </p>
              <div className="mt-6 flex items-center text-sm font-medium text-blue-700 group-hover:translate-x-1 transition-transform">
                Go to OGP Records →
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

export default function GatePassLandingPage() {
  return (
    <RequireAuth>
      <GatePassLandingContent />
    </RequireAuth>
  );
}
