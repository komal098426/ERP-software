import type { AttendanceRecord } from "@/types";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<AttendanceRecord["status"], "success" | "warning" | "muted"> = {
  present: "success",
  late: "warning",
  half_day: "warning",
  absent: "muted",
  leave: "muted",
  holiday: "muted",
  weekend: "muted",
};

export function AttendanceTable({ records }: { records: AttendanceRecord[] }) {
  if (records.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No attendance recorded yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
      <thead>
        <tr className="border-b border-slate-200 text-slate-500">
          <th className="py-2 pr-4 font-medium">Date</th>
          <th className="py-2 pr-4 font-medium">Status</th>
          <th className="py-2 pr-4 font-medium">Check In</th>
          <th className="py-2 pr-4 font-medium">Check Out</th>
          <th className="py-2 pr-4 font-medium text-right">Hours</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
            <td className="py-2 pr-4 text-slate-500">{record.date}</td>
            <td className="py-2 pr-4">
              <Badge variant={STATUS_VARIANT[record.status]}>{record.status.replace("_", " ")}</Badge>
            </td>
            <td className="py-2 pr-4">{record.check_in ?? "—"}</td>
            <td className="py-2 pr-4">{record.check_out ?? "—"}</td>
            <td className="py-2 pr-4 text-right font-medium text-navy-900">{record.working_hours ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
