import type { CurrentUser } from "@/types";

// Mirrors the module/action grants seeded in backend/app/seed.py (which itself mirrors SRD §6).
// This is UI convenience only (hide/show controls, nav visibility) -- the backend re-checks every
// request via `require_permission`, so a stale or bypassed frontend check can never grant real
// access; a role with no grant for a module simply never sees it in the nav.
type Access = "read" | "write";

const PERMISSIONS: Record<string, Record<string, Access>> = {
  Admin: {
    dashboard: "write", parties: "write", transactions: "write", yarn_ledger: "write",
    reconciliation: "write", analytics: "write", reports: "write", employees: "write",
    attendance: "write", hrms: "write", users: "write", settings: "write", audit_logs: "read",
  },
  Manager: {
    dashboard: "read", parties: "write", transactions: "write", yarn_ledger: "write",
    reconciliation: "read", analytics: "read", reports: "read", employees: "read", attendance: "read",
  },
  HR: {
    dashboard: "read", parties: "read", analytics: "read", reports: "read",
    employees: "write", attendance: "write", hrms: "write",
  },
  Finance: {
    dashboard: "read", parties: "write", transactions: "write", yarn_ledger: "write",
    reconciliation: "write", analytics: "read", reports: "write",
  },
  Viewer: {
    dashboard: "read", parties: "read", transactions: "read", yarn_ledger: "read",
    reconciliation: "read", analytics: "read", reports: "read", employees: "read", attendance: "read",
  },
};

function accessFor(user: CurrentUser | null | undefined, module: string): Access | undefined {
  if (!user) return undefined;
  const grants = user.roles.map((role) => PERMISSIONS[role]?.[module]).filter(Boolean);
  if (grants.includes("write")) return "write";
  if (grants.includes("read")) return "read";
  return undefined;
}

export function canWrite(user: CurrentUser | null | undefined, module: string): boolean {
  return accessFor(user, module) === "write";
}

export function canRead(user: CurrentUser | null | undefined, module: string): boolean {
  return accessFor(user, module) !== undefined;
}
