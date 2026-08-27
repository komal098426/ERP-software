"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTransaction } from "@/lib/api-client";
import type { Transaction } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ENTRY_TYPES: Transaction["entry_type"][] = ["receivable", "payable", "payment_in", "payment_out", "adjustment"];

export function TransactionForm({ partyId, onCreated }: { partyId: string; onCreated?: () => void }) {
  const queryClient = useQueryClient();
  const [entryType, setEntryType] = useState<Transaction["entry_type"]>("receivable");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", partyId] });
      queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      setAmount("");
      setDescription("");
      onCreated?.();
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({ party_id: partyId, entry_type: entryType, date, amount, description: description || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="text-sm text-slate-600">
          Type
          <select
            value={entryType}
            onChange={(e) => setEntryType(e.target.value as Transaction["entry_type"])}
            className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm"
          >
            {ENTRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Date
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="mt-1" />
        </label>
        <label className="text-sm text-slate-600">
          Amount
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="mt-1"
          />
        </label>
        <label className="text-sm text-slate-600 sm:col-span-1">
          Description
          <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
        </label>
      </div>

      {mutation.isError ? <p className="text-sm text-red-600">{(mutation.error as Error).message}</p> : null}

      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {mutation.isPending ? "Adding..." : "Add Transaction"}
      </Button>
    </form>
  );
}
