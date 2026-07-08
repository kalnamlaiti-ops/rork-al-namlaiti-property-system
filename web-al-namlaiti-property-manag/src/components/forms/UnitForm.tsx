import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/context/DataContext";
import type { Unit, UnitStatus, UnitType, FurnishedType } from "@/types";

interface UnitFormProps {
  initialData?: Unit;
  onClose: () => void;
}

const unitTypes: UnitType[] = ["Studio", "1BR", "2BR", "3BR", "4BR+", "Commercial"];
const furnishedTypes: FurnishedType[] = ["Furnished", "Unfurnished", "Semi-Furnished"];
const unitStatuses: UnitStatus[] = ["Vacant", "Occupied", "Maintenance", "Reserved"];
const serviceChargeTypes: Unit["serviceChargeType"][] = ["Flat Amount", "Per sqft"];

export default function UnitForm({ initialData, onClose }: UnitFormProps) {
  const { addUnit, updateUnit, buildings } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    buildingId: initialData?.buildingId ?? "",
    unitNumber: initialData?.unitNumber ?? "",
    type: initialData?.type ?? "Studio",
    furnished: initialData?.furnished ?? "Unfurnished",
    status: initialData?.status ?? "Vacant",
    floor: initialData?.floor ?? 1,
    size: initialData?.size ?? 0,
    bedrooms: initialData?.bedrooms ?? 0,
    bathrooms: initialData?.bathrooms ?? 0,
    baseRent: initialData?.baseRent ?? 0,
    securityDeposit: initialData?.securityDeposit ?? 0,
    serviceChargeType: initialData?.serviceChargeType ?? "Flat Amount",
    serviceCharge: initialData?.serviceCharge ?? 0,
    notes: initialData?.notes ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.buildingId) next.buildingId = "Building is required";
    if (!form.unitNumber.trim()) next.unitNumber = "Unit number is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...form,
      floor: Number(form.floor),
      size: Number(form.size),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      baseRent: Number(form.baseRent),
      securityDeposit: Number(form.securityDeposit),
      serviceCharge: Number(form.serviceCharge),
    };

    if (initialData) {
      updateUnit(initialData.id, payload);
    } else {
      addUnit(payload);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-base font-semibold">Unit Details</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="buildingId">Building *</Label>
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
            {errors.buildingId && <p className="text-xs text-red-500">{errors.buildingId}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="unitNumber">Unit Number *</Label>
            <Input id="unitNumber" value={form.unitNumber} onChange={(e) => update("unitNumber", e.target.value)} />
            {errors.unitNumber && <p className="text-xs text-red-500">{errors.unitNumber}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <select
              id="type"
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {unitTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="furnished">Furnished *</Label>
            <select
              id="furnished"
              value={form.furnished}
              onChange={(e) => update("furnished", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {furnishedTypes.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {unitStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="floor">Floor</Label>
            <Input id="floor" type="number" value={form.floor} onChange={(e) => update("floor", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="size">Size (sqft)</Label>
            <Input id="size" type="number" value={form.size} onChange={(e) => update("size", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bedrooms">Bedrooms</Label>
            <Input id="bedrooms" type="number" value={form.bedrooms} onChange={(e) => update("bedrooms", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bathrooms">Bathrooms</Label>
            <Input id="bathrooms" type="number" value={form.bathrooms} onChange={(e) => update("bathrooms", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseRent">Base Rent (BHD)</Label>
            <Input id="baseRent" type="number" value={form.baseRent} onChange={(e) => update("baseRent", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="securityDeposit">Security Deposit (BHD)</Label>
            <Input id="securityDeposit" type="number" value={form.securityDeposit} onChange={(e) => update("securityDeposit", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceChargeType">Service Charge Type *</Label>
            <select
              id="serviceChargeType"
              value={form.serviceChargeType}
              onChange={(e) => update("serviceChargeType", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {serviceChargeTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceCharge">Service Charge (BHD)</Label>
            <Input id="serviceCharge" type="number" value={form.serviceCharge} onChange={(e) => update("serviceCharge", e.target.value)} />
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
        <Button type="submit">{isEdit ? "Save Changes" : "Create Unit"}</Button>
      </div>
    </form>
  );
}
