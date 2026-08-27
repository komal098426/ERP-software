"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createParty } from "@/lib/api-client";
import type { DuplicateCandidate, PartyCreateResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PartyForm({ onCreated }: { onCreated?: (response: PartyCreateResponse) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<"customer" | "vendor" | "both">("customer");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);

  const mutation = useMutation({
    mutationFn: createParty,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      setDuplicates(response.duplicate_warning);
      setName("");
      setPhone("");
      setEmail("");
      onCreated?.(response);
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({ name, type, phone: phone || undefined, email: email || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-slate-600">
          Name
          <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
        </label>
        <label className="text-sm text-slate-600">
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm"
          >
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
            <option value="both">Both</option>
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Phone
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
        </label>
        <label className="text-sm text-slate-600">
          Email
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
        </label>
      </div>

      {mutation.isError ? <p className="text-sm text-red-600">{(mutation.error as Error).message}</p> : null}

      {duplicates.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">Possible duplicate {duplicates.length > 1 ? "parties" : "party"}:</p>
          <ul className="mt-1 list-disc pl-5">
            {duplicates.map((candidate) => (
              <li key={candidate.id}>
                <Link href={`/parties/${candidate.id}`} className="underline">
                  {candidate.name} ({candidate.party_code})
                </Link>{" "}
                — {Math.round(candidate.similarity * 100)}% match
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs">The party above was still created — review and merge manually if needed.</p>
        </div>
      ) : null}

      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {mutation.isPending ? "Adding..." : "Add Party"}
      </Button>
    </form>
  );
}
