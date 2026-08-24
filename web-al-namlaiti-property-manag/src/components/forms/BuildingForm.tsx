import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/context/DataContext";
import { generateCode } from "@/context/DataContext";
import type { Building } from "@/types";

interface BuildingFormProps {
  initialData?: Building;
  onClose: () => void;
}

export default function BuildingForm({ initialData, onClose }: BuildingFormProps) {
  const { addBuilding, updateBuilding, owners } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    code: initialData?.code ?? generateCode("BLD", 0),
    address: initialData?.address ?? "",
    city: "",
    country: "UAE",
    status: initialData?.status ?? "Active",
    ownerId: initialData?.ownerId ?? "",
    floors: initialData?.floors ?? 1,
    units: initialData?.units ?? 0,
    yearBuilt: initialData?.yearBuilt ?? new Date().getFullYear(),
    purchaseDate: new Date().toISOString().split("T")[0],
    purchasePrice: 0,
    currentValuation: 0,
    amenities: "",
    description: initialData?.description ?? "",
    insuranceProvider: initialData?.insuranceProvider ?? "",
    insurancePolicyNumber: initialData?.insurancePolicyNumber ?? "",
    insuranceExpiryDate: initialData?.insuranceExpiryDate ?? "",
    buildingNumber: initialData?.buildingNumber ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Extract a building number like 1440 from names such as "Building 1440". */
  const extractBuildingNumberFromName = (name: string): string | undefined => {
    const match = name.match(/\b(1[34]\d{2}|\d{3,4})\b/);
    return match?.[1];
  };

  const update = (field: keyof typeof form, value: string | number) => {
    setForm((prev) => {
      let next = { ...prev, [field]: value };
      // Auto-fill buildingNumber from the building name when the field is empty and the name contains a number.
      if (field === "name" && !prev.buildingNumber.trim() && typeof value === "string") {
        const extracted = extractBuildingNumberFromName(value);
        if (extracted) {
          next = { ...next, buildingNumber: extracted };
        }
      }
      return next;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Building name is required";
    if (!form.address.trim()) next.address = "Address is required";
    if (!form.ownerId) next.ownerId = "Owner is required";
    if (!form.buildingNumber.trim()) next.buildingNumber = "Lease building number is required (auto-filled from name if it contains a number)";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name,
      code: form.code,
      address: [form.address, form.city, form.country].filter(Boolean).join(", "),
      status: form.status as Building["status"],
      ownerId: form.ownerId,
      floors: Number(form.floors),
      units: Number(form.units),
      yearBuilt: Number(form.yearBuilt),
      description: [form.description, form.amenities].filter(Boolean).join("\n"),
      insuranceProvider: form.insuranceProvider || undefined,
      insurancePolicyNumber: form.insurancePolicyNumber || undefined,
      insuranceExpiryDate: form.insuranceExpiryDate || undefined,
      buildingNumber: form.buildingNumber || undefined,
    };

    if (initialData) {
      updateBuilding(initialData.id, payload);
    } else {
      addBuilding(payload);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-base font-semibold">Basic Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Building Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Building Code</Label>
            <Input id="code" value={form.code} onChange={(e) => update("code", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buildingNumber">Lease Building Number *</Label>
            <Input id="buildingNumber" value={form.buildingNumber} onChange={(e) => update("buildingNumber", e.target.value)} placeholder="e.g. 1440" />
            {errors.buildingNumber && <p className="text-xs text-red-500">{errors.buildingNumber}</p>}
            <p className="text-xs text-muted-foreground">Auto-filled from the building name if it contains a number (e.g. Building 1440).</p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
            {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" value={form.country} onChange={(e) => update("country", e.target.value)} />
          </div>
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
            <Label htmlFor="status">Status *</Label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-base font-semibold">Property Details</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="floors">Total Floors</Label>
            <Input id="floors" type="number" value={form.floors} onChange={(e) => update("floors", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="units">Total Units</Label>
            <Input id="units" type="number" value={form.units} onChange={(e) => update("units", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yearBuilt">Year Built</Label>
            <Input id="yearBuilt" type="number" value={form.yearBuilt} onChange={(e) => update("yearBuilt", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input id="purchaseDate" type="date" value={form.purchaseDate} onChange={(e) => update("purchaseDate", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Purchase Price (BHD)</Label>
            <Input id="purchasePrice" type="number" value={form.purchasePrice} onChange={(e) => update("purchasePrice", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentValuation">Current Valuation (BHD)</Label>
            <Input id="currentValuation" type="number" value={form.currentValuation} onChange={(e) => update("currentValuation", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="amenities">Amenities</Label>
            <Input id="amenities" placeholder="Swimming Pool, Gym, Parking, 24/7 Security" value={form.amenities} onChange={(e) => update("amenities", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={(e) => update("description", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-base font-semibold">Insurance</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="insuranceProvider">Insurance Provider</Label>
            <Input
              id="insuranceProvider"
              value={form.insuranceProvider}
              onChange={(e) => update("insuranceProvider", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insurancePolicyNumber">Policy Number</Label>
            <Input
              id="insurancePolicyNumber"
              value={form.insurancePolicyNumber}
              onChange={(e) => update("insurancePolicyNumber", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insuranceExpiryDate">Expiry Date</Label>
            <Input
              id="insuranceExpiryDate"
              type="date"
              value={form.insuranceExpiryDate}
              onChange={(e) => update("insuranceExpiryDate", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{isEdit ? "Save Changes" : "Create Building"}</Button>
      </div>
    </form>
  );
}
