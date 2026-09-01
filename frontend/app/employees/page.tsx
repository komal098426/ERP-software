"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changeEmployeeStatus, listEmployees } from "@/lib/api-client";
import { canWrite } from "@/lib/permissions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { EmployeesTable } from "@/components/tables/EmployeesTable";
import { EmployeeForm } from "@/components/forms/EmployeeForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RequireAuth } from "@/components/require-auth";
import type { Employee, EmployeeCreateResponse, EmployeeStatus } from "@/types";

function EmployeesContent() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ employee: Employee; next: EmployeeStatus } | null>(null);
  const { data: currentUser } = useCurrentUser();
  const canAdd = canWrite(currentUser, "employees");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["employees", "list", search],
    queryFn: () => listEmployees({ q: search || undefined }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: EmployeeStatus }) => changeEmployeeStatus(id, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setPendingChange(null);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-navy-900">Employees</h1>
        {canAdd ? <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "Add Employee"}</Button> : null}
      </div>

      {showForm && canAdd ? (
        <EmployeeForm
          onCreated={(response: EmployeeCreateResponse) => {
            if (response.duplicate_warning.length === 0) setShowForm(false);
          }}
        />
      ) : null}

      <Input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : (
          <EmployeesTable
            employees={data?.data ?? []}
            canEdit={canAdd}
            onRequestStatusChange={(employee, next) => setPendingChange({ employee, next })}
          />
        )}
      </div>

      <ConfirmDialog
        open={pendingChange !== null}
        title={`Mark ${pendingChange?.employee.full_name ?? ""} as ${pendingChange?.next ?? ""}?`}
        description="Historical attendance and other records will remain available regardless of status."
        confirmLabel="Confirm"
        isConfirming={statusMutation.isPending}
        onConfirm={() => pendingChange && statusMutation.mutate({ id: pendingChange.employee.id, next: pendingChange.next })}
        onCancel={() => setPendingChange(null)}
      />
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <RequireAuth>
      <EmployeesContent />
    </RequireAuth>
  );
}
