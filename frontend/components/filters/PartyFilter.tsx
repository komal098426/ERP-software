"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listParties } from "@/lib/api-client";
import { usePartyFilter } from "@/hooks/usePartyFilter";
import { Input } from "@/components/ui/input";

// Debounced 200ms per SRD §4; server-side search on party name/code.
export function PartyFilter() {
  const { activePartyId, setParty } = usePartyFilter();
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedTerm(term), 200);
    return () => clearTimeout(timeout);
  }, [term]);

  const { data } = useQuery({
    queryKey: ["parties", "filter-search", debouncedTerm],
    queryFn: () => listParties({ q: debouncedTerm || undefined, status: "active" }),
    enabled: isOpen,
  });

  return (
    <div className="relative w-72">
      <Input
        placeholder="Filter by party..."
        value={term}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onChange={(e) => setTerm(e.target.value)}
      />
      {isOpen ? (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
            onMouseDown={() => {
              setParty(null);
              setTerm("");
            }}
          >
            All Parties
          </button>
          {data?.data.map((party) => (
            <button
              key={party.id}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                activePartyId === party.id ? "bg-slate-100 font-medium" : ""
              }`}
              onMouseDown={() => {
                setParty(party.id);
                setTerm(party.name);
              }}
            >
              {party.name} <span className="text-xs text-slate-400">{party.party_code}</span>
            </button>
          ))}
          {data && data.data.length === 0 ? <div className="px-3 py-2 text-sm text-slate-400">No matches</div> : null}
        </div>
      ) : null}
    </div>
  );
}
