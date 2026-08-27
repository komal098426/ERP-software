import type { Transaction } from "@/types";
import { Badge } from "@/components/ui/badge";

const ENTRY_TYPE_LABELS: Record<Transaction["entry_type"], string> = {
  receivable: "Receivable",
  payable: "Payable",
  payment_in: "Payment In",
  payment_out: "Payment Out",
  adjustment: "Adjustment",
};

const STATUS_VARIANT: Record<Transaction["payment_status"], "success" | "warning" | "muted"> = {
  paid: "success",
  partial: "warning",
  pending: "muted",
  overdue: "warning",
  cancelled: "muted",
};

export function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No transactions for this party yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-slate-500">
          <th className="py-2 pr-4 font-medium">Date</th>
          <th className="py-2 pr-4 font-medium">Code</th>
          <th className="py-2 pr-4 font-medium">Type</th>
          <th className="py-2 pr-4 font-medium">Description</th>
          <th className="py-2 pr-4 font-medium text-right">Amount</th>
          <th className="py-2 pr-4 font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((txn) => (
          <tr key={txn.id} className="border-b border-slate-100 hover:bg-slate-50">
            <td className="py-2 pr-4 text-slate-500">{txn.date}</td>
            <td className="py-2 pr-4 text-slate-500">{txn.transaction_code}</td>
            <td className="py-2 pr-4">{ENTRY_TYPE_LABELS[txn.entry_type]}</td>
            <td className="py-2 pr-4">{txn.description ?? "—"}</td>
            <td className="py-2 pr-4 text-right font-medium text-navy-900">{txn.amount}</td>
            <td className="py-2 pr-4">
              <Badge variant={STATUS_VARIANT[txn.payment_status]}>{txn.payment_status}</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
