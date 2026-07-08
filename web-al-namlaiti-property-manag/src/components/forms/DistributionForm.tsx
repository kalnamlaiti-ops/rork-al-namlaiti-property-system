import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/context/DataContext";
import type { Distribution } from "@/types";

interface DistributionFormProps {
  initialData?: Distribution;
  onClose: () => void;
}

const distributionStatuses: Distribution["status"][] = ["Pending", "Processed", "Paid"];

export default function DistributionForm({ initialData, onClose }: DistributionFormProps) {
  const { addDistribution, updateDistribution, owners, buildings } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    ownerId: initialData?.ownerId ?? "",
    buildingId: initialData?.buildingId ?? "",
    distributionDate: initialData?.distributionDate ?? new Date().toISOString().split("T")[0],
    ownershipPct: 100,
    periodFrom: new Date().toISOString().split("T")[0],
    periodTo: new Date().toISOString().split("T")[0],
    grossIncome: 0,
    totalExpenses: 0,
    status: initialData?.status ?? "Pending",
    notes: initialData?.notes ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const netIncome = form.grossIncome - form.totalExpenses;
  const ownerShare = useMemo(() => netIncome * (form.ownershipPct / 100), [netIncome, form.ownershipPct]);

  const update = (field: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "ownerId") {
      const ownerBuildings = buildings.filter((b) => b.ownerId === value);
      setForm((prev) => ({ ...prev, ownerId: value as string, buildingId: ownerBuildings.length === 1 ? ownerBuildings[0].id : "" }));
    }
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.ownerId) next.ownerId = "Owner is required";
    if (!form.buildingId) next.buildingId = "Building is required";
    if (!form.distributionDate) next.distributionDate = "Distribution date is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const ownerBuildings = buildings.filter((b) => b.ownerId === form.ownerId);
    const ownershipPct = ownerBuildings.length === 1 ? 100 : form.ownershipPct;
    const period = `${form.periodFrom} to ${form.periodTo}`;

    const payload = {
      ownerId: form.ownerId,
      buildingId: form.buildingId,
      distributionDate: form.distributionDate,
      period,
      amount: ownerShare,
      status: form.status as Distribution["status"],
      notes: form.notes,
    };

    if (initialData) {
      updateDistribution(initialData.id, payload);
    } else {
      addDistribution(payload);
    }
    onClose();
  };

  const filteredBuildings = buildings.filter((b) => b.ownerId === form.ownerId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ownerId">Owner *</Label>
            <select
              id="ownerId"
              value={form.ownerId}
              onChange={(e) => update("ownerId", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select owner</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            {errors.ownerId && <p className="text-xs text-red-500">{errors.ownerId}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="buildingId">Building *</Label>
            <select
              id="buildingId"
              value={form.buildingId}
              onChange={(e) => update("buildingId", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select building</option>
              {filteredBuildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.buildingId && <p className="text-xs text-red-500">{errors.buildingId}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="distributionDate">Distribution Date *</Label>
            <Input id="distributionDate" type="date" value={form.distributionDate} onChange={(e) => update("distributionDate", e.target.value)} />
            {errors.distributionDate && <p className="text-xs text-red-500">{errors.distributionDate}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ownershipPct">Ownership %</Label>
            <Input id="ownershipPct" type="number" value={form.ownershipPct} onChange={(e) => update("ownershipPct", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodFrom">Period From</Label>
            <Input id="periodFrom" type="date" value={form.periodFrom} onChange={(e) => update("periodFrom", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodTo">Period To</Label>
            <Input id="periodTo" type="date" value={form.periodTo} onChange={(e) => update("periodTo", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grossIncome">Gross Income (BHD)</Label>
            <Input id="grossIncome" type="number" value={form.grossIncome} onChange={(e) => update("grossIncome", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalExpenses">Total Expenses (BHD)</Label>
            <Input id="totalExpenses" type="number" value={form.totalExpenses} onChange={(e) => update("totalExpenses", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {distributionStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
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

      <div className="rounded-lg border bg-primary/5 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Net Income</span>
          <span>BHD {netIncome.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Ownership %</span>
          <span>{form.ownershipPct}%</span>
        </div>
        <div className="flex items-center justify-between text-base font-semibold text-primary">
          <span>Owner Share</span>
          <span>BHD {ownerShare.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{isEdit ? "Update Distribution" : "Create Distribution"}</Button>
      </div>
    </form>
  );
}
