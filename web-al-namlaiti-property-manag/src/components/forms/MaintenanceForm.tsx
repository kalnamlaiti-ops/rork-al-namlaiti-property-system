import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/context/DataContext";
import type { MaintenanceRequest } from "@/types";

interface MaintenanceFormProps {
  initialData?: MaintenanceRequest;
  onClose: () => void;
}

const maintenanceStatuses: MaintenanceRequest["status"][] = ["Pending", "In Progress", "Completed", "Cancelled"];

export default function MaintenanceForm({ initialData, onClose }: MaintenanceFormProps) {
  const { addMaintenanceRequest, updateMaintenanceRequest, buildings, units, getBuildingById } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    buildingId: initialData?.buildingId ?? "",
    unitId: initialData?.unitId ?? "",
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    status: initialData?.status ?? "Pending",
    cost: initialData?.cost ?? 0,
    vendor: initialData?.vendor ?? "",
    scheduledDate: initialData?.scheduledDate ?? new Date().toISOString().split("T")[0],
    tenantChargeable: initialData?.tenantChargeable ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredUnits = units.filter((u) => !form.buildingId || u.buildingId === form.buildingId);

  const update = (field: keyof typeof form, value: string | number | boolean) => {
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
    if (!form.buildingId) next.buildingId = "Building is required";
    if (!form.unitId) next.unitId = "Unit is required";
    if (!form.title.trim()) next.title = "Title is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...form,
      cost: form.cost ? Number(form.cost) : undefined,
      tenantChargeable: form.tenantChargeable,
    };

    if (initialData) {
      updateMaintenanceRequest(initialData.id, payload);
    } else {
      addMaintenanceRequest(payload);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
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
            <Label htmlFor="unitId">Unit *</Label>
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
            {errors.unitId && <p className="text-xs text-red-500">{errors.unitId}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={form.title} onChange={(e) => update("title", e.target.value)} />
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {maintenanceStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost">Cost (BHD)</Label>
            <Input id="cost" type="number" value={form.cost} onChange={(e) => update("cost", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Input id="vendor" value={form.vendor} onChange={(e) => update("vendor", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduledDate">Scheduled Date</Label>
            <Input id="scheduledDate" type="date" value={form.scheduledDate} onChange={(e) => update("scheduledDate", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2 flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <input
              id="tenantChargeable"
              type="checkbox"
              checked={form.tenantChargeable}
              onChange={(e) => update("tenantChargeable", e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="tenantChargeable" className="mb-0 cursor-pointer">
              Charge this cost to the tenant (included in next invoice)
            </Label>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={(e) => update("description", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{isEdit ? "Save Changes" : "Create Request"}</Button>
      </div>
    </form>
  );
}
