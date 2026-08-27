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
  const menuRef = useRef<HTMLDivElement>(null);

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

  const visibleLinks = LINKS.filter((link) => canRead(user, link.module));
  const primaryRole = user?.roles[0];

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-navy-900 text-white">
      <div className="px-4 py-4 text-sm font-semibold tracking-wide">ERP Dashboard</div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {visibleLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block rounded-md px-3 py-2 text-sm ${
              pathname?.startsWith(link.href)
                ? "bg-navy-800 font-semibold text-white"
                : "text-slate-300 hover:bg-navy-800 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        ))}
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
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-navy-800"
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
