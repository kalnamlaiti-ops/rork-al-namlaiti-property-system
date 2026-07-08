import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData } from "@/context/DataContext";
import type { Document } from "@/types";

interface DocumentFormProps {
  initialData?: Document;
  onClose: () => void;
}

const entityTypes: Document["entityType"][] = ["Owner", "Building", "Unit", "Tenant", "Lease", "Invoice", "General"];

export default function DocumentForm({ initialData, onClose }: DocumentFormProps) {
  const { addDocument, updateDocument, owners, buildings, units, tenants, leases, invoices } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    type: initialData?.type ?? "PDF",
    entityType: initialData?.entityType ?? "General",
    entityId: initialData?.entityId ?? "",
    fileUrl: initialData?.fileUrl ?? "#",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const entityOptions = () => {
    switch (form.entityType) {
      case "Owner": return owners;
      case "Building": return buildings;
      case "Unit": return units;
      case "Tenant": return tenants;
      case "Lease": return leases;
      case "Invoice": return invoices;
      default: return [];
    }
  };

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "entityType") {
      setForm((prev) => ({ ...prev, entityType: value as Document["entityType"], entityId: "" }));
    }
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Document name is required";
    if (form.entityType !== "General" && !form.entityId) next.entityId = "Select a linked record";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name,
      type: form.type,
      entityType: form.entityType as Document["entityType"],
      entityId: form.entityId || "general",
      fileUrl: form.fileUrl || "#",
      uploadDate: initialData?.uploadDate ?? new Date().toISOString().split("T")[0],
    };

    if (initialData) {
      updateDocument(initialData.id, payload);
    } else {
      addDocument(payload);
    }
    onClose();
  };

  const options = entityOptions();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Document Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">File Type</Label>
            <select
              id="type"
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="PDF">PDF</option>
              <option value="Image">Image</option>
              <option value="Doc">Doc</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="entityType">Linked To</Label>
            <select
              id="entityType"
              value={form.entityType}
              onChange={(e) => update("entityType", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {entityTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {form.entityType !== "General" && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="entityId">Select Record *</Label>
              <select
                id="entityId"
                value={form.entityId}
                onChange={(e) => update("entityId", e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select...</option>
                {options.map((o: any) => (
                  <option key={o.id} value={o.id}>
                    {o.name || o.unitNumber || o.contractNumber || o.invoiceNumber || o.id}
                  </option>
                ))}
              </select>
              {errors.entityId && <p className="text-xs text-red-500">{errors.entityId}</p>}
            </div>
          )}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="fileUrl">File URL / Link</Label>
            <Input id="fileUrl" value={form.fileUrl} onChange={(e) => update("fileUrl", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{isEdit ? "Update Document" : "Upload Document"}</Button>
      </div>
    </form>
  );
}
