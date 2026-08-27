import type { LedgerSummary } from "@/types";

function Tile({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold ${
          tone === "negative" ? "text-red-600" : tone === "positive" ? "text-emerald-700" : "text-navy-900"
        }`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </p>
    </div>
  );
}

export function YarnLedgerSummary({ summary }: { summary: LedgerSummary }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tile label="Received (kg)" value={summary.total_received_kg} tone="positive" />
        <Tile label="Returned (kg)" value={summary.total_returned_kg} />
        <Tile label="Dispatched (kg)" value={summary.total_dispatched_kg} />
        <Tile label="Loss 2% (kg)" value={summary.total_loss_kg} tone="negative" />
        <Tile label="Balance (kg)" value={summary.balance_kg} />
      </div>

      {summary.count_breakdown.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Yarn count breakdown</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pl-3 pr-4 font-medium">Count / Fabric</th>
                  <th className="py-2 pr-4 font-medium text-right">Received</th>
                  <th className="py-2 pr-4 font-medium text-right">Returned</th>
                  <th className="py-2 pr-4 font-medium text-right">Dispatched</th>
                  <th className="py-2 pr-4 font-medium text-right">Net (kg)</th>
                </tr>
              </thead>
              <tbody>
                {summary.count_breakdown.map((row) => (
                  <tr key={row.yarn_count} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pl-3 pr-4">{row.yarn_count}</td>
                    <td className="py-2 pr-4 text-right">{row.received_kg}</td>
                    <td className="py-2 pr-4 text-right">{row.returned_kg}</td>
                    <td className="py-2 pr-4 text-right">{row.dispatched_kg}</td>
                    <td className="py-2 pr-4 text-right font-medium text-navy-900">{row.net_kg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {summary.date_wise.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Date-wise reconciliation</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pl-3 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium text-right">Received</th>
                  <th className="py-2 pr-4 font-medium text-right">Returned</th>
                  <th className="py-2 pr-4 font-medium text-right">Dispatched</th>
                  <th className="py-2 pr-4 font-medium text-right">Loss 2%</th>
                  <th className="py-2 pr-4 font-medium text-right">Amount</th>
                  <th className="py-2 pr-4 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {summary.date_wise.map((row) => (
                  <tr key={row.date} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pl-3 pr-4 text-slate-500 whitespace-nowrap">{row.date}</td>
                    <td className="py-2 pr-4 text-right">{row.received_kg !== "0.00" ? row.received_kg : "—"}</td>
                    <td className="py-2 pr-4 text-right">{row.returned_kg !== "0.00" ? row.returned_kg : "—"}</td>
                    <td className="py-2 pr-4 text-right">{row.dispatched_kg !== "0.00" ? row.dispatched_kg : "—"}</td>
                    <td className="py-2 pr-4 text-right text-slate-500">{row.loss_kg !== "0.00" ? row.loss_kg : "—"}</td>
                    <td className="py-2 pr-4 text-right">{row.amount !== "0.00" ? row.amount : "—"}</td>
                    <td className="py-2 pr-4 text-right font-medium text-navy-900">{row.running_balance_kg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
