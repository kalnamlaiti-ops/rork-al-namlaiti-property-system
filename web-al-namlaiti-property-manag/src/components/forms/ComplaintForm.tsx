import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/context/DataContext";
import type { Complaint } from "@/types";

interface ComplaintFormProps {
  initialData?: Complaint;
  onClose: () => void;
}

const complaintStatuses: Complaint["status"][] = ["Open", "In Progress", "Resolved", "Closed"];
const complaintPriorities: Complaint["priority"][] = ["Low", "Medium", "High", "Urgent"];

export default function ComplaintForm({ initialData, onClose }: ComplaintFormProps) {
  const { addComplaint, updateComplaint, tenants, units, getBuildingById } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    tenantId: initialData?.tenantId ?? "",
    unitId: initialData?.unitId ?? "",
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    status: initialData?.status ?? "Open",
    priority: initialData?.priority ?? "Medium",
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
    if (!form.tenantId) next.tenantId = "Tenant is required";
    if (!form.unitId) next.unitId = "Unit is required";
    if (!form.title.trim()) next.title = "Title is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const unit = units.find((u) => u.id === form.unitId);
    const createdAt = initialData?.createdAt ?? new Date().toISOString().split("T")[0];

    const payload = {
      ...form,
      createdAt,
    };

    if (initialData) {
      updateComplaint(initialData.id, payload);
    } else {
      addComplaint(payload);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
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
                const building = getBuildingById(u.buildingId);
                return (
                  <option key={u.id} value={u.id}>
                    {u.unitNumber} / {building?.name}
                  </option>
                );
              })}
            </select>
            {errors.unitId && <p className="text-xs text-red-500">{errors.unitId}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={form.title} onChange={(e) => update("title", e.target.value)} />
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              value={form.priority}
              onChange={(e) => update("priority", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {complaintPriorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {complaintStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
        <Button type="submit">{isEdit ? "Save Changes" : "Create Ticket"}</Button>
      </div>
    </form>
  );
}
