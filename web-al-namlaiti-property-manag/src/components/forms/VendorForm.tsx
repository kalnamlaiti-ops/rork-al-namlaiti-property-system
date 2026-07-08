import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData } from "@/context/DataContext";
import type { Vendor } from "@/types";

interface VendorFormProps {
  initialData?: Vendor;
  onClose: () => void;
}

const vendorStatuses: Vendor["status"][] = ["Active", "Inactive"];
const vendorCategories = ["HVAC", "Cleaning", "Electrical", "Plumbing", "Security", "Insurance", "Maintenance", "Landscaping", "Other"];

export default function VendorForm({ initialData, onClose }: VendorFormProps) {
  const { addVendor, updateVendor } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    category: initialData?.category ?? "Other",
    contact: initialData?.contact ?? "",
    phone: initialData?.phone ?? "",
    email: initialData?.email ?? "",
    status: initialData?.status ?? "Active",
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
    if (!form.name.trim()) next.name = "Vendor name is required";
    if (!form.category.trim()) next.category = "Category is required";
    if (!form.phone.trim()) next.phone = "Phone is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (initialData) {
      updateVendor(initialData.id, form);
    } else {
      addVendor(form);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Vendor Name *</Label>
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
              {vendorCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact">Contact Person</Label>
            <Input id="contact" value={form.contact} onChange={(e) => update("contact", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {vendorStatuses.map((s) => (
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
        <Button type="submit">{isEdit ? "Save Changes" : "Create Vendor"}</Button>
      </div>
    </form>
  );
}
