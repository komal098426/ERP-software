"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clearToken } from "@/lib/api-client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canRead } from "@/lib/permissions";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", module: "dashboard" },
  { href: "/parties", label: "Parties", module: "parties" },
  { href: "/employees", label: "Employees", module: "employees" },
  { href: "/reports", label: "Reports", module: "reports" },
  { href: "/users", label: "Users", module: "users" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [gatePassOpen, setGatePassOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync gatePassOpen state with active path on mount or navigation
  useEffect(() => {
    if (pathname?.startsWith("/gate-pass")) {
      setGatePassOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (pathname?.startsWith("/login") || pathname?.startsWith("/signup")) return null;

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  const primaryRole = user?.roles[0];

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-navy-900 text-white animate-fade-in">
      <div className="px-4 py-4 text-sm font-semibold tracking-wide border-b border-navy-800">
        ERP & Business Dashboard
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* 1. Dashboard */}
        {canRead(user, "dashboard") && (
          <Link
            href="/dashboard"
            className={`block rounded-md px-3 py-2 text-sm transition-all ${
              pathname?.startsWith("/dashboard")
                ? "bg-navy-800 font-semibold text-white shadow-sm"
                : "text-slate-300 hover:bg-navy-800 hover:text-white"
            }`}
          >
            Dashboard
          </Link>
        )}

        {/* 2. Parties */}
        {canRead(user, "parties") && (
          <Link
            href="/parties"
            className={`block rounded-md px-3 py-2 text-sm transition-all ${
              pathname?.startsWith("/parties")
                ? "bg-navy-800 font-semibold text-white shadow-sm"
                : "text-slate-300 hover:bg-navy-800 hover:text-white"
            }`}
          >
            Parties
          </Link>
        )}

        {/* 3. Employees */}
        {canRead(user, "employees") && (
          <Link
            href="/employees"
            className={`block rounded-md px-3 py-2 text-sm transition-all ${
              pathname?.startsWith("/employees")
                ? "bg-navy-800 font-semibold text-white shadow-sm"
                : "text-slate-300 hover:bg-navy-800 hover:text-white"
            }`}
          >
            Employees
          </Link>
        )}

        {/* 4. Users */}
        {canRead(user, "users") && (
          <Link
            href="/users"
            className={`block rounded-md px-3 py-2 text-sm transition-all ${
              pathname?.startsWith("/users")
                ? "bg-navy-800 font-semibold text-white shadow-sm"
                : "text-slate-300 hover:bg-navy-800 hover:text-white"
            }`}
          >
            Users
          </Link>
        )}

        {/* 3. Inventory (Placeholder) */}
        <div className="block rounded-md px-3 py-2 text-sm text-slate-500 cursor-not-allowed select-none opacity-60">
          Inventory
        </div>

        {/* 4. Yarn (Placeholder) */}
        <div className="block rounded-md px-3 py-2 text-sm text-slate-500 cursor-not-allowed select-none opacity-60">
          Yarn
        </div>

        {/* 5. Stores (Placeholder) */}
        <div className="block rounded-md px-3 py-2 text-sm text-slate-500 cursor-not-allowed select-none opacity-60">
          Stores
        </div>

        {/* 6. Gate Pass */}
        {canRead(user, "gate_passes") && (
          <div className="space-y-0.5">
            <button
              onClick={() => setGatePassOpen((v) => !v)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-all ${
                pathname?.startsWith("/gate-pass")
                  ? "bg-navy-800/50 font-semibold text-white"
                  : "text-slate-300 hover:bg-navy-800 hover:text-white"
              }`}
            >
              <span>Gate Pass</span>
              <span className={`text-[10px] transform transition-transform duration-200 ${gatePassOpen ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>
            {gatePassOpen && (
              <div className="pl-4 mt-0.5 space-y-0.5 border-l border-navy-800 ml-3">
                <Link
                  href="/gate-pass/ogp"
                  className={`block rounded-md px-3 py-1.5 text-xs transition-all ${
                    pathname === "/gate-pass/ogp"
                      ? "bg-navy-800 font-semibold text-white shadow-sm"
                      : "text-slate-400 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  OGP - Outward Gate Pass
                </Link>
                <Link
                  href="/gate-pass/igp"
                  className={`block rounded-md px-3 py-1.5 text-xs transition-all ${
                    pathname === "/gate-pass/igp"
                      ? "bg-navy-800 font-semibold text-white shadow-sm"
                      : "text-slate-400 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  IGP - Inward Gate Pass
                </Link>
              </div>
            )}
          </div>
        )}

        {/* 7. Reports */}
        {canRead(user, "reports") && (
          <Link
            href="/reports"
            className={`block rounded-md px-3 py-2 text-sm transition-all ${
              pathname?.startsWith("/reports")
                ? "bg-navy-800 font-semibold text-white shadow-sm"
                : "text-slate-300 hover:bg-navy-800 hover:text-white"
            }`}
          >
            Reports
          </Link>
        )}

        {/* 8. Settings (Placeholder) */}
        <div className="block rounded-md px-3 py-2 text-sm text-slate-500 cursor-not-allowed select-none opacity-60">
          Settings
        </div>
      </nav>

      {user ? (
        <div ref={menuRef} className="relative border-t border-navy-800 p-2">
          {menuOpen ? (
            <div className="absolute bottom-full left-2 right-2 mb-1 rounded-md border border-navy-700 bg-navy-800 p-1 shadow-lg">
              <button
                onClick={handleLogout}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-navy-700 hover:text-white"
              >
                Log out
              </button>
            </div>
          ) : null}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-navy-800 transition-colors"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-700 text-xs font-semibold">
              {user.full_name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{primaryRole}</span>
              <span className="block truncate text-xs text-slate-400">{user.full_name}</span>
            </span>
          </button>
        </div>
      ) : null}
    </aside>
  );
}

