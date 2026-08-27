"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createYarnLedgerEntry } from "@/lib/api-client";
import type { YarnMovementType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MOVEMENT_TYPES: { value: YarnMovementType; label: string }[] = [
  { value: "received", label: "Yarn Received" },
  { value: "returned", label: "Yarn Returned" },
  { value: "dispatched", label: "Fabric Dispatched" },
];

export function YarnLedgerForm({ partyId, onCreated }: { partyId: string; onCreated?: () => void }) {
  const queryClient = useQueryClient();
  const [movementType, setMovementType] = useState<YarnMovementType>("received");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [refNumber, setRefNumber] = useState("");
  const [yarnCount, setYarnCount] = useState("");
  const [bags, setBags] = useState("");
  const [kg, setKg] = useState("");
  const [rate, setRate] = useState("");

  const isDispatch = movementType === "dispatched";

  const mutation = useMutation({
    mutationFn: createYarnLedgerEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yarn-ledger", partyId] });
      queryClient.invalidateQueries({ queryKey: ["yarn-ledger-summary", partyId] });
      setRefNumber("");
      setBags("");
      setKg("");
      setRate("");
      onCreated?.();
    },
  });

  const previewLoss = isDispatch && kg ? (parseFloat(kg) * 0.02).toFixed(2) : null;
  const previewAmount = isDispatch && kg && rate ? (parseFloat(kg) * parseFloat(rate)).toFixed(2) : null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      party_id: partyId,
      movement_type: movementType,
      date,
      yarn_count: yarnCount,
      kg,
      ogp_number: refNumber || undefined,
      bags: !isDispatch && bags ? bags : undefined,
      fabric_description: isDispatch ? yarnCount : undefined,
      knitting_rate: isDispatch && rate ? rate : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="text-sm text-slate-600">
          Type
          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value as YarnMovementType)}
            className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm"
          >
            {MOVEMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Date
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="mt-1" />
        </label>
        <label className="text-sm text-slate-600">
          OGP / IGP #
          <Input value={refNumber} onChange={(e) => setRefNumber(e.target.value)} className="mt-1" placeholder="e.g. 1121" />
        </label>
        <label className="text-sm text-slate-600">
          {isDispatch ? "Fabric Description" : "Yarn Count"}
          <Input
            value={yarnCount}
            onChange={(e) => setYarnCount(e.target.value)}
            required
            className="mt-1"
            placeholder={isDispatch ? "2TH TERRY 20/1*10/1" : "20/1CD"}
          />
        </label>
        {!isDispatch ? (
          <label className="text-sm text-slate-600">
            Bags
            <Input type="number" step="0.01" min="0" value={bags} onChange={(e) => setBags(e.target.value)} className="mt-1" />
          </label>
        ) : null}
        <label className="text-sm text-slate-600">
          KG
          <Input type="number" step="0.01" min="0.01" value={kg} onChange={(e) => setKg(e.target.value)} required className="mt-1" />
        </label>
        {isDispatch ? (
          <label className="text-sm text-slate-600">
            Knitting Rate (PKR/kg)
            <Input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} className="mt-1" />
          </label>
        ) : null}
      </div>

      {isDispatch && (previewLoss || previewAmount) ? (
        <p className="text-xs text-slate-500">
          {previewLoss ? <>2% loss: <span className="font-medium text-navy-900">{previewLoss} kg</span></> : null}
          {previewLoss && previewAmount ? " · " : null}
          {previewAmount ? <>Amount: <span className="font-medium text-navy-900">PKR {previewAmount}</span></> : null}
        </p>
      ) : null}

      {mutation.isError ? <p className="text-sm text-red-600">{(mutation.error as Error).message}</p> : null}

      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {mutation.isPending ? "Adding..." : "Add Entry"}
      </Button>
    </form>
  );
}
