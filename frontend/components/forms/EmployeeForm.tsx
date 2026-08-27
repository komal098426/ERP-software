"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, createEmployee } from "@/lib/api-client";
import type { EmployeeCreateResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EmployeeForm({ onCreated }: { onCreated?: (response: EmployeeCreateResponse) => void }) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [duplicates, setDuplicates] = useState<EmployeeCreateResponse["duplicate_warning"]>([]);
  const [conflict, setConflict] = useState<{ message: string; employee_id: string } | null>(null);

  const mutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDuplicates(response.duplicate_warning);
      setConflict(null);
      setFullName("");
      setNationalId("");
      setPhone("");
      setEmail("");
      setDepartment("");
      onCreated?.(response);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409 && error.detail && typeof error.detail === "object") {
        setConflict(error.detail as { message: string; employee_id: string });
        return;
      }
      setConflict(null);
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      full_name: fullName,
      national_id: nationalId || undefined,
      phone: phone || undefined,
      email: email || undefined,
      department: department || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-slate-600">
          Full Name
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1" />
        </label>
        <label className="text-sm text-slate-600">
          National ID
          <Input value={nationalId} onChange={(e) => setNationalId(e.target.value)} className="mt-1" placeholder="00000-0000000-0" />
        </label>
        <label className="text-sm text-slate-600">
          Phone
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
        </label>
        <label className="text-sm text-slate-600">
          Email
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
        </label>
        <label className="text-sm text-slate-600">
          Department
          <Input value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1" />
        </label>
      </div>

      {conflict ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {conflict.message}{" "}
          <Link href={`/employees/${conflict.employee_id}`} className="underline">
            View existing record
          </Link>
        </div>
      ) : null}

      {duplicates.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">Similar name already on file:</p>
          <ul className="mt-1 list-disc pl-5">
            {duplicates.map((candidate) => (
              <li key={candidate.id}>
                <Link href={`/employees/${candidate.id}`} className="underline">
                  {candidate.full_name} ({candidate.employee_code})
                </Link>{" "}
                — {candidate.status}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs">The employee above was still created — review for a possible duplicate.</p>
        </div>
      ) : null}

      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {mutation.isPending ? "Adding..." : "Add Employee"}
      </Button>
    </form>
  );
}
