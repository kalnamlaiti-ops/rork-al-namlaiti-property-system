import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/context/DataContext";
import type { Tenant } from "@/types";

interface TenantFormProps {
  initialData?: Tenant;
  onClose: () => void;
}

const idTypes = ["Passport", "National ID", "Resident Permit", "Company CR"];

export default function TenantForm({ initialData, onClose }: TenantFormProps) {
  const { addTenant, updateTenant, buildings } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    buildingId: initialData?.buildingId ?? "",
    type: initialData?.type ?? "Individual",
    status: initialData?.status ?? "Active",
    idType: "",
    idNumber: initialData?.crNumber ?? "",
    idExpiry: new Date().toISOString().split("T")[0],
    nationality: "",
    dateOfBirth: new Date().toISOString().split("T")[0],
    employer: "",
    address: initialData?.address ?? "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelation: "",
    notes: initialData?.notes ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Full name is required";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Invalid email";
    if (!form.buildingId) next.buildingId = "Building is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      buildingId: form.buildingId,
      type: form.type as Tenant["type"],
      status: form.status as Tenant["status"],
      crNumber: form.idNumber,
      leaseCount: initialData?.leaseCount ?? 0,
      address: form.address,
      notes: [form.notes, form.nationality && `Nationality: ${form.nationality}`, form.employer && `Employer: ${form.employer}`, form.emergencyName && `Emergency: ${form.emergencyName} (${form.emergencyRelation}) ${form.emergencyPhone}`].filter(Boolean).join("\n"),
    };

    if (initialData) {
      updateTenant(initialData.id, payload);
    } else {
      addTenant(payload);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-base font-semibold">Personal Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idType">ID Type</Label>
            <select
              id="idType"
              value={form.idType}
              onChange={(e) => update("idType", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select</option>
              {idTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="idNumber">ID Number</Label>
            <Input id="idNumber" value={form.idNumber} onChange={(e) => update("idNumber", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idExpiry">ID Expiry</Label>
            <Input id="idExpiry" type="date" value={form.idExpiry} onChange={(e) => update("idExpiry", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" value={form.nationality} onChange={(e) => update("nationality", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
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
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.buildingId && <p className="text-xs text-red-500">{errors.buildingId}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tenant Type *</Label>
            <select
              id="type"
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="Individual">Individual</option>
              <option value="Company">Company</option>
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
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="employer">Employer</Label>
            <Input id="employer" value={form.employer} onChange={(e) => update("employer", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-base font-semibold">Emergency Contact</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="emergencyName">Name</Label>
            <Input id="emergencyName" value={form.emergencyName} onChange={(e) => update("emergencyName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyPhone">Phone</Label>
            <Input id="emergencyPhone" value={form.emergencyPhone} onChange={(e) => update("emergencyPhone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyRelation">Relation</Label>
            <Input id="emergencyRelation" value={form.emergencyRelation} onChange={(e) => update("emergencyRelation", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-base font-semibold">Notes</h3>
        <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{isEdit ? "Save Changes" : "Create Tenant"}</Button>
      </div>
    </form>
  );
}
