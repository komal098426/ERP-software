"use client";

import Link from "next/link";
import type { Party } from "@/types";
import { Badge } from "@/components/ui/badge";

export function PartiesTable({ parties }: { parties: Party[] }) {
  if (parties.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No parties found.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-slate-500">
          <th className="py-2 pr-4 font-medium">Code</th>
          <th className="py-2 pr-4 font-medium">Name</th>
          <th className="py-2 pr-4 font-medium">Type</th>
          <th className="py-2 pr-4 font-medium">Contact</th>
          <th className="py-2 pr-4 font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        {parties.map((party) => (
          <tr key={party.id} className="border-b border-slate-100 hover:bg-slate-50">
            <td className="py-2 pr-4 text-slate-500">{party.party_code}</td>
            <td className="py-2 pr-4">
              <Link href={`/parties/${party.id}`} className="font-medium text-navy-900 hover:underline">
                {party.name}
              </Link>
            </td>
            <td className="py-2 pr-4 capitalize">{party.type}</td>
            <td className="py-2 pr-4 text-slate-500">{party.phone ?? party.email ?? "—"}</td>
            <td className="py-2 pr-4">
              <Badge variant={party.status === "active" ? "success" : "muted"}>{party.status}</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
