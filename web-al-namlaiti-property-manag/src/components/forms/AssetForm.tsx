import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData } from "@/context/DataContext";
import type { Asset } from "@/types";

interface AssetFormProps {
  initialData?: Asset;
  onClose: () => void;
}

const assetStatuses: Asset["status"][] = ["Active", "Disposed", "Under Maintenance"];
const assetCategories = ["Furniture", "Security", "Amenities", "HVAC", "Electrical", "Plumbing", "IT Equipment", "Other"];

export default function AssetForm({ initialData, onClose }: AssetFormProps) {
  const { addAsset, updateAsset, buildings, units } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    category: initialData?.category ?? "Other",
    buildingId: initialData?.buildingId ?? "",
    unitId: initialData?.unitId ?? "",
    purchaseDate: initialData?.purchaseDate ?? new Date().toISOString().split("T")[0],
    cost: initialData?.cost ?? 0,
    status: initialData?.status ?? "Active",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredUnits = units.filter((u) => !form.buildingId || u.buildingId === form.buildingId);

  const update = (field: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "buildingId") {
      setForm((prev) => ({ ...prev, unitId: "" }));
    }
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Asset name is required";
    if (!form.category.trim()) next.category = "Category is required";
    if (form.cost < 0) next.cost = "Cost cannot be negative";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...form,
      cost: Number(form.cost),
      buildingId: form.buildingId || undefined,
      unitId: form.unitId || undefined,
    };

    if (initialData) {
      updateAsset(initialData.id, payload);
    } else {
      addAsset(payload);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Asset Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {assetCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="buildingId">Building</Label>
            <select
              id="buildingId"
              value={form.buildingId}
              onChange={(e) => update("buildingId", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select building</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unitId">Unit</Label>
            <select
              id="unitId"
              value={form.unitId}
              onChange={(e) => update("unitId", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select unit</option>
              {filteredUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unitNumber}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input id="purchaseDate" type="date" value={form.purchaseDate} onChange={(e) => update("purchaseDate", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost">Cost (BHD)</Label>
            <Input id="cost" type="number" value={form.cost} onChange={(e) => update("cost", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {assetStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{isEdit ? "Save Changes" : "Create Asset"}</Button>
      </div>
    </form>
  );
}
