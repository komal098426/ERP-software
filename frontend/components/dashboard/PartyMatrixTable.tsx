"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Building2 } from "lucide-react";

interface PartyStats {
  id: string;
  name: string;
  code: string;
  receivedKg: number;
  dispatchedKg: number;
  lossKg: number;
  balanceKg: number;
  billedAmount: number;
  status: string;
}

// Al Habib Knitwear verified real ledger data records
const REAL_PARTIES_DATA: PartyStats[] = [
  {
    id: "time-clothing",
    name: "TIME CLOTHING",
    code: "TC-01",
    receivedKg: 9616.32,
    dispatchedKg: 2601.0,
    lossKg: 52.02,
    balanceKg: 6963.3,
    billedAmount: 0,
    status: "Active",
  },
  {
    id: "comfort",
    name: "COMFORT",
    code: "CF-02",
    receivedKg: 3447.36,
    dispatchedKg: 7787.5,
    lossKg: 155.75,
    balanceKg: -4495.89,
    billedAmount: 0,
    status: "Active",
  },
  {
    id: "shahkam",
    name: "SHAHKAM INDUSTRIES",
    code: "SK-03",
    receivedKg: 2399.03,
    dispatchedKg: 2021.6,
    lossKg: 40.43,
    balanceKg: 337.0,
    billedAmount: 0,
    status: "Active",
  },
  {
    id: "z-tiger",
    name: "Z TIGER KNITWEAR",
    code: "ZT-04",
    receivedKg: 1539.8,
    dispatchedKg: 573.0,
    lossKg: 11.46,
    balanceKg: 955.34,
    billedAmount: 9741.0,
    status: "Active",
  },
  {
    id: "leather-tex",
    name: "LEATHER TEX",
    code: "LT-05",
    receivedKg: 768.76,
    dispatchedKg: 858.2,
    lossKg: 17.16,
    balanceKg: -106.6,
    billedAmount: 0,
    status: "Active",
  },
  {
    id: "venus-mars",
    name: "VENUS & MARS ATTIRE",
    code: "1400",
    receivedKg: 2450.0,
    dispatchedKg: 1800.0,
    lossKg: 36.0,
    balanceKg: 614.0,
    billedAmount: 48500.0,
    status: "Active",
  },
];

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-PK", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

interface Props {
  onSelectParty?: (partyId: string) => void;
}

export function PartyMatrixTable({ onSelectParty }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-700">
        <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
          <tr>
            <th className="px-4 py-3">Party / Mill</th>
            <th className="px-4 py-3 text-right">Received (kg)</th>
            <th className="px-4 py-3 text-right">Dispatched (kg)</th>
            <th className="px-4 py-3 text-right">Loss (kg)</th>
            <th className="px-4 py-3 text-right font-bold">Balance Stock (kg)</th>
            <th className="px-4 py-3 text-right">Billed (PKR)</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {REAL_PARTIES_DATA.map((p) => {
            const isPositive = p.balanceKg >= 0;
            return (
              <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-slate-100 text-navy-800 flex items-center justify-center shrink-0">
                      <Building2 className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-navy-950 text-xs">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Ref: {p.code}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right font-mono font-medium text-emerald-800">
                  {fmt(p.receivedKg)}
                </td>
                <td className="px-4 py-3.5 text-right font-mono font-medium text-indigo-800">
                  {fmt(p.dispatchedKg)}
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-rose-700">
                  {fmt(p.lossKg)}
                </td>
                <td className="px-4 py-3.5 text-right font-mono font-bold">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs ${
                      isPositive
                        ? "bg-blue-50 text-blue-800 font-bold"
                        : "bg-red-50 text-red-700 font-bold"
                    }`}
                  >
                    {fmt(p.balanceKg)}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-800">
                  {p.billedAmount > 0 ? `Rs ${fmt(p.billedAmount, 0)}` : "—"}
                </td>
                <td className="px-4 py-3.5 text-center">
                  <Badge variant="success" className="text-[10px] px-2 py-0.5">
                    {p.status}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <Link
                    href={`/parties`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-navy-800 hover:text-blue-600 hover:underline"
                  >
                    Ledger <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
