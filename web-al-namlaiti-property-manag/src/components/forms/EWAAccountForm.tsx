import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/context/DataContext";
import type {
  AllocationMethod,
  EWAAccount,
  UnitAllocationRule,
  VacantAction,
} from "@/types";

interface EWAAccountFormProps {
  initialData?: EWAAccount;
  onClose: () => void;
}

const allocationMethods: { value: AllocationMethod; label: string; hint: string }[] = [
  { value: "equal", label: "Equal Split", hint: "Divide the bill evenly across all occupied units." },
  { value: "percentage", label: "Percentage", hint: "Custom percentages per unit (must total 100%)." },
  { value: "fixed", label: "Fixed Amount", hint: "Fixed monthly amount per unit; leftover charged to landlord." },
  { value: "meter", label: "Sub-Meter", hint: "Proportional to sub-meter consumption (future-ready)." },
];

const vacantActions: { value: VacantAction; label: string }[] = [
  { value: "exclude", label: "Exclude (redistribute share to others)" },
  { value: "landlord", label: "Charge the landlord (track, no tenant invoice)" },
];

export default function EWAAccountForm({ initialData, onClose }: EWAAccountFormProps) {
  const { addEWAAccount, updateEWAAccount, buildings, units, ewaAccounts } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    accountNumber: initialData?.accountNumber ?? "",
    nickname: initialData?.nickname ?? "",
    buildingId: initialData?.buildingId ?? "",
    status: initialData?.status ?? "Active",
    allocationMethod: initialData?.allocationMethod ?? "equal",
    vacantAction: initialData?.vacantAction ?? "exclude",
    notes: initialData?.notes ?? "",
  });

  const [linkedUnitIds, setLinkedUnitIds] = useState<string[]>(initialData?.linkedUnitIds ?? []);
  const [rules, setRules] = useState<UnitAllocationRule[]>(initialData?.rules ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const buildingUnits = useMemo(
    () => units.filter((u) => u.buildingId === form.buildingId),
    [units, form.buildingId],
  );

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "buildingId") {
      // Clear linked units when building changes.
      setLinkedUnitIds([]);
      setRules([]);
    }
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const toggleUnit = (unitId: string) => {
    setLinkedUnitIds((prev) => {
      const has = prev.includes(unitId);
      const next = has ? prev.filter((id) => id !== unitId) : [...prev, unitId];
      // Keep rules in sync.
      setRules((r) =>
        has ? r.filter((rl) => rl.unitId !== unitId) : [...r, { unitId }],
      );
      return next;
    });
  };

  const updateRule = (unitId: string, patch: Partial<UnitAllocationRule>) => {
    setRules((prev) =>
      prev.map((r) => (r.unitId === unitId ? { ...r, ...patch } : r)),
    );
  };

  const pctTotal = rules.reduce((sum, r) => sum + (r.percentage ?? 0), 0);
  const fixedTotal = rules.reduce((sum, r) => sum + (r.fixedAmount ?? 0), 0);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.accountNumber.trim()) next.accountNumber = "Account number is required";
    if (!form.buildingId) next.buildingId = "Building is required";
    if (linkedUnitIds.length === 0) next.linkedUnitIds = "Link at least one unit";
    if (form.allocationMethod === "percentage" && Math.abs(pctTotal - 100) > 0.01) {
      next.allocationMethod = `Percentages total ${pctTotal.toFixed(2)}% — they must total 100%`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: Omit<EWAAccount, "id" | "createdAt"> = {
      accountNumber: form.accountNumber.trim(),
      nickname: form.nickname.trim() || undefined,
      buildingId: form.buildingId,
      status: form.status as EWAAccount["status"],
      allocationMethod: form.allocationMethod as AllocationMethod,
      linkedUnitIds,
      rules,
      vacantAction: form.vacantAction as VacantAction,
      notes: form.notes.trim() || undefined,
    };

    if (initialData) {
      updateEWAAccount(initialData.id, payload);
    } else {
      // Suppress the duplicate-link toast from the context when the form
      // already showed validation — we still attempt the add.
      void ewaAccounts;
      addEWAAccount(payload);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-base font-semibold">Account Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Main EWA Account Number *</Label>
            <Input
              id="accountNumber"
              placeholder="e.g. 1078980404"
              value={form.accountNumber}
              onChange={(e) => update("accountNumber", e.target.value)}
            />
            {errors.accountNumber && <p className="text-xs text-red-500">{errors.accountNumber}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname (optional)</Label>
            <Input
              id="nickname"
              placeholder="e.g. Building 1440 — Main Meter"
              value={form.nickname}
              onChange={(e) => update("nickname", e.target.value)}
            />
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
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
            {errors.buildingId && <p className="text-xs text-red-500">{errors.buildingId}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
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
        <h3 className="mb-1 text-base font-semibold">Allocation Method</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          How the monthly EWA bill is divided among the linked units.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {allocationMethods.map((m) => (
            <label
              key={m.value}
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm transition-colors ${
                form.allocationMethod === m.value
                  ? "border-primary bg-primary/5"
                  : "border-input hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="allocationMethod"
                  value={m.value}
                  checked={form.allocationMethod === m.value}
                  onChange={(e) => update("allocationMethod", e.target.value)}
                />
                <span className="font-medium">{m.label}</span>
              </div>
              <span className="pl-6 text-xs text-muted-foreground">{m.hint}</span>
            </label>
          ))}
        </div>
        {errors.allocationMethod && (
          <p className="mt-2 text-xs text-red-500">{errors.allocationMethod}</p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Linked Units</h3>
            <p className="text-xs text-muted-foreground">
              Select the units supplied by this EWA account. A unit can only be linked to one active account at a time.
            </p>
          </div>
          {form.buildingId && (
            <span className="text-sm font-medium text-muted-foreground">
              {buildingUnits.length} unit(s) in building
            </span>
          )}
        </div>

        {!form.buildingId ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Select a building first to see its units.
          </p>
        ) : buildingUnits.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            This building has no units yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">
                    <input
                      type="checkbox"
                      aria-label="Select all units"
                      checked={linkedUnitIds.length === buildingUnits.length && buildingUnits.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLinkedUnitIds(buildingUnits.map((u) => u.id));
                          setRules(buildingUnits.map((u) => ({ unitId: u.id })));
                        } else {
                          setLinkedUnitIds([]);
                          setRules([]);
                        }
                      }}
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Unit #</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  {form.allocationMethod === "percentage" && (
                    <th className="px-3 py-2 text-left font-medium">Percentage (%)</th>
                  )}
                  {form.allocationMethod === "fixed" && (
                    <th className="px-3 py-2 text-left font-medium">Fixed Amount (BHD)</th>
                  )}
                  {form.allocationMethod === "meter" && (
                    <>
                      <th className="px-3 py-2 text-left font-medium">Previous Reading</th>
                      <th className="px-3 py-2 text-left font-medium">Current Reading</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {buildingUnits.map((u) => {
                  const linked = linkedUnitIds.includes(u.id);
                  const rule = rules.find((r) => r.unitId === u.id);
                  return (
                    <tr key={u.id} className={linked ? "bg-primary/5" : ""}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={linked}
                          onChange={() => toggleUnit(u.id)}
                          aria-label={`Link unit ${u.unitNumber}`}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">{u.unitNumber}</td>
                      <td className="px-3 py-2 text-muted-foreground">{u.status}</td>
                      {form.allocationMethod === "percentage" && (
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            disabled={!linked}
                            value={rule?.percentage ?? ""}
                            onChange={(e) =>
                              updateRule(u.id, { percentage: Number(e.target.value) })
                            }
                            className="h-8 w-24"
                            placeholder="0"
                          />
                        </td>
                      )}
                      {form.allocationMethod === "fixed" && (
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            disabled={!linked}
                            value={rule?.fixedAmount ?? ""}
                            onChange={(e) =>
                              updateRule(u.id, { fixedAmount: Number(e.target.value) })
                            }
                            className="h-8 w-28"
                            placeholder="0.00"
                          />
                        </td>
                      )}
                      {form.allocationMethod === "meter" && (
                        <>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              disabled={!linked}
                              value={rule?.previousReading ?? ""}
                              onChange={(e) =>
                                updateRule(u.id, { previousReading: Number(e.target.value) })
                              }
                              className="h-8 w-28"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              disabled={!linked}
                              value={rule?.currentReading ?? ""}
                              onChange={(e) =>
                                updateRule(u.id, { currentReading: Number(e.target.value) })
                              }
                              className="h-8 w-28"
                              placeholder="0"
                            />
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {errors.linkedUnitIds && (
          <p className="mt-2 text-xs text-red-500">{errors.linkedUnitIds}</p>
        )}

        {form.allocationMethod === "percentage" && linkedUnitIds.length > 0 && (
          <p className={`mt-2 text-xs ${Math.abs(pctTotal - 100) > 0.01 ? "text-red-500" : "text-emerald-600"}`}>
            Percentage total: {pctTotal.toFixed(2)}% {Math.abs(pctTotal - 100) > 0.01 ? "(must be 100%)" : "✓"}
          </p>
        )}
        {form.allocationMethod === "fixed" && linkedUnitIds.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Fixed total: {fixedTotal.toFixed(2)} BHD — any difference from the monthly bill is charged to the landlord.
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-base font-semibold">Vacant Unit Handling</h3>
        <div className="space-y-2">
          {vacantActions.map((v) => (
            <label
              key={v.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                form.vacantAction === v.value
                  ? "border-primary bg-primary/5"
                  : "border-input hover:bg-muted/30"
              }`}
            >
              <input
                type="radio"
                name="vacantAction"
                value={v.value}
                checked={form.vacantAction === v.value}
                onChange={(e) => update("vacantAction", e.target.value)}
              />
              <span>{v.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Any notes about this account, meter location, etc."
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{isEdit ? "Save Changes" : "Create EWA Account"}</Button>
      </div>
    </form>
  );
}
