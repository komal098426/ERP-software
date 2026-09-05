"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowRight, ShieldCheck, Clock } from "lucide-react";

interface Props {
  gatePasses?: any[];
}

export function RecentActivityFeed({ gatePasses = [] }: Props) {
  const defaultPasses = [
    {
      id: "gp-1",
      number: "OGP-2027008415",
      type: "OGP",
      party: "VENUS & MARS ATTIRE",
      material: "Carton & Poly Bag Sticker Ean# 4050136425730",
      date: "2026-08-24",
      status: "completed",
      qty: "300.00 Nos",
    },
    {
      id: "gp-2",
      number: "OGP-272",
      type: "OGP",
      party: "COMFORT",
      material: "2THTERRY Fabric Dispatch",
      date: "2020-08-22",
      status: "completed",
      qty: "3,824.50 kg",
    },
    {
      id: "gp-3",
      number: "IGP-165",
      type: "IGP",
      party: "COMFORT",
      material: "20/1 CVC Yarn Inward",
      date: "2020-10-08",
      status: "received",
      qty: "1,179.36 kg",
    },
    {
      id: "gp-4",
      number: "OGP-261",
      type: "OGP",
      party: "COMFORT",
      material: "2THTERRY Fabric Dispatch",
      date: "2020-12-08",
      status: "completed",
      qty: "2,901.00 kg",
    },
    {
      id: "gp-5",
      number: "IGP-162",
      type: "IGP",
      party: "LEATHER TEX",
      material: "20/1 & 16/1 CVC Yarn",
      date: "2018-12-03",
      status: "received",
      qty: "768.76 kg",
    },
  ];

  const list = gatePasses && gatePasses.length > 0 ? gatePasses : defaultPasses;

  return (
    <div className="flex flex-col divide-y divide-slate-100 text-xs">
      {list.slice(0, 5).map((item, idx) => {
        const isOGP = item.type === "OGP" || item.gate_pass_number?.startsWith("OGP");
        const gpNo = item.gate_pass_number || item.number;
        const partyName = item.party_name || item.party;
        const material = item.material;
        const date = item.date;
        const status = item.status || "completed";

        return (
          <div key={idx} className="p-3 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-[11px] ${
                  isOGP ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {isOGP ? "OGP" : "IGP"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-navy-950 font-mono">{gpNo}</span>
                  <Badge variant={status === "completed" ? "success" : "default"} className="text-[9px] py-0 px-1.5">
                    {status}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-700 truncate font-medium mt-0.5">
                  {partyName} — <span className="text-slate-500">{material}</span>
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="font-mono text-slate-800 font-bold block">
                {item.quantity ? `${parseFloat(item.quantity).toLocaleString()} kg` : item.qty}
              </span>
              <span className="text-[10px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                <Clock className="h-3 w-3" /> {date}
              </span>
            </div>
          </div>
        );
      })}

      <div className="p-2.5 bg-slate-50/50 text-center">
        <Link
          href="/gate-pass/ogp"
          className="text-xs font-semibold text-navy-800 hover:text-blue-600 inline-flex items-center gap-1"
        >
          View All Gate Passes <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
