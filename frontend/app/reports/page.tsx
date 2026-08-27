"use client";

import { ChangeEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { downloadReport, importYarnLedgerCsv, listParties } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "@/components/require-auth";
import type { ImportSummary } from "@/types";

function ReportsContent() {
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const { data: parties } = useQuery({ queryKey: ["parties", "for-reports"], queryFn: () => listParties({ limit: 100 }) });

  const importMutation = useMutation({
    mutationFn: (file: File) => importYarnLedgerCsv(selectedPartyId, file),
    onSuccess: (summary) => setImportSummary(summary),
  });

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedPartyId) importMutation.mutate(file);
    event.target.value = "";
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-navy-900">Reports</h1>

      <Card>
        <CardHeader>
          <CardTitle>Export CSV</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="text-sm text-slate-600">
            Party (optional — applies to Transactions and Yarn Ledger exports)
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="mt-1 flex h-9 w-full max-w-sm rounded-md border border-slate-200 bg-white px-3 py-1 text-sm"
            >
              <option value="">All parties</option>
              {(parties?.data ?? []).map((party) => (
                <option key={party.id} value={party.id}>
                  {party.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => downloadReport("/api/v1/reports/parties.csv", "parties.csv")}>
              Download Parties CSV
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                downloadReport(
                  `/api/v1/reports/transactions.csv${selectedPartyId ? `?partyId=${selectedPartyId}` : ""}`,
                  "transactions.csv"
                )
              }
            >
              Download Transactions CSV
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                downloadReport(
                  `/api/v1/reports/yarn-ledger.csv${selectedPartyId ? `?partyId=${selectedPartyId}` : ""}`,
                  "yarn-ledger.csv"
                )
              }
            >
              Download Yarn Ledger CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Yarn Ledger CSV</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">
            Upload a CSV in the same shape as the Yarn Ledger export above (edit the downloaded file and re-upload it).
            Select a party first.
          </p>
          <input
            type="file"
            accept=".csv"
            disabled={!selectedPartyId || importMutation.isPending}
            onChange={handleFileSelected}
            className="text-sm"
          />
          {!selectedPartyId ? <p className="text-xs text-amber-600">Select a party above before uploading.</p> : null}
          {importMutation.isPending ? <p className="text-sm text-slate-400">Importing...</p> : null}
          {importSummary ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <p>
                Read {importSummary.rows_read} rows, created {importSummary.created}, skipped {importSummary.skipped.length}.
              </p>
              {importSummary.skipped.length > 0 ? (
                <ul className="mt-2 list-disc pl-5 text-red-600">
                  {importSummary.skipped.map((row) => (
                    <li key={row.row}>
                      Row {row.row}: {row.reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <RequireAuth>
      <ReportsContent />
    </RequireAuth>
  );
}
