"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

interface PartyFilterState {
  selectedPartyIds: string[] | "ALL";
  setSelectedPartyIds: (ids: string[] | "ALL") => void;
}

// Per SRD §4: global party filter state, persisted to localStorage so a refresh doesn't reset
// context. URL sync (the `?party=` query param) happens in usePartyFilter() below, which every
// data-fetching hook should read from so there is no code path that silently queries "everything".
export const usePartyFilterStore = create<PartyFilterState>()(
  persist(
    (set) => ({
      selectedPartyIds: "ALL",
      setSelectedPartyIds: (ids) => set({ selectedPartyIds: ids }),
    }),
    { name: "erp-party-filter" }
  )
);

export function usePartyFilter() {
  const { selectedPartyIds, setSelectedPartyIds } = usePartyFilterStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const partyParam = searchParams.get("party");
    if (partyParam && (selectedPartyIds === "ALL" || !selectedPartyIds.includes(partyParam))) {
      setSelectedPartyIds([partyParam]);
    }
    // Only runs on mount / URL change, deliberately not on every store change (see setParty below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setParty = (partyId: string | null) => {
    const next = partyId ? [partyId] : "ALL";
    setSelectedPartyIds(next);

    const params = new URLSearchParams(searchParams.toString());
    if (partyId) params.set("party", partyId);
    else params.delete("party");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const activePartyId = selectedPartyIds === "ALL" ? null : selectedPartyIds[0] ?? null;

  return { selectedPartyIds, activePartyId, setParty };
}
