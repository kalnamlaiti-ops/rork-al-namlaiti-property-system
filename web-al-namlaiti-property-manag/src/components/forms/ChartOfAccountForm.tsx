import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData } from "@/context/DataContext";
import type { ChartOfAccount } from "@/types";

interface ChartOfAccountFormProps {
  initialData?: ChartOfAccount;
  onClose: () => void;
}

const accountTypes: ChartOfAccount["type"][] = ["Asset", "Liability", "Equity", "Income", "Expense"];

export default function ChartOfAccountForm({ initialData, onClose }: ChartOfAccountFormProps) {
  const { addChartOfAccount, updateChartOfAccount, chartOfAccounts } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    code: initialData?.code ?? "",
    name: initialData?.name ?? "",
    type: initialData?.type ?? "Asset",
    balance: initialData?.balance ?? 0,
    parentId: initialData?.parentId ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const parentOptions = chartOfAccounts.filter((a) => a.id !== initialData?.id);

  const update = (field: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.code.trim()) next.code = "Account code is required";
    if (!form.name.trim()) next.name = "Account name is required";
    if (!form.type) next.type = "Type is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      code: form.code,
      name: form.name,
      type: form.type as ChartOfAccount["type"],
      balance: Number(form.balance),
      parentId: form.parentId || undefined,
    };

    if (initialData) {
      updateChartOfAccount(initialData.id, payload);
    } else {
      addChartOfAccount(payload);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="code">Account Code *</Label>
            <Input id="code" value={form.code} onChange={(e) => update("code", e.target.value)} />
            {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Account Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <select
              id="type"
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {accountTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.type && <p className="text-xs text-red-500">{errors.type}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="balance">Opening Balance (BHD)</Label>
            <Input id="balance" type="number" value={form.balance} onChange={(e) => update("balance", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="parentId">Parent Account</Label>
            <select
              id="parentId"
              value={form.parentId}
              onChange={(e) => update("parentId", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">None (Top Level)</option>
              {parentOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
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
        <Button type="submit">{isEdit ? "Update Account" : "Create Account"}</Button>
      </div>
    </form>
  );
}
