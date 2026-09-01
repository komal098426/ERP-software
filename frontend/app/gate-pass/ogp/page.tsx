"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  listGatePasses,
  createGatePass,
  updateGatePass,
  deleteGatePass,
  listParties,
} from "@/lib/api-client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canWrite } from "@/lib/permissions";
import type { GatePass, GatePassStatus, Party } from "@/types";

function OgpContent() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const isWritable = canWrite(currentUser, "gate_passes");

  // State management
  const [showForm, setShowForm] = useState(false);
  const [editingGp, setEditingGp] = useState<GatePass | null>(null);
  const [viewingGp, setViewingGp] = useState<GatePass | null>(null);
  const [deletingGp, setDeletingGp] = useState<GatePass | null>(null);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Form Fields
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [partySearch, setPartySearch] = useState("");
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [returnable, setReturnable] = useState(false);
  const [material, setMaterial] = useState("");
  const [yarnCount, setYarnCount] = useState("");
  const [yarnType, setYarnType] = useState("");
  const [bagsRolls, setBagsRolls] = useState("");
  const [weight, setWeight] = useState("");
  const [quantity, setQuantity] = useState(""); // Yarn Out / Issued Quantity
  const [expectedReturn, setExpectedReturn] = useState("");
  const [storeDestination, setStoreDestination] = useState("Yarn Store");
  const [statusVal, setStatusVal] = useState<GatePassStatus>("pending");
  const [remarks, setRemarks] = useState("");

  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch Parties for searchable dropdown
  const { data: partiesData } = useQuery({
    queryKey: ["parties", "search", partySearch],
    queryFn: () => listParties({ q: partySearch || undefined, status: "active" }),
    enabled: showPartyDropdown,
  });

  // Fetch OGPs
  const { data: ogpData, isLoading } = useQuery({
    queryKey: ["gate-passes", "list", "ogp", search, statusFilter, dateFilter],
    queryFn: () =>
      listGatePasses({
        type: "ogp",
        q: search || undefined,
        status: (statusFilter as GatePassStatus) || undefined,
        cursor: undefined,
      }),
  });

  // Handle Edit Action - load values into form state
  const handleEditClick = (gp: GatePass) => {
    setEditingGp(gp);
    setDate(gp.date);
    setSelectedParty({ id: gp.party_id, name: gp.party_name || "Selected Party" } as Party);
    setPartySearch(gp.party_name || "");
    setReturnable(gp.returnable);
    setMaterial(gp.material);
    setYarnCount(gp.yarn_count || "");
    setYarnType(gp.yarn_type || "");
    setBagsRolls(gp.bags_rolls || "");
    setWeight(gp.weight);
    setQuantity(gp.quantity);
    setExpectedReturn(gp.expected_return || "");
    setStoreDestination(gp.store_destination || "Yarn Store");
    setStatusVal(gp.status);
    setRemarks(gp.remarks || "");
    setValidationErrors({});
    setShowForm(true);
  };

  // Reset form helper
  const resetForm = () => {
    setEditingGp(null);
    setDate(new Date().toISOString().slice(0, 10));
    setSelectedParty(null);
    setPartySearch("");
    setReturnable(false);
    setMaterial("");
    setYarnCount("");
    setYarnType("");
    setBagsRolls("");
    setWeight("");
    setQuantity("");
    setExpectedReturn("");
    setStoreDestination("Yarn Store");
    setStatusVal("pending");
    setRemarks("");
    setValidationErrors({});
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: createGatePass,
    onSuccess: (gp) => {
      queryClient.invalidateQueries({ queryKey: ["gate-passes"] });
      setSuccessMsg(`Outward Gate Pass ${gp.gate_pass_number} created successfully!`);
      setTimeout(() => setSuccessMsg(""), 4000);
      resetForm();
      setShowForm(false);
    },
    onError: (err: any) => {
      setValidationErrors({ server: err.message || "Failed to create Gate Pass." });
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateGatePass(id, payload),
    onSuccess: (gp) => {
      queryClient.invalidateQueries({ queryKey: ["gate-passes"] });
      setSuccessMsg(`Outward Gate Pass ${gp.gate_pass_number} updated successfully!`);
      setTimeout(() => setSuccessMsg(""), 4000);
      resetForm();
      setShowForm(false);
    },
    onError: (err: any) => {
      setValidationErrors({ server: err.message || "Failed to update Gate Pass." });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteGatePass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gate-passes"] });
      setSuccessMsg("Gate Pass deleted successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
      setDeletingGp(null);
    },
  });

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!date) errors.date = "Date is required.";
    if (!selectedParty) errors.party = "Party / Vendor is required.";
    if (!material.trim()) errors.material = "Material / Description is required.";
    if (!quantity || parseFloat(quantity) <= 0) errors.quantity = "Yarn Issued quantity must be greater than 0.";
    if (!weight || parseFloat(weight) <= 0) errors.weight = "Weight must be greater than 0.";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      type: "ogp",
      date,
      party_id: selectedParty!.id,
      returnable,
      material,
      yarn_count: yarnCount || null,
      yarn_type: yarnType || null,
      bags_rolls: bagsRolls ? parseFloat(bagsRolls) : null,
      weight: parseFloat(weight),
      quantity: parseFloat(quantity),
      expected_return: expectedReturn || null,
      store_destination: storeDestination || null,
      status: statusVal,
      remarks: remarks || null,
    };

    if (editingGp) {
      updateMutation.mutate({ id: editingGp.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Helper for status badges
  const getStatusBadge = (status: GatePassStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      case "received":
        return <Badge variant="default">Issued / Sent</Badge>;
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      default:
        return <Badge variant="muted">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 py-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Outward Gate Pass (OGP)</h1>
          <p className="text-sm text-slate-500">Manage outward material movements and dispatches.</p>
        </div>
        {isWritable && (
          <Button
            onClick={() => {
              if (showForm) {
                resetForm();
              }
              setShowForm(!showForm);
            }}
          >
            {showForm ? "Cancel / Close" : "New Outward Gate Pass"}
          </Button>
        )}
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 animate-slide-in">
          {successMsg}
        </div>
      )}

      {/* Interactive Form Block */}
      {showForm && isWritable && (
        <Card className="border border-slate-200 animate-slide-in">
          <form onSubmit={handleSubmit}>
            <div className="p-5 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wider">
                {editingGp ? `Edit Gate Pass: ${editingGp.gate_pass_number}` : "Create Outward Gate Pass Form"}
              </h2>
            </div>
            <CardContent className="p-6 flex flex-col gap-6">
              {validationErrors.server && (
                <p className="text-sm text-red-600 font-medium">{validationErrors.server}</p>
              )}

              {/* Section 1: Basic Information */}
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <label className="text-sm font-medium text-slate-600">
                    Gate Pass No.
                    <Input
                      disabled
                      value={editingGp ? editingGp.gate_pass_number : "OGP-XXXXX (Auto-generated)"}
                      className="mt-1.5 bg-slate-100/80"
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-600">
                    Date <span className="text-red-500">*</span>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className={`mt-1.5 ${validationErrors.date ? "border-red-500" : ""}`}
                    />
                    {validationErrors.date && <p className="text-xs text-red-500 mt-1">{validationErrors.date}</p>}
                  </label>

                  <div className="text-sm font-medium text-slate-600 relative">
                    Party / Vendor <span className="text-red-500">*</span>
                    <Input
                      placeholder="Search and select party..."
                      value={partySearch}
                      onChange={(e) => {
                        setPartySearch(e.target.value);
                        setSelectedParty(null);
                        setShowPartyDropdown(true);
                      }}
                      onFocus={() => setShowPartyDropdown(true)}
                      className={`mt-1.5 ${validationErrors.party ? "border-red-500" : ""}`}
                    />
                    {validationErrors.party && <p className="text-xs text-red-500 mt-1">{validationErrors.party}</p>}

                    {showPartyDropdown && (
                      <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                        {partiesData?.data.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 hover:text-navy-900"
                            onMouseDown={() => {
                              setSelectedParty(p);
                              setPartySearch(p.name);
                              setShowPartyDropdown(false);
                            }}
                          >
                            {p.name} <span className="text-xs text-slate-400">({p.party_code})</span>
                          </button>
                        ))}
                        {partiesData?.data.length === 0 && (
                          <div className="px-3 py-2 text-xs text-slate-400">No active parties found</div>
                        )}
                      </div>
                    )}
                  </div>

                  <label className="text-sm font-medium text-slate-600">
                    Returnable
                    <select
                      value={returnable ? "yes" : "no"}
                      onChange={(e) => setReturnable(e.target.value === "yes")}
                      className="mt-1.5 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Section 2: Material Details */}
              <div className="flex flex-col gap-4 border-t border-slate-100 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Material Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <label className="text-sm font-medium text-slate-600">
                    Material / Description <span className="text-red-500">*</span>
                    <Input
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      required
                      placeholder="e.g. 24/1 CVC Yarn"
                      className={`mt-1.5 ${validationErrors.material ? "border-red-500" : ""}`}
                    />
                    {validationErrors.material && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.material}</p>
                    )}
                  </label>

                  <label className="text-sm font-medium text-slate-600">
                    Yarn Count
                    <Input
                      value={yarnCount}
                      onChange={(e) => setYarnCount(e.target.value)}
                      placeholder="e.g. 24/1"
                      className="mt-1.5"
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-600">
                    Yarn Type
                    <Input
                      value={yarnType}
                      onChange={(e) => setYarnType(e.target.value)}
                      placeholder="e.g. CVC"
                      className="mt-1.5"
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-600">
                    Bags / Rolls
                    <Input
                      type="number"
                      step="0.01"
                      value={bagsRolls}
                      onChange={(e) => setBagsRolls(e.target.value)}
                      placeholder="e.g. 15.00"
                      className="mt-1.5"
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-600">
                    Weight (Kg) <span className="text-red-500">*</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      required
                      placeholder="e.g. 677.96"
                      className={`mt-1.5 ${validationErrors.weight ? "border-red-500" : ""}`}
                    />
                    {validationErrors.weight && <p className="text-xs text-red-500 mt-1">{validationErrors.weight}</p>}
                  </label>

                  <label className="text-sm font-medium text-slate-600">
                    Yarn Out / Issued Quantity <span className="text-red-500">*</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                      placeholder="e.g. 677.96"
                      className={`mt-1.5 ${validationErrors.quantity ? "border-red-500" : ""}`}
                    />
                    {validationErrors.quantity && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.quantity}</p>
                    )}
                  </label>

                  {returnable && (
                    <label className="text-sm font-medium text-slate-600">
                      Expected Return
                      <Input
                        type="date"
                        value={expectedReturn}
                        onChange={(e) => setExpectedReturn(e.target.value)}
                        className="mt-1.5"
                      />
                    </label>
                  )}

                  <label className="text-sm font-medium text-slate-600">
                    Destination / Store
                    <select
                      value={storeDestination}
                      onChange={(e) => setStoreDestination(e.target.value)}
                      className="mt-1.5 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm"
                    >
                      <option value="Yarn Store">Yarn Store</option>
                    </select>
                  </label>

                  {editingGp && (
                    <label className="text-sm font-medium text-slate-600">
                      Status
                      <select
                        value={statusVal}
                        onChange={(e) => setStatusVal(e.target.value as GatePassStatus)}
                        className="mt-1.5 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="received">Issued / Sent</option>
                        <option value="completed">Completed</option>
                      </select>
                    </label>
                  )}
                </div>
              </div>

              {/* Section 3: Remarks */}
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-6">
                <label className="text-sm font-medium text-slate-600">
                  Remarks
                  <textarea
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter additional remarks here..."
                    className="mt-1.5 block w-full rounded-md border border-slate-200 bg-white p-3 text-sm focus:border-navy-500 focus:outline-none"
                  />
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 border-t border-slate-100 pt-6">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save OGP"}
                </Button>
                <Button
                  type="button"
                  variant="muted"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Filters & Search Block */}
      <Card className="border border-slate-200">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Input
            placeholder="Search OGP No., material, count..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
              Date:
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-8 py-1 px-2 text-xs w-36"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-8 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs w-32"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="received">Issued / Sent</option>
              <option value="completed">Completed</option>
            </select>

            {(search || statusFilter || dateFilter) && (
              <Button
                variant="muted"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setDateFilter("");
                }}
                className="h-8 px-3 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* OGP List Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {isLoading ? (
          <p className="text-sm text-slate-400 py-4 text-center">Loading OGP records...</p>
        ) : !ogpData || ogpData.data.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">No Outward Gate Pass records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">OGP No.</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Party / Vendor</th>
                  <th className="px-4 py-3">Material / Description</th>
                  <th className="px-4 py-3 text-right">Bags / Rolls</th>
                  <th className="px-4 py-3 text-right">Weight (kg)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ogpData.data.map((gp) => (
                  <tr key={gp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-navy-900">{gp.gate_pass_number}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{gp.date}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{gp.party_name}</td>
                    <td className="px-4 py-3">{gp.material}</td>
                    <td className="px-4 py-3 text-right">{gp.bags_rolls ? parseFloat(gp.bags_rolls).toFixed(2) : "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">{parseFloat(gp.weight).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(gp.status)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingGp(gp)}
                          className="text-xs font-semibold text-slate-500 hover:text-navy-900 bg-slate-100 hover:bg-slate-200 rounded px-2.5 py-1 transition-colors"
                        >
                          View
                        </button>
                        {isWritable && (
                          <>
                            <button
                              onClick={() => handleEditClick(gp)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded px-2.5 py-1 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeletingGp(gp)}
                              className="text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded px-2.5 py-1 transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW MODAL (Detail Dialog) */}
      {viewingGp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 animate-fade-in">
          <Card className="w-full max-w-xl border border-slate-200 bg-white shadow-2xl">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy-900">{viewingGp.gate_pass_number} Detail</h2>
              <button onClick={() => setViewingGp(null)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>
            <CardContent className="p-6 flex flex-col gap-4 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Date</p>
                  <p className="mt-1 font-medium">{viewingGp.date}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Party / Vendor</p>
                  <p className="mt-1 font-medium">{viewingGp.party_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Returnable</p>
                  <p className="mt-1 font-medium">{viewingGp.returnable ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Status</p>
                  <div className="mt-1">{getStatusBadge(viewingGp.status)}</div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Material Description</p>
                <p className="mt-1 font-medium text-navy-950">{viewingGp.material}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Yarn Count</p>
                  <p className="mt-1">{viewingGp.yarn_count || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Yarn Type</p>
                  <p className="mt-1">{viewingGp.yarn_type || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Destination</p>
                  <p className="mt-1">{viewingGp.store_destination || "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Bags / Rolls</p>
                  <p className="mt-1 font-semibold">{viewingGp.bags_rolls ? parseFloat(viewingGp.bags_rolls).toFixed(2) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Weight (kg)</p>
                  <p className="mt-1 font-semibold">{parseFloat(viewingGp.weight).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Yarn Out / Issued</p>
                  <p className="mt-1 font-semibold text-blue-700">{parseFloat(viewingGp.quantity).toFixed(2)}</p>
                </div>
              </div>

              {viewingGp.expected_return && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Expected Return Date</p>
                  <p className="mt-1 font-semibold text-navy-700">{viewingGp.expected_return}</p>
                </div>
              )}

              {viewingGp.remarks && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Remarks</p>
                  <p className="mt-1 text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 whitespace-pre-wrap">
                    {viewingGp.remarks}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <Button variant="muted" onClick={() => setViewingGp(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={deletingGp !== null}
        title={`Delete Gate Pass ${deletingGp?.gate_pass_number}?`}
        description="Are you sure you want to permanently delete this gate pass record? This action cannot be undone."
        confirmLabel="Delete"
        isConfirming={deleteMutation.isPending}
        onConfirm={() => deletingGp && deleteMutation.mutate(deletingGp.id)}
        onCancel={() => setDeletingGp(null)}
      />
    </div>
  );
}

export default function OgpPage() {
  return (
    <RequireAuth>
      <OgpContent />
    </RequireAuth>
  );
}
