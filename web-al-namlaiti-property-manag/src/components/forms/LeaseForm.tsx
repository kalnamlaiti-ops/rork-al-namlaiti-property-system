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

/** Fixed property options: building number + road are always selected together. */
const PROPERTY_OPTIONS = [
  { key: "1440-2321", buildingNumber: "1440", road: "2321", label: "Building 1440 — Road 2321" },
  { key: "1434-2321", buildingNumber: "1434", road: "2321", label: "Building 1434 — Road 2321" },
  { key: "1337-2318", buildingNumber: "1337", road: "2318", label: "Building 1337 — Road 2318" },
] as const;

/** Block and location are always fixed. */
const FIXED_BLOCK = "323";
const FIXED_LOCATION = "Manama";

export default function LeaseForm({ initialData, onClose }: LeaseFormProps) {
  const { addLease, updateLease, tenants, units, leases } = useData();
  const isEdit = Boolean(initialData);

  const initialProperty = PROPERTY_OPTIONS.find(
    (p) => p.buildingNumber === initialData?.buildingNumber && p.road === initialData?.road,
  );

  const [form, setForm] = useState({
    tenantId: initialData?.tenantId ?? "",
    unitId: initialData?.unitId ?? "",
    contractNumber: initialData?.contractNumber ?? generateCode("CNT", leases.length),
    propertyKey: initialProperty?.key ?? "",
    startDate: initialData?.startDate ?? new Date().toISOString().split("T")[0],
    endDate: initialData?.endDate ?? new Date().toISOString().split("T")[0],
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

  const selectProperty = (key: string) => {
    setForm((prev) => ({ ...prev, propertyKey: key }));
    if (errors.propertyKey) {
      setErrors((prev) => ({ ...prev, propertyKey: "" }));
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.tenantId) next.tenantId = "Tenant is required";
    if (!form.unitId) next.unitId = "Unit is required";
    if (!form.contractNumber.trim()) next.contractNumber = "Contract number is required";
    if (!form.propertyKey) next.propertyKey = "Property (building & road) is required";
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

    const property = PROPERTY_OPTIONS.find((p) => p.key === form.propertyKey);

    const payload = {
      ...form,
      buildingNumber: property?.buildingNumber ?? "",
      road: property?.road ?? "",
      block: FIXED_BLOCK,
      location: FIXED_LOCATION,
      monthlyRent: Number(form.monthlyRent),
      securityDeposit: Number(form.securityDeposit),
      contractDays,
    };
    delete (payload as { propertyKey?: string }).propertyKey;

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
            <Label htmlFor="propertyKey">Property (Building & Road) *</Label>
            <select
              id="propertyKey"
              value={form.propertyKey}
              onChange={(e) => selectProperty(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select property</option>
              {PROPERTY_OPTIONS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
            {errors.propertyKey && <p className="text-xs text-red-500">{errors.propertyKey}</p>}
            <p className="text-xs text-muted-foreground">
              Block 323, Manama is applied automatically.
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
            <Input id="startDate" type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
            {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
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
