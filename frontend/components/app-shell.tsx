"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Nav } from "@/components/nav";

const BARE_ROUTES = ["/login", "/signup"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isBare = BARE_ROUTES.some((route) => pathname?.startsWith(route));

  if (isBare) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 relative">
      {/* Sidebar */}
      <Nav isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(!isCollapsed)} />

      {/* Main App Container */}
      <div className="flex flex-1 flex-col min-w-0 transition-all duration-300 ease-in-out">
        {/* Top Floating / Slim Toggle Bar */}
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center justify-center rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-navy-900 transition-colors focus:outline-none"
              title={isCollapsed ? "Open sidebar" : "Close sidebar"}
              aria-label="Toggle Sidebar"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {/* ChatGPT style sidebar icon */}
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
                <path d="M9 3v18" strokeWidth={2} />
              </svg>
            </button>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              ERP Portal
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
            <img src="/logo.png" alt="Logo" className="h-6 w-auto object-contain rounded" />
            <span className="hidden sm:inline tracking-tight text-navy-900">Al Habib Knitwear</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 md:px-8 py-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
