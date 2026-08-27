"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changeEmployeeStatus, getEmployee, listAttendance } from "@/lib/api-client";
import { canWrite } from "@/lib/permissions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RequireAuth } from "@/components/require-auth";
import { AttendanceTable } from "@/components/tables/AttendanceTable";
import { AttendanceForm } from "@/components/forms/AttendanceForm";
import type { EmployeeStatus } from "@/types";

const NEXT_STATUS: Partial<Record<EmployeeStatus, EmployeeStatus[]>> = {
  candidate: ["active"],
  active: ["inactive", "resigned", "terminated"],
  inactive: ["active"],
  resigned: ["active"],
  terminated: ["active"],
};

function EmployeeDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<EmployeeStatus | null>(null);

  const { data: employee, isLoading } = useQuery({
    queryKey: ["employees", id],
    queryFn: () => getEmployee(id),
  });

  const { data: attendance, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ["attendance", id],
    queryFn: () => listAttendance(id),
    enabled: !!employee,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: EmployeeStatus) => changeEmployeeStatus(id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setPendingStatus(null);
    },
  });

  if (isLoading) return <p className="text-sm text-slate-400">Loading...</p>;
  if (!employee) return <p className="text-sm text-slate-400">Employee not found.</p>;

  const canEdit = canWrite(currentUser, "employees");
  const canMarkAttendance = canWrite(currentUser, "attendance");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/employees")} className="mb-2 -ml-3">
            ← Back to Employees
          </Button>
          <h1 className="text-xl font-semibold text-navy-900">{employee.full_name}</h1>
          <p className="text-sm text-slate-500">{employee.employee_code}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={employee.status === "active" ? "success" : "muted"}>{employee.status}</Badge>
          {canEdit
            ? (NEXT_STATUS[employee.status] ?? []).map((next) => (
                <Button key={next} variant="outline" onClick={() => setPendingStatus(next)}>
                  Mark {next}
                </Button>
              ))
            : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-400">National ID</p>
            <p className="text-navy-900">{employee.national_id ?? "—"}</p>
          </div>
          <div>
            <p className="text-slate-400">Department</p>
            <p className="text-navy-900">{employee.department ?? "—"}</p>
          </div>
          <div>
            <p className="text-slate-400">Phone</p>
            <p className="text-navy-900">{employee.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-slate-400">Email</p>
            <p className="text-navy-900">{employee.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-slate-400">Designation</p>
            <p className="text-navy-900">{employee.designation ?? "—"}</p>
          </div>
          <div>
            <p className="text-slate-400">Joining Date</p>
            <p className="text-navy-900">{employee.joining_date ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Attendance</CardTitle>
          {canMarkAttendance ? (
            <Button size="sm" variant="outline" onClick={() => setShowAttendanceForm((v) => !v)}>
              {showAttendanceForm ? "Close" : "Mark Attendance"}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {showAttendanceForm ? <AttendanceForm employeeId={id} onMarked={() => setShowAttendanceForm(false)} /> : null}
          {isLoadingAttendance ? <p className="text-sm text-slate-400">Loading...</p> : <AttendanceTable records={attendance ?? []} />}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingStatus !== null}
        title={`Mark employee as ${pendingStatus ?? ""}?`}
        description="Historical attendance and other records will remain available regardless of status."
        confirmLabel="Confirm"
        isConfirming={statusMutation.isPending}
        onConfirm={() => pendingStatus && statusMutation.mutate(pendingStatus)}
        onCancel={() => setPendingStatus(null)}
      />
    </div>
  );
}

export default function EmployeeDetailPage() {
  return (
    <RequireAuth>
      <EmployeeDetailContent />
    </RequireAuth>
  );
}
