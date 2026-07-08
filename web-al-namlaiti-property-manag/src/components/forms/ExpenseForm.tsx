import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData, generateCode } from "@/context/DataContext";
import type { Expense } from "@/types";

interface ExpenseFormProps {
  initialData?: Expense;
  onClose: () => void;
}

const expenseStatuses: Expense["status"][] = ["Pending", "Approved", "Paid", "Rejected"];
const expenseCategories = ["Maintenance", "Cleaning", "Utilities", "Security", "Insurance", "Repair", "Marketing", "Management", "Other"];

export default function ExpenseForm({ initialData, onClose }: ExpenseFormProps) {
  const { addExpense, updateExpense, buildings, units, expenses } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    expenseNumber: initialData?.expenseNumber ?? generateCode("EXP", expenses.length),
    category: initialData?.category ?? "Maintenance",
    vendor: initialData?.vendor ?? "",
    buildingId: initialData?.buildingId ?? "",
    unitId: initialData?.unitId ?? "",
    amount: initialData?.amount ?? 0,
    expenseDate: initialData?.expenseDate ?? new Date().toISOString().split("T")[0],
    status: initialData?.status ?? "Pending",
    description: initialData?.description ?? "",
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
    if (!form.category.trim()) next.category = "Category is required";
    if (!form.vendor.trim()) next.vendor = "Vendor is required";
    if (form.amount <= 0) next.amount = "Amount must be greater than 0";
    if (!form.expenseDate) next.expenseDate = "Date is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      expenseNumber: form.expenseNumber,
      category: form.category,
      vendor: form.vendor,
      buildingId: form.buildingId || undefined,
      unitId: form.unitId || undefined,
      amount: Number(form.amount),
      expenseDate: form.expenseDate,
      status: form.status as Expense["status"],
      description: form.description,
      billable: true,
    };

    if (initialData) {
      updateExpense(initialData.id, payload);
    } else {
      addExpense(payload);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="expenseNumber">Expense Number</Label>
            <Input id="expenseNumber" value={form.expenseNumber} onChange={(e) => update("expenseNumber", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expenseDate">Date *</Label>
            <Input id="expenseDate" type="date" value={form.expenseDate} onChange={(e) => update("expenseDate", e.target.value)} />
            {errors.expenseDate && <p className="text-xs text-red-500">{errors.expenseDate}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {expenseCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {expenseStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor *</Label>
            <Input id="vendor" value={form.vendor} onChange={(e) => update("vendor", e.target.value)} />
            {errors.vendor && <p className="text-xs text-red-500">{errors.vendor}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (BHD) *</Label>
            <Input id="amount" type="number" value={form.amount} onChange={(e) => update("amount", e.target.value)} />
            {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
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
        <Button type="submit">{isEdit ? "Save Changes" : "Create Expense"}</Button>
      </div>
    </form>
  );
}
