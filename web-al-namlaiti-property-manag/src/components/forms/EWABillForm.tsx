import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData, generateCode } from "@/context/DataContext";
import type { EWABill } from "@/types";

interface EWABillFormProps {
  initialData?: EWABill;
  onClose: () => void;
}

const ewaStatuses: EWABill["status"][] = ["Pending", "Invoiced", "Paid"];

export default function EWABillForm({ initialData, onClose }: EWABillFormProps) {
  const { addEWABill, updateEWABill, leases, units, ewaBills } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    billNumber: initialData?.billNumber ?? generateCode("EWA", ewaBills.length),
    leaseId: initialData?.leaseId ?? "",
    unitId: initialData?.unitId ?? "",
    buildingId: initialData?.buildingId ?? "",
    month: initialData?.month ?? "",
    billAmount: initialData?.billAmount ?? 0,
    limit: initialData?.limit ?? 0,
    dueDate: initialData?.dueDate ?? new Date().toISOString().split("T")[0],
    status: initialData?.status ?? "Pending",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedLease = leases.find((l) => l.id === form.leaseId);
  const leaseUnit = selectedLease ? units.find((u) => u.id === selectedLease.unitId) : undefined;

  const update = (field: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "leaseId") {
      const lease = leases.find((l) => l.id === value);
      const unit = lease ? units.find((u) => u.id === lease.unitId) : undefined;
      setForm((prev) => ({
        ...prev,
        leaseId: value as string,
        unitId: unit?.id ?? "",
        buildingId: unit?.buildingId ?? "",
      }));
    }
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.leaseId) next.leaseId = "Lease is required";
    if (!form.month.trim()) next.month = "Month is required";
    if (form.billAmount < 0) next.billAmount = "Bill amount must be 0 or greater";
    if (form.limit < 0) next.limit = "Limit must be 0 or greater";
    if (!form.dueDate) next.dueDate = "Due date is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      billNumber: form.billNumber,
      leaseId: form.leaseId,
      unitId: form.unitId,
      buildingId: form.buildingId,
      month: form.month,
      billAmount: Number(form.billAmount),
      limit: Number(form.limit),
      dueDate: form.dueDate,
      status: form.status as EWABill["status"],
    };

    if (initialData) {
      updateEWABill(initialData.id, payload);
    } else {
      addEWABill(payload);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="billNumber">Bill Number</Label>
            <Input id="billNumber" value={form.billNumber} onChange={(e) => update("billNumber", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leaseId">Lease *</Label>
            <select
              id="leaseId"
              value={form.leaseId}
              onChange={(e) => update("leaseId", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select lease</option>
              {leases.map((l) => {
                const unit = units.find((u) => u.id === l.unitId);
                return (
                  <option key={l.id} value={l.id}>
                    {l.contractNumber} — {unit?.unitNumber}
                  </option>
                );
              })}
            </select>
            {errors.leaseId && <p className="text-xs text-red-500">{errors.leaseId}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="unitId">Unit</Label>
            <Input id="unitId" value={leaseUnit?.unitNumber ?? form.unitId} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="month">Month *</Label>
            <Input id="month" placeholder="Jun 2025" value={form.month} onChange={(e) => update("month", e.target.value)} />
            {errors.month && <p className="text-xs text-red-500">{errors.month}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="billAmount">Bill Amount (BHD) *</Label>
            <Input id="billAmount" type="number" value={form.billAmount} onChange={(e) => update("billAmount", e.target.value)} />
            {errors.billAmount && <p className="text-xs text-red-500">{errors.billAmount}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="limit">Lease Limit (BHD) *</Label>
            <Input id="limit" type="number" value={form.limit} onChange={(e) => update("limit", e.target.value)} />
            {errors.limit && <p className="text-xs text-red-500">{errors.limit}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input id="dueDate" type="date" value={form.dueDate} onChange={(e) => update("dueDate", e.target.value)} />
            {errors.dueDate && <p className="text-xs text-red-500">{errors.dueDate}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {ewaStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2 rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium text-muted-foreground">Calculated Excess</p>
            <p className="text-xl font-bold">{formatCurrency(Number(form.billAmount) - Number(form.limit))}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{isEdit ? "Save Changes" : "Log EWA Bill"}</Button>
      </div>
    </form>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 2 }).format(amount);
}
