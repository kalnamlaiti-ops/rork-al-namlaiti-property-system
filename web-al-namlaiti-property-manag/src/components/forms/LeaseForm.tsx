import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData, generateCode } from "@/context/DataContext";
import type { Lease } from "@/types";

interface LeaseFormProps {
  initialData?: Lease;
  onClose: () => void;
}

const leaseStatuses: Lease["status"][] = ["Active", "Expired", "Terminating", "Draft"];
const paymentFrequencies: Lease["paymentFrequency"][] = ["Monthly", "Quarterly", "Yearly"];

/** Building → Road auto-mapping. Road is always derived from the building. */
const BUILDING_ROAD_MAP: Record<string, string> = {
  "1440": "2321",
  "1434": "2321",
  "1337": "2318",
};

const BUILDING_OPTIONS = ["1440", "1434", "1337"] as const;

/** Block and location are always fixed. */
const FIXED_BLOCK = "323";
const FIXED_LOCATION = "Manama";

/** Default lease period is 1 year. */
function addOneYear(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

export default function LeaseForm({ initialData, onClose }: LeaseFormProps) {
  const { addLease, updateLease, tenants, units, leases } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    tenantId: initialData?.tenantId ?? "",
    unitId: initialData?.unitId ?? "",
    contractNumber: initialData?.contractNumber ?? generateCode("CNT", leases.length),
    buildingNumber: initialData?.buildingNumber ?? "",
    road: initialData?.road ?? "",
    startDate: initialData?.startDate ?? new Date().toISOString().split("T")[0],
    endDate: initialData?.endDate ?? addOneYear(new Date().toISOString().split("T")[0]),
    monthlyRent: initialData?.monthlyRent ?? 0,
    securityDeposit: initialData?.securityDeposit ?? 0,
    cprNumber: initialData?.cprNumber ?? "",
    phoneNumber: initialData?.phoneNumber ?? "",
    status: initialData?.status ?? "Active",
    paymentFrequency: initialData?.paymentFrequency ?? "Monthly",
    notes: initialData?.notes ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  /** Selecting a building always sets the mapped road automatically. */
  const selectBuilding = (buildingNumber: string) => {
    setForm((prev) => ({
      ...prev,
      buildingNumber,
      road: BUILDING_ROAD_MAP[buildingNumber] ?? "",
    }));
    if (errors.buildingNumber) {
      setErrors((prev) => ({ ...prev, buildingNumber: "" }));
    }
  };

  /** Changing the start date keeps the lease period at 1 year by default. */
  const updateStartDate = (value: string) => {
    setForm((prev) => ({ ...prev, startDate: value, endDate: addOneYear(value) }));
    setErrors((prev) => ({ ...prev, startDate: "", endDate: "" }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.tenantId) next.tenantId = "Tenant is required";
    if (!form.unitId) next.unitId = "Unit is required";
    if (!form.contractNumber.trim()) next.contractNumber = "Contract number is required";
    if (!form.buildingNumber) next.buildingNumber = "Building is required";
    if (!form.cprNumber.trim()) next.cprNumber = "CPR number is required";
    if (!form.phoneNumber.trim()) next.phoneNumber = "Phone number is required";
    if (!form.startDate) next.startDate = "Start date is required";
    if (!form.endDate) next.endDate = "End date is required";
    if (new Date(form.endDate) <= new Date(form.startDate)) next.endDate = "End date must be after start date";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const start = new Date(form.startDate).getTime();
    const end = new Date(form.endDate).getTime();
    const contractDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

    const payload = {
      ...form,
      road: BUILDING_ROAD_MAP[form.buildingNumber] ?? form.road,
      block: FIXED_BLOCK,
      location: FIXED_LOCATION,
      monthlyRent: Number(form.monthlyRent),
      securityDeposit: Number(form.securityDeposit),
      contractDays,
    };

    if (initialData) {
      updateLease(initialData.id, payload);
    } else {
      addLease(payload);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-base font-semibold">Lease Details</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tenantId">Tenant *</Label>
            <select
              id="tenantId"
              value={form.tenantId}
              onChange={(e) => update("tenantId", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select tenant</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {errors.tenantId && <p className="text-xs text-red-500">{errors.tenantId}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="unitId">Unit *</Label>
            <select
              id="unitId"
              value={form.unitId}
              onChange={(e) => update("unitId", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select unit</option>
              {units.map((u) => {
                const building = u.buildingId; // we can show building name in future via context helper
                return (
                  <option key={u.id} value={u.id}>
                    {u.unitNumber} {building ? `(${building})` : ""}
                  </option>
                );
              })}
            </select>
            {errors.unitId && <p className="text-xs text-red-500">{errors.unitId}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractNumber">Contract Number</Label>
            <Input id="contractNumber" value={form.contractNumber} onChange={(e) => update("contractNumber", e.target.value)} />
            {errors.contractNumber && <p className="text-xs text-red-500">{errors.contractNumber}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="buildingNumber">Building *</Label>
            <select
              id="buildingNumber"
              value={form.buildingNumber}
              onChange={(e) => selectBuilding(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select building</option>
              {BUILDING_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {errors.buildingNumber && <p className="text-xs text-red-500">{errors.buildingNumber}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="road">Road (auto)</Label>
            <Input id="road" value={BUILDING_ROAD_MAP[form.buildingNumber] ?? ""} readOnly placeholder="—" className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              Road is set automatically from the building. Block 323, Manama is applied automatically.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cprNumber">CPR Number *</Label>
            <Input id="cprNumber" value={form.cprNumber} onChange={(e) => update("cprNumber", e.target.value)} placeholder="e.g. 91234567" />
            {errors.cprNumber && <p className="text-xs text-red-500">{errors.cprNumber}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input id="phoneNumber" value={form.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value)} placeholder="e.g. +973 3605 1133" />
            {errors.phoneNumber && <p className="text-xs text-red-500">{errors.phoneNumber}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {leaseStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date *</Label>
            <Input id="startDate" type="date" value={form.startDate} onChange={(e) => updateStartDate(e.target.value)} />
            {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
            <p className="text-xs text-muted-foreground">End date auto-set to 1 year.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date *</Label>
            <Input id="endDate" type="date" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} />
            {errors.endDate && <p className="text-xs text-red-500">{errors.endDate}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthlyRent">Monthly Rent (BHD) *</Label>
            <Input id="monthlyRent" type="number" value={form.monthlyRent} onChange={(e) => update("monthlyRent", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="securityDeposit">Security Deposit (BHD)</Label>
            <Input id="securityDeposit" type="number" value={form.securityDeposit} onChange={(e) => update("securityDeposit", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentFrequency">Payment Frequency</Label>
            <select
              id="paymentFrequency"
              value={form.paymentFrequency}
              onChange={(e) => update("paymentFrequency", e.target.value as Lease["paymentFrequency"])}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {paymentFrequencies.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{isEdit ? "Save Changes" : "Create Lease"}</Button>
      </div>
    </form>
  );
}
