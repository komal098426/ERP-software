"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import {
  createGatePass,
  listParties,
} from "@/lib/api-client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canWrite } from "@/lib/permissions";
import type { GatePassStatus } from "@/types";

interface OGPItemRow {
  id: string;
  srlNo: number;
  code: string;
  item: string;
  contract: string;
  challan: string;
  dc: string;
  description: string;
  primaryQty: string;
  primaryUnit: string;
  secondaryQty: string;
  secondaryUnit: string;
  netWeight: string;
  weightUnit: string;
  remarks: string;
}

const DEFAULT_ITEMS: OGPItemRow[] = [
  {
    id: "item-1",
    srlNo: 1,
    code: "80535361",
    item: "Poly Bag",
    contract: "",
    challan: "",
    dc: "",
    description: "Cargo & Pkg Store Saker Land 4650/3043230",
    primaryQty: "300.000",
    primaryUnit: "Nos",
    secondaryQty: "380.00",
    secondaryUnit: "Nos",
    netWeight: "",
    weightUnit: "Kgs",
    remarks: "",
  },
];

function OgpContent() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const isWritable = canWrite(currentUser, "gate_passes");

  // Document Headers
  const [companyName, setCompanyName] = useState("Al Habib Knitwear");
  const [passType, setPassType] = useState<"NON-RETURNABLE" | "RETURNABLE">("NON-RETURNABLE");
  const [subTitle, setSubTitle] = useState("GENERAL ITEMS (LOCAL) (NORMAL)");

  // Top Meta Fields
  const [gatePassNo, setGatePassNo] = useState("2027008415");
  const [manualGpNo, setManualGpNo] = useState("56");
  const [unit, setUnit] = useState("S2");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [department, setDepartment] = useState("Production (LS2)");
  const [pageNo, setPageNo] = useState("1");
  const [printDate, setPrintDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [copyNo, setCopyNo] = useState("Copy 3 of 4");

  // Party / M/S & Gate Office
  const [msDetails, setMsDetails] = useState(
    "[1400] - FROOTI VENUS & MARS ATTIRE, RE #111 First Floor, Mubarik Plaza, Plot # 3, Truck Stand, Ravi Link Road, Lahore"
  );
  const [gateOffice, setGateOffice] = useState("Cargo & Pkg Store Saker Land 4650/3043230");
  const [instructionText, setInstructionText] = useState(
    "Please allow the following goods to be taken out by :"
  );

  // Transport & Request Details
  const [purpose, setPurpose] = useState("");
  const [requestNo, setRequestNo] = useState("");
  const [contract, setContract] = useState("");
  const [destination, setDestination] = useState("");
  const [modeOfTransport, setModeOfTransport] = useState("BY HAND");
  const [billNo, setBillNo] = useState("");
  const [containerNo, setContainerNo] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [vehicleNo, setVehicleNo] = useState("BY-Hand");
  const [transporter, setTransporter] = useState("");
  const [containerSize, setContainerSize] = useState("");
  const [shippingLine, setShippingLine] = useState("");

  // Items
  const [items, setItems] = useState<OGPItemRow[]>(DEFAULT_ITEMS);

  // Authorisation & Signatures
  const [preparedBy, setPreparedBy] = useState("Amna Ahmad");
  const [checkedBy, setCheckedBy] = useState("");
  const [gateOfficer, setGateOfficer] = useState("Farhan Ahmad");
  const [approvedBy, setApprovedBy] = useState("");
  const [authDate, setAuthDate] = useState("2026-08-24");
  const [authTime, setAuthTime] = useState("15:53");
  const [recipient, setRecipient] = useState("Amna Ahmad");
  const [printedBy, setPrintedBy] = useState("Amna Ahmad");
  const [gateClerk, setGateClerk] = useState("");
  const [clerkDateTime, setClerkDateTime] = useState("");

  // Footer text
  const [footerFeeText, setFooterFeeText] = useState(
    "Permitted Size SGP 4RT, Fee SGP 1000, Fee 1000"
  );
  const [footerDateText] = useState(() => {
    const d = new Date();
    return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch Parties
  const { data: partiesData } = useQuery({
    queryKey: ["parties", "list", "active"],
    queryFn: () => listParties({ status: "active" }),
  });

  // Table Row Operations
  const handleAddItem = () => {
    const nextSrl = items.length + 1;
    const newItem: OGPItemRow = {
      id: `item-${Date.now()}`,
      srlNo: nextSrl,
      code: "",
      item: "",
      contract: "",
      challan: "",
      dc: "",
      description: "",
      primaryQty: "0.000",
      primaryUnit: "Nos",
      secondaryQty: "0.00",
      secondaryUnit: "Nos",
      netWeight: "",
      weightUnit: "Kgs",
      remarks: "",
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    const updated = items.filter((_, i) => i !== index).map((item, i) => ({ ...item, srlNo: i + 1 }));
    setItems(updated);
  };

  const handleItemChange = (index: number, field: keyof OGPItemRow, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Calculations
  const totalPrimaryQty = items.reduce((sum, item) => sum + (parseFloat(item.primaryQty) || 0), 0);
  const totalSecondaryQty = items.reduce((sum, item) => sum + (parseFloat(item.secondaryQty) || 0), 0);
  const totalNetWeight = items.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0);

  // Save Mutation
  const createMutation = useMutation({
    mutationFn: createGatePass,
    onSuccess: (gp) => {
      queryClient.invalidateQueries({ queryKey: ["gate-passes"] });
      setSuccessMsg(`Outward Gate Pass ${gp.gate_pass_number} saved successfully!`);
      setTimeout(() => setSuccessMsg(""), 4000);
    },
    onError: (err: any) => {
      setValidationErrors({ server: err.message || "Failed to save Gate Pass." });
    },
  });

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!msDetails.trim()) errors.party = "M/S Party details are required.";
    if (items.length === 0 || !items[0].description.trim()) {
      errors.items = "At least one item description is required.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Party matching or fallback
    let pId: string | undefined;
    if (partiesData?.data && partiesData.data.length > 0) {
      const match = partiesData.data.find(
        (p) => msDetails.toLowerCase().includes(p.name.toLowerCase())
      );
      pId = match ? match.id : partiesData.data[0].id;
    }

    const firstItem = items[0];
    const payload = {
      type: "ogp" as const,
      date,
      party_id: pId || "00000000-0000-0000-0000-000000000000",
      returnable: passType === "RETURNABLE",
      material: items.map((it) => it.description).filter(Boolean).join("; ") || "General Items",
      yarn_count: firstItem?.code || null,
      yarn_type: firstItem?.primaryUnit || null,
      bags_rolls: null,
      weight: totalNetWeight || totalSecondaryQty || 1,
      quantity: totalPrimaryQty || 1,
      expected_return: null,
      store_destination: destination || department || null,
      status: "pending" as GatePassStatus,
      remarks: `Manual GP: ${manualGpNo} | Unit: ${unit} | Transporter: ${transporter} | Vehicle: ${vehicleNo} | Purpose: ${purpose}`,
    };

    createMutation.mutate(payload);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-5 py-2 animate-fade-in print:p-0 print:m-0">
      {/* Top Action Bar (Clean, essential actions only) */}
      <div className="flex items-center justify-between gap-4 print:hidden bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-base font-bold text-navy-900 tracking-tight">Outward Gate Pass (OGP)</h1>
          <p className="text-xs text-slate-500">Al Habib Knitwear — Outward Material Movement</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs border-navy-300 text-navy-800 hover:bg-navy-50 font-medium"
          >
            🖨️ Print / Save PDF
          </Button>

          {isWritable && (
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={createMutation.isPending}
              className="text-xs bg-navy-900 hover:bg-navy-800 text-white font-semibold"
            >
              {createMutation.isPending ? "Saving..." : "💾 Save Gate Pass"}
            </Button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 animate-slide-in print:hidden">
          {successMsg}
        </div>
      )}

      {Object.keys(validationErrors).length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 print:hidden">
          {Object.values(validationErrors).map((msg, i) => (
            <p key={i}>• {msg}</p>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXACT GATE PASS FORM (AL HABIB KNITWEAR)                                  */}
      {/* ========================================================================= */}
      <div className="mx-auto w-full max-w-5xl bg-white text-black p-8 rounded-lg shadow-lg border border-slate-300 print:shadow-none print:border-none print:p-2 print:max-w-none font-sans text-xs">
        
        {/* Header Title Section */}
        <div className="text-center mb-4">
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="text-2xl md:text-3xl font-black tracking-wider text-center w-full uppercase outline-none focus:bg-amber-50/50 border-b border-transparent focus:border-slate-300 text-black"
            placeholder="COMPANY NAME"
          />
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-base md:text-lg font-bold tracking-wide">
              OUTWARD GATE PASS (
            </span>
            <select
              value={passType}
              onChange={(e) => setPassType(e.target.value as any)}
              className="text-base md:text-lg font-bold bg-transparent border-b border-slate-300 outline-none text-navy-950 print:border-none cursor-pointer"
            >
              <option value="NON-RETURNABLE">NON-RETURNABLE</option>
              <option value="RETURNABLE">RETURNABLE</option>
            </select>
            <span className="text-base md:text-lg font-bold tracking-wide">)</span>
          </div>
          <input
            type="text"
            value={subTitle}
            onChange={(e) => setSubTitle(e.target.value)}
            className="text-xs md:text-sm font-semibold tracking-wider text-center w-full uppercase mt-1 outline-none focus:bg-amber-50/50 border-b border-transparent focus:border-slate-300 text-slate-800"
            placeholder="GENERAL ITEMS (LOCAL) (NORMAL)"
          />
        </div>

        {/* Top Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-2 border-t-2 border-b border-black py-3 leading-relaxed">
          {/* Left Metadata */}
          <div className="md:col-span-6 flex flex-col gap-1.5">
            <div className="grid grid-cols-12 items-center">
              <span className="col-span-4 font-bold">Gate Pass No.</span>
              <div className="col-span-8">
                <input
                  type="text"
                  value={gatePassNo}
                  onChange={(e) => setGatePassNo(e.target.value)}
                  className="w-full font-bold font-mono px-1 py-0.5 border border-slate-300 rounded focus:bg-amber-50/50 outline-none print:border-none print:p-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 items-center">
              <span className="col-span-4 font-bold">Manual G.P No.</span>
              <div className="col-span-8">
                <input
                  type="text"
                  value={manualGpNo}
                  onChange={(e) => setManualGpNo(e.target.value)}
                  placeholder="56"
                  className="w-full font-mono px-1 py-0.5 border border-slate-300 rounded focus:bg-amber-50/50 outline-none print:border-none print:p-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 items-center">
              <span className="col-span-4 font-bold">Unit</span>
              <div className="col-span-8">
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="S2"
                  className="w-full font-semibold px-1 py-0.5 border border-slate-300 rounded focus:bg-amber-50/50 outline-none print:border-none print:p-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 items-center">
              <span className="col-span-4 font-bold">Date</span>
              <div className="col-span-8">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full font-mono font-semibold px-1 py-0.5 border border-slate-300 rounded focus:bg-amber-50/50 outline-none print:border-none print:p-0"
                />
              </div>
            </div>
          </div>

          {/* Right Metadata */}
          <div className="md:col-span-6 flex flex-col gap-1.5 border-l border-slate-200 pl-4 print:border-l-0">
            <div className="grid grid-cols-12 items-center">
              <span className="col-span-4 font-bold">Department</span>
              <div className="col-span-8">
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Production (LS2)"
                  className="w-full font-semibold px-1 py-0.5 border border-slate-300 rounded focus:bg-amber-50/50 outline-none print:border-none print:p-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 items-center">
              <span className="col-span-4 font-bold">Page</span>
              <div className="col-span-8">
                <input
                  type="text"
                  value={pageNo}
                  onChange={(e) => setPageNo(e.target.value)}
                  className="w-full font-mono px-1 py-0.5 border border-slate-300 rounded focus:bg-amber-50/50 outline-none print:border-none print:p-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 items-center">
              <span className="col-span-4 font-bold">Print Date</span>
              <div className="col-span-8">
                <input
                  type="date"
                  value={printDate}
                  onChange={(e) => setPrintDate(e.target.value)}
                  className="w-full font-mono font-semibold px-1 py-0.5 border border-slate-300 rounded focus:bg-amber-50/50 outline-none print:border-none print:p-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 items-center">
              <span className="col-span-4 font-bold">Copy No.</span>
              <div className="col-span-8">
                <input
                  type="text"
                  value={copyNo}
                  onChange={(e) => setCopyNo(e.target.value)}
                  className="w-full font-semibold px-1 py-0.5 border border-slate-300 rounded focus:bg-amber-50/50 outline-none print:border-none print:p-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* M/S & Gate Office */}
        <div className="py-2.5 border-b border-black flex flex-col gap-2">
          <div className="grid grid-cols-1 md:grid-cols-12 items-start">
            <span className="md:col-span-2 font-bold text-slate-900">M/S</span>
            <div className="md:col-span-10">
              <textarea
                rows={2}
                value={msDetails}
                onChange={(e) => setMsDetails(e.target.value)}
                placeholder="[1400] - FROOTI VENUS & MARS ATTIRE..."
                className="w-full font-medium px-2 py-1 border border-slate-300 rounded focus:bg-amber-50/50 outline-none print:border-none print:p-0 resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 items-center">
            <span className="md:col-span-2 font-bold text-slate-900">I/C Gate Office</span>
            <div className="md:col-span-10">
              <input
                type="text"
                value={gateOffice}
                onChange={(e) => setGateOffice(e.target.value)}
                className="w-full px-2 py-1 font-semibold border border-slate-300 rounded focus:bg-amber-50/50 outline-none print:border-none print:p-0"
              />
            </div>
          </div>

          <div className="italic text-slate-700 text-[11px]">
            <input
              type="text"
              value={instructionText}
              onChange={(e) => setInstructionText(e.target.value)}
              className="w-full bg-transparent border-b border-transparent focus:border-slate-300 outline-none"
            />
          </div>
        </div>

        {/* Transport & Request Details */}
        <div className="py-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 mb-2">
            Transport & Request Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 bg-slate-50/60 p-3 rounded border border-slate-200 print:bg-transparent print:border-none print:p-0">
            {/* Col 1 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center">
                <span className="w-28 font-semibold text-slate-800">Purpose</span>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="flex-1 border-b border-slate-300 px-1 py-0.5 outline-none bg-transparent"
                />
              </div>
              <div className="flex items-center">
                <span className="w-28 font-semibold text-slate-800">Request No.</span>
                <input
                  type="text"
                  value={requestNo}
                  onChange={(e) => setRequestNo(e.target.value)}
                  className="flex-1 border-b border-slate-300 px-1 py-0.5 outline-none bg-transparent"
                />
              </div>
              <div className="flex items-center">
                <span className="w-28 font-semibold text-slate-800">Contract</span>
                <input
                  type="text"
                  value={contract}
                  onChange={(e) => setContract(e.target.value)}
                  className="flex-1 border-b border-slate-300 px-1 py-0.5 outline-none bg-transparent"
                />
              </div>
              <div className="flex items-center">
                <span className="w-28 font-semibold text-slate-800">Destination</span>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="flex-1 border-b border-slate-300 px-1 py-0.5 outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Col 2 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center">
                <span className="w-32 font-semibold text-slate-800">Mode of Transport</span>
                <input
                  type="text"
                  value={modeOfTransport}
                  onChange={(e) => setModeOfTransport(e.target.value)}
                  className="flex-1 border-b border-slate-300 px-1 py-0.5 font-bold outline-none bg-transparent"
                />
              </div>
              <div className="flex items-center">
                <span className="w-32 font-semibold text-slate-800">Bill No.</span>
                <input
                  type="text"
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  className="flex-1 border-b border-slate-300 px-1 py-0.5 outline-none bg-transparent"
                />
              </div>
              <div className="flex items-center">
                <span className="w-32 font-semibold text-slate-800">Container No.</span>
                <input
                  type="text"
                  value={containerNo}
                  onChange={(e) => setContainerNo(e.target.value)}
                  className="flex-1 border-b border-slate-300 px-1 py-0.5 outline-none bg-transparent"
                />
              </div>
              <div className="flex items-center">
                <span className="w-32 font-semibold text-slate-800">Requested By</span>
                <input
                  type="text"
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  className="flex-1 border-b border-slate-300 px-1 py-0.5 outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Col 3 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center">
                <span className="w-28 font-semibold text-slate-800">Vehicle No.</span>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="flex-1 border-b border-slate-300 px-1 py-0.5 font-bold outline-none bg-transparent"
                />
              </div>
              <div className="flex items-center">
                <span className="w-28 font-semibold text-slate-800">Transporter</span>
                <input
                  type="text"
                  value={transporter}
                  onChange={(e) => setTransporter(e.target.value)}
                  className="flex-1 border-b border-slate-300 px-1 py-0.5 outline-none bg-transparent"
                />
              </div>
              <div className="flex items-center">
                <span className="w-28 font-semibold text-slate-800">Container Size</span>
                <input
                  type="text"
                  value={containerSize}
                  onChange={(e) => setContainerSize(e.target.value)}
                  className="flex-1 border-b border-slate-300 px-1 py-0.5 outline-none bg-transparent"
                />
              </div>
              <div className="flex items-center">
                <span className="w-28 font-semibold text-slate-800">Shipping Line</span>
                <input
                  type="text"
                  value={shippingLine}
                  onChange={(e) => setShippingLine(e.target.value)}
                  className="flex-1 border-b border-slate-300 px-1 py-0.5 outline-none bg-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ITEMS TABLE (+ Add Row)                                                   */}
        {/* ========================================================================= */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="text-xs h-7 print:hidden font-semibold border-navy-700 text-navy-900 hover:bg-navy-50"
            >
              + Add Row
            </Button>
          </div>

          <div className="overflow-x-auto border-t-2 border-b-2 border-black">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-black font-bold text-[11px] uppercase bg-slate-100/70 print:bg-transparent">
                  <th className="p-1 border-r border-black w-7 text-center">#</th>
                  <th className="p-1 border-r border-black w-20">Code</th>
                  <th className="p-1 border-r border-black w-20">Item</th>
                  <th className="p-1 border-r border-black w-20">Contract</th>
                  <th className="p-1 border-r border-black w-20">Challan</th>
                  <th className="p-1 border-r border-black w-14">DC</th>
                  <th className="p-1 border-r border-black min-w-[200px]">Lot / Item Description</th>
                  <th className="p-1 border-r border-black w-24 text-right">Primary QTY</th>
                  <th className="p-1 border-r border-black w-12 text-center">Unit</th>
                  <th className="p-1 border-r border-black w-24 text-right">Secondary QTY</th>
                  <th className="p-1 border-r border-black w-12 text-center">Unit</th>
                  <th className="p-1 border-r border-black w-20 text-right">Net Weight</th>
                  <th className="p-1 border-r border-black w-12 text-center">Unit</th>
                  <th className="p-1 border-r border-black w-24">Remarks</th>
                  <th className="p-1 w-6 text-center print:hidden"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-300 print:border-black">
                    <td className="p-1 border-r border-black text-center font-mono font-semibold">
                      {item.srlNo}
                    </td>

                    <td className="p-1 border-r border-black">
                      <input
                        type="text"
                        value={item.code}
                        onChange={(e) => handleItemChange(idx, "code", e.target.value)}
                        placeholder=""
                        className="w-full font-mono text-xs px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-black focus:bg-amber-50/50 outline-none rounded"
                      />
                    </td>

                    <td className="p-1 border-r border-black">
                      <input
                        type="text"
                        value={item.item}
                        onChange={(e) => handleItemChange(idx, "item", e.target.value)}
                        placeholder=""
                        className="w-full text-xs px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-black focus:bg-amber-50/50 outline-none rounded"
                      />
                    </td>

                    <td className="p-1 border-r border-black">
                      <input
                        type="text"
                        value={item.contract}
                        onChange={(e) => handleItemChange(idx, "contract", e.target.value)}
                        placeholder=""
                        className="w-full text-xs px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-black focus:bg-amber-50/50 outline-none rounded"
                      />
                    </td>

                    <td className="p-1 border-r border-black">
                      <input
                        type="text"
                        value={item.challan}
                        onChange={(e) => handleItemChange(idx, "challan", e.target.value)}
                        placeholder=""
                        className="w-full text-xs px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-black focus:bg-amber-50/50 outline-none rounded"
                      />
                    </td>

                    <td className="p-1 border-r border-black">
                      <input
                        type="text"
                        value={item.dc}
                        onChange={(e) => handleItemChange(idx, "dc", e.target.value)}
                        placeholder=""
                        className="w-full text-xs px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-black focus:bg-amber-50/50 outline-none rounded"
                      />
                    </td>

                    <td className="p-1 border-r border-black">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        placeholder="Cargo & Pkg Store Saker Land..."
                        className="w-full font-medium text-xs px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-black focus:bg-amber-50/50 outline-none rounded"
                      />
                    </td>

                    <td className="p-1 border-r border-black text-right">
                      <input
                        type="number"
                        step="any"
                        value={item.primaryQty}
                        onChange={(e) => handleItemChange(idx, "primaryQty", e.target.value)}
                        className="w-full text-right font-mono font-semibold text-xs px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-black focus:bg-amber-50/50 outline-none rounded"
                      />
                    </td>

                    <td className="p-1 border-r border-black text-center">
                      <input
                        type="text"
                        value={item.primaryUnit}
                        onChange={(e) => handleItemChange(idx, "primaryUnit", e.target.value)}
                        className="w-full text-center text-xs px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-black outline-none rounded"
                      />
                    </td>

                    <td className="p-1 border-r border-black text-right">
                      <input
                        type="number"
                        step="any"
                        value={item.secondaryQty}
                        onChange={(e) => handleItemChange(idx, "secondaryQty", e.target.value)}
                        className="w-full text-right font-mono font-semibold text-xs px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-black focus:bg-amber-50/50 outline-none rounded"
                      />
                    </td>

                    <td className="p-1 border-r border-black text-center">
                      <input
                        type="text"
                        value={item.secondaryUnit}
                        onChange={(e) => handleItemChange(idx, "secondaryUnit", e.target.value)}
                        className="w-full text-center text-xs px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-black outline-none rounded"
                      />
                    </td>

                    <td className="p-1 border-r border-black text-right">
                      <input
                        type="text"
                        value={item.netWeight}
                        onChange={(e) => handleItemChange(idx, "netWeight", e.target.value)}
                        placeholder=""
                        className="w-full text-right font-mono text-xs px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-black focus:bg-amber-50/50 outline-none rounded"
                      />
                    </td>

                    <td className="p-1 border-r border-black text-center">
                      <input
                        type="text"
                        value={item.weightUnit}
                        onChange={(e) => handleItemChange(idx, "weightUnit", e.target.value)}
                        className="w-full text-center text-xs px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-black outline-none rounded"
                      />
                    </td>

                    <td className="p-1 border-r border-black">
                      <input
                        type="text"
                        value={item.remarks}
                        onChange={(e) => handleItemChange(idx, "remarks", e.target.value)}
                        className="w-full text-xs px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-black outline-none rounded"
                      />
                    </td>

                    <td className="p-1 text-center print:hidden">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-red-500 hover:text-red-700 font-bold px-1"
                          title="Remove line"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Total Row */}
                <tr className="font-bold border-t-2 border-black bg-slate-50/80 print:bg-transparent">
                  <td colSpan={7} className="p-1.5 border-r border-black text-right tracking-wider">
                    Total :
                  </td>
                  <td className="p-1.5 border-r border-black text-right font-mono">
                    {totalPrimaryQty.toFixed(3)}
                  </td>
                  <td className="p-1.5 border-r border-black text-center">Nos</td>
                  <td className="p-1.5 border-r border-black text-right font-mono">
                    {totalSecondaryQty.toFixed(2)}
                  </td>
                  <td className="p-1.5 border-r border-black text-center">Nos</td>
                  <td className="p-1.5 border-r border-black text-right font-mono">
                    {totalNetWeight > 0 ? totalNetWeight.toFixed(2) : "0.00"}
                  </td>
                  <td className="p-1.5 border-r border-black text-center">Kgs</td>
                  <td className="p-1.5 border-r border-black"></td>
                  <td className="p-1.5 print:hidden"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* AUTHORISATION & SIGNATURES SECTION                                        */}
        {/* ========================================================================= */}
        <div className="mt-8 pt-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 mb-4">
            Authorisation & Signatures
          </h3>

          {/* Row 1: Prepared By, Checked By, Gate Officer, Approved By */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-end text-center mb-6">
            {/* Prepared By */}
            <div className="flex flex-col items-center">
              <input
                type="text"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                placeholder="Amna Ahmad"
                className="w-full text-center font-semibold px-1 py-0.5 border-b border-slate-300 focus:border-black outline-none bg-transparent"
              />
              <div className="w-full border-t border-black mt-1 pt-1 font-bold">
                Prepared By
              </div>
              <span className="text-[10px] text-slate-500 italic mt-0.5">Signature</span>
            </div>

            {/* Checked By */}
            <div className="flex flex-col items-center">
              <input
                type="text"
                value={checkedBy}
                onChange={(e) => setCheckedBy(e.target.value)}
                placeholder=""
                className="w-full text-center font-semibold px-1 py-0.5 border-b border-slate-300 focus:border-black outline-none bg-transparent"
              />
              <div className="w-full border-t border-black mt-1 pt-1 font-bold">
                Checked By
              </div>
              <span className="text-[10px] text-slate-500 italic mt-0.5">Signature</span>
            </div>

            {/* Gate Officer */}
            <div className="flex flex-col items-center">
              <input
                type="text"
                value={gateOfficer}
                onChange={(e) => setGateOfficer(e.target.value)}
                placeholder="Farhan Ahmad"
                className="w-full text-center font-semibold px-1 py-0.5 border-b border-slate-300 focus:border-black outline-none bg-transparent"
              />
              <div className="w-full border-t border-black mt-1 pt-1 font-bold">
                Gate Officer
              </div>
              <span className="text-[10px] text-slate-500 italic mt-0.5">Signature</span>
            </div>

            {/* Approved By */}
            <div className="flex flex-col items-center">
              <input
                type="text"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder=""
                className="w-full text-center font-semibold px-1 py-0.5 border-b border-slate-300 focus:border-black outline-none bg-transparent"
              />
              <div className="w-full border-t border-black mt-1 pt-1 font-bold">
                Approved By
              </div>
              <span className="text-[10px] text-slate-500 italic mt-0.5">Signature</span>
            </div>
          </div>

          {/* Row 2: Authorized By, Recipient, Printed, Gate Clerk */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-end text-center mb-6 pt-2">
            {/* Authorized By */}
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-[11px] gap-1 mb-1">
                <span className="font-semibold">Date</span>
                <input
                  type="date"
                  value={authDate}
                  onChange={(e) => setAuthDate(e.target.value)}
                  className="w-24 border-b border-slate-300 px-1 py-0.5 text-center text-[10px] outline-none"
                />
                <span className="font-semibold">Time</span>
                <input
                  type="time"
                  value={authTime}
                  onChange={(e) => setAuthTime(e.target.value)}
                  className="w-16 border-b border-slate-300 px-1 py-0.5 text-center text-[10px] outline-none"
                />
              </div>
              <div className="w-full border-t border-black mt-1 pt-1 font-bold">
                Authorized By
              </div>
            </div>

            {/* Recipient */}
            <div className="flex flex-col items-center">
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Amna Ahmad"
                className="w-full text-center font-semibold px-1 py-0.5 border-b border-slate-300 focus:border-black outline-none bg-transparent"
              />
              <div className="w-full border-t border-black mt-1 pt-1 font-bold">
                Recipient
              </div>
              <span className="text-[10px] text-slate-500 italic mt-0.5">Signature</span>
            </div>

            {/* Printed */}
            <div className="flex flex-col items-center">
              <input
                type="text"
                value={printedBy}
                onChange={(e) => setPrintedBy(e.target.value)}
                placeholder="Amna Ahmad"
                className="w-full text-center font-semibold px-1 py-0.5 border-b border-slate-300 focus:border-black outline-none bg-transparent"
              />
              <div className="w-full border-t border-black mt-1 pt-1 font-bold">
                Printed - {printedBy}
              </div>
              <span className="text-[10px] text-slate-500 italic mt-0.5">Signature</span>
            </div>

            {/* Gate Clerk */}
            <div className="flex flex-col items-center">
              <input
                type="text"
                value={clerkDateTime}
                onChange={(e) => setClerkDateTime(e.target.value)}
                placeholder="mm/dd/yyyy --:-- --"
                className="w-full text-center font-mono text-[10px] px-1 py-0.5 border-b border-slate-300 focus:border-black outline-none bg-transparent"
              />
              <div className="w-full border-t border-black mt-1 pt-1 font-bold">
                Gate Clerk
              </div>
              <span className="text-[10px] text-slate-500 italic mt-0.5">Date / Time</span>
            </div>
          </div>

          {/* Bottom Note & Date */}
          <div className="flex flex-col md:flex-row items-center justify-between text-[11px] font-mono border-t border-slate-300 pt-2 text-slate-700">
            <input
              type="text"
              value={footerFeeText}
              onChange={(e) => setFooterFeeText(e.target.value)}
              className="w-full md:w-auto flex-1 font-medium outline-none bg-transparent border-b border-transparent focus:border-slate-300"
            />
            <span className="font-semibold whitespace-nowrap mt-1 md:mt-0">
              {footerDateText}
            </span>
          </div>
        </div>
      </div>
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
