"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markAttendance } from "@/lib/api-client";
import type { AttendanceStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "half_day", "leave", "holiday", "weekend"];

export function AttendanceForm({ employeeId, onMarked }: { employeeId: string; onMarked?: () => void }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const mutation = useMutation({
    mutationFn: markAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", employeeId] });
      onMarked?.();
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      employee_id: employeeId,
      date,
      status,
      check_in: checkIn ? `${checkIn}:00` : undefined,
      check_out: checkOut ? `${checkOut}:00` : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="text-sm text-slate-600">
          Date
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="mt-1" />
        </label>
        <label className="text-sm text-slate-600">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
            className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Check In
          <Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-1" />
        </label>
        <label className="text-sm text-slate-600">
          Check Out
          <Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-1" />
        </label>
      </div>
      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {mutation.isPending ? "Saving..." : "Mark Attendance"}
      </Button>
    </form>
  );
}
