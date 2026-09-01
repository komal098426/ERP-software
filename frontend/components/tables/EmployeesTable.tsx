import Link from "next/link";
import type { Employee, EmployeeStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_VARIANT: Record<Employee["status"], "success" | "warning" | "muted"> = {
  candidate: "warning",
  active: "success",
  inactive: "muted",
  resigned: "muted",
  terminated: "muted",
};

export function EmployeesTable({
  employees,
  canEdit = false,
  onRequestStatusChange,
}: {
  employees: Employee[];
  canEdit?: boolean;
  onRequestStatusChange?: (employee: Employee, next: EmployeeStatus) => void;
}) {
  if (employees.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No employees found.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-slate-500">
          <th className="py-2 pr-4 font-medium">Code</th>
          <th className="py-2 pr-4 font-medium">Name</th>
          <th className="py-2 pr-4 font-medium">Department</th>
          <th className="py-2 pr-4 font-medium">Contact</th>
          <th className="py-2 pr-4 font-medium">Status</th>
          {canEdit ? <th className="py-2 pr-4 font-medium">Action</th> : null}
        </tr>
      </thead>
      <tbody>
        {employees.map((employee) => (
          <tr key={employee.id} className="border-b border-slate-100 hover:bg-slate-50">
            <td className="py-2 pr-4 text-slate-500">{employee.employee_code}</td>
            <td className="py-2 pr-4">
              <Link href={`/employees/${employee.id}`} className="font-medium text-navy-900 hover:underline">
                {employee.full_name}
              </Link>
            </td>
            <td className="py-2 pr-4 text-slate-500">{employee.department ?? "—"}</td>
            <td className="py-2 pr-4 text-slate-500">{employee.phone ?? employee.email ?? "—"}</td>
            <td className="py-2 pr-4">
              <Badge variant={STATUS_VARIANT[employee.status]}>{employee.status}</Badge>
            </td>
            {canEdit ? (
              <td className="py-2 pr-4">
                {employee.status === "active" ? (
                  <Button size="sm" variant="outline" onClick={() => onRequestStatusChange?.(employee, "inactive")}>
                    Deactivate
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => onRequestStatusChange?.(employee, "active")}>
                    Activate
                  </Button>
                )}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
