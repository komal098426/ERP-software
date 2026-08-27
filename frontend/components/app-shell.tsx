"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/nav";

const BARE_ROUTES = ["/login", "/signup"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_ROUTES.some((route) => pathname?.startsWith(route));

  if (isBare) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <Nav />
      <main className="min-w-0 flex-1 px-6 py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
