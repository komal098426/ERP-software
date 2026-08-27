import type { YarnLedgerEntry } from "@/types";
import { Badge } from "@/components/ui/badge";

const TYPE_VARIANT: Record<YarnLedgerEntry["movement_type"], "success" | "warning" | "default"> = {
  received: "success",
  returned: "warning",
  dispatched: "default",
};

const TYPE_LABEL: Record<YarnLedgerEntry["movement_type"], string> = {
  received: "Received",
  returned: "Returned",
  dispatched: "Dispatched",
};

export function YarnLedgerTable({ entries }: { entries: YarnLedgerEntry[] }) {
  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No yarn/fabric entries for this party yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="py-2 pr-4 font-medium">Date</th>
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 pr-4 font-medium">IGP / OGP</th>
            <th className="py-2 pr-4 font-medium">Count / Fabric</th>
            <th className="py-2 pr-4 font-medium text-right">Bags</th>
            <th className="py-2 pr-4 font-medium text-right">KG</th>
            <th className="py-2 pr-4 font-medium text-right">Loss (KG)</th>
            <th className="py-2 pr-4 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">{entry.date}</td>
              <td className="py-2 pr-4">
                <Badge variant={TYPE_VARIANT[entry.movement_type]}>{TYPE_LABEL[entry.movement_type]}</Badge>
              </td>
              <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">
                {entry.igp_number ?? entry.ogp_number ?? "—"}
              </td>
              <td className="py-2 pr-4">{entry.fabric_description ?? entry.yarn_count}</td>
              <td className="py-2 pr-4 text-right">{entry.bags ?? "—"}</td>
              <td className="py-2 pr-4 text-right font-medium text-navy-900">{entry.kg}</td>
              <td className="py-2 pr-4 text-right text-slate-500">{entry.loss_kg !== "0.00" ? entry.loss_kg : "—"}</td>
              <td className="py-2 pr-4 text-right font-medium text-navy-900">
                {entry.amount !== "0.00" ? entry.amount : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
