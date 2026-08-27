"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listParties } from "@/lib/api-client";
import { canWrite } from "@/lib/permissions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PartiesTable } from "@/components/tables/PartiesTable";
import { PartyForm } from "@/components/forms/PartyForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "@/components/require-auth";
import type { PartyCreateResponse } from "@/types";

function PartiesContent() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const canAddParty = canWrite(currentUser, "parties");

  const { data, isLoading } = useQuery({
    queryKey: ["parties", "list", search],
    queryFn: () => listParties({ q: search || undefined }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-navy-900">Parties</h1>
        {canAddParty ? (
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "Add Party"}</Button>
        ) : null}
      </div>

      {showForm && canAddParty ? (
        <PartyForm
          onCreated={(response: PartyCreateResponse) => {
            // Keep the form open when there's a duplicate warning to review (SRD §16: the
            // warning is non-blocking, but that only matters if the user actually gets to see it).
            if (response.duplicate_warning.length === 0) setShowForm(false);
          }}
        />
      ) : null}

      <Input placeholder="Search parties..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {isLoading ? <p className="text-sm text-slate-400">Loading...</p> : <PartiesTable parties={data?.data ?? []} />}
      </div>
    </div>
  );
}

export default function PartiesPage() {
  return (
    <RequireAuth>
      <PartiesContent />
    </RequireAuth>
  );
}
