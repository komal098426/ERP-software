"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  deactivateParty,
  fetchYarnLedgerSummary,
  getParty,
  listTransactions,
  listYarnLedger,
} from "@/lib/api-client";
import { canWrite } from "@/lib/permissions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RequireAuth } from "@/components/require-auth";
import { TransactionsTable } from "@/components/tables/TransactionsTable";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { YarnLedgerTable } from "@/components/tables/YarnLedgerTable";
import { YarnLedgerForm } from "@/components/forms/YarnLedgerForm";
import { YarnLedgerSummary } from "@/components/yarn-ledger-summary";

function PartyDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showYarnLedgerForm, setShowYarnLedgerForm] = useState(false);
  const { data: currentUser } = useCurrentUser();

  const { data: party, isLoading } = useQuery({
    queryKey: ["parties", id],
    queryFn: () => getParty(id),
  });

  const {
    data: transactionsPage,
    isLoading: isLoadingTransactions,
    error: transactionsError,
  } = useQuery({
    queryKey: ["transactions", id],
    queryFn: () => listTransactions(id),
    enabled: !!party,
    retry: false, // a 403 (missing permission) won't resolve by retrying
  });

  const {
    data: yarnLedgerPage,
    isLoading: isLoadingYarnLedger,
    error: yarnLedgerError,
  } = useQuery({
    queryKey: ["yarn-ledger", id],
    queryFn: () => listYarnLedger(id),
    enabled: !!party,
    retry: false,
  });

  const { data: yarnLedgerSummary, isLoading: isLoadingYarnSummary } = useQuery({
    queryKey: ["yarn-ledger-summary", id],
    queryFn: () => fetchYarnLedgerSummary(id),
    enabled: !!party && !yarnLedgerError,
    retry: false,
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateParty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      setConfirmingDeactivate(false);
    },
  });

  if (isLoading) return <p className="text-sm text-slate-400">Loading...</p>;
  if (!party) return <p className="text-sm text-slate-400">Party not found.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/parties")} className="mb-2 -ml-3">
            ← Back to Parties
          </Button>
          <h1 className="text-xl font-semibold text-navy-900">{party.name}</h1>
          <p className="text-sm text-slate-500">{party.party_code}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={party.status === "active" ? "success" : "muted"}>{party.status}</Badge>
          {party.status === "active" && canWrite(currentUser, "parties") ? (
            <Button variant="outline" onClick={() => setConfirmingDeactivate(true)}>
              Deactivate
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-400">Type</p>
            <p className="capitalize text-navy-900">{party.type}</p>
          </div>
          <div>
            <p className="text-slate-400">Contact Person</p>
            <p className="text-navy-900">{party.contact_person ?? "—"}</p>
          </div>
          <div>
            <p className="text-slate-400">Phone</p>
            <p className="text-navy-900">{party.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-slate-400">Email</p>
            <p className="text-navy-900">{party.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-slate-400">Opening Balance</p>
            <p className="text-navy-900">{party.opening_balance}</p>
          </div>
          <div>
            <p className="text-slate-400">Source</p>
            <p className="capitalize text-navy-900">{party.source}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Yarn &amp; Fabric Ledger</CardTitle>
          {canWrite(currentUser, "yarn_ledger") ? (
            <Button size="sm" variant="outline" onClick={() => setShowYarnLedgerForm((v) => !v)}>
              {showYarnLedgerForm ? "Close" : "Add Entry"}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {showYarnLedgerForm ? (
            <YarnLedgerForm partyId={id} onCreated={() => setShowYarnLedgerForm(false)} />
          ) : null}
          {isLoadingYarnLedger || isLoadingYarnSummary ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : yarnLedgerError ? (
            <p className="text-sm text-red-600">
              {yarnLedgerError instanceof ApiError && yarnLedgerError.status === 403
                ? "You don't have permission to view the yarn/fabric ledger for this party."
                : "Couldn't load the yarn/fabric ledger."}
            </p>
          ) : (
            <>
              {yarnLedgerSummary ? <YarnLedgerSummary summary={yarnLedgerSummary} /> : null}
              <YarnLedgerTable entries={yarnLedgerPage?.data ?? []} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Transactions</CardTitle>
          {canWrite(currentUser, "transactions") ? (
            <Button size="sm" variant="outline" onClick={() => setShowTransactionForm((v) => !v)}>
              {showTransactionForm ? "Close" : "Add Transaction"}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {showTransactionForm ? (
            <div className="mb-4">
              <TransactionForm partyId={id} onCreated={() => setShowTransactionForm(false)} />
            </div>
          ) : null}
          {isLoadingTransactions ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : transactionsError ? (
            <p className="text-sm text-red-600">
              {transactionsError instanceof ApiError && transactionsError.status === 403
                ? "You don't have permission to view transactions for this party."
                : "Couldn't load transactions."}
            </p>
          ) : (
            <TransactionsTable transactions={transactionsPage?.data ?? []} />
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-slate-400">Reconciliation and documents for this party land with their respective modules.</p>

      <ConfirmDialog
        open={confirmingDeactivate}
        title="Deactivate Party?"
        description="This party will be marked inactive. Historical transactions and other records will remain available."
        confirmLabel="Deactivate"
        isConfirming={deactivateMutation.isPending}
        onConfirm={() => deactivateMutation.mutate()}
        onCancel={() => setConfirmingDeactivate(false)}
      />
    </div>
  );
}

export default function PartyDetailPage() {
  return (
    <RequireAuth>
      <PartyDetailContent />
    </RequireAuth>
  );
}
