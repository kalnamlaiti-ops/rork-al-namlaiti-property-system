import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData, generateCode } from "@/context/DataContext";
import type { JournalEntry, JournalLine } from "@/types";

interface JournalEntryFormProps {
  initialData?: JournalEntry;
  onClose: () => void;
}

function createLine(): JournalLine {
  return { id: `jl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, accountId: "", debit: 0, credit: 0, description: "" };
}

export default function JournalEntryForm({ initialData, onClose }: JournalEntryFormProps) {
  const { addJournalEntry, updateJournalEntry, chartOfAccounts, journalEntries } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    date: initialData?.date ?? new Date().toISOString().split("T")[0],
    description: initialData?.description ?? "",
    reference: initialData?.entryNumber ?? "",
    lines: initialData?.lines ?? [createLine(), createLine()],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalDebit = form.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = form.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const balanced = totalDebit === totalCredit;

  const updateLine = (index: number, field: keyof JournalLine, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((l, i) => (i === index ? { ...l, [field]: value } : l)),
    }));
  };

  const addLine = () => {
    setForm((prev) => ({ ...prev, lines: [...prev.lines, createLine()] }));
  };

  const removeLine = (index: number) => {
    setForm((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.date) next.date = "Date is required";
    if (!form.description.trim()) next.description = "Description is required";
    if (form.lines.length < 2) next.lines = "Add at least two lines";
    if (!balanced) next.lines = "Debits and credits must balance";
    const missingAccount = form.lines.some((l) => !l.accountId);
    if (missingAccount) next.lines = "Select an account for every line";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const total = Math.max(totalDebit, totalCredit);
    const entryNumber = initialData?.entryNumber ?? generateCode("JE", journalEntries.length);

    const payload = {
      entryNumber,
      date: form.date,
      description: form.description,
      total,
      lines: form.lines.map((l) => ({ ...l, debit: Number(l.debit), credit: Number(l.credit) })),
    };

    if (initialData) {
      updateJournalEntry(initialData.id, payload);
    } else {
      addJournalEntry(payload);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">Entry Date *</Label>
            <Input id="date" type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} />
            {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input id="reference" value={form.reference} onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description *</Label>
            <Input id="description" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
            {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Debit / Credit Lines</h3>
          <Button type="button" variant="ghost" onClick={addLine}>
            + Add Line
          </Button>
        </div>
        <div className="space-y-3">
          {form.lines.map((line, idx) => (
            <div key={line.id} className="grid gap-2 md:grid-cols-12 items-end">
              <div className="md:col-span-4">
                <select
                  value={line.accountId}
                  onChange={(e) => updateLine(idx, "accountId", e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select account</option>
                  {chartOfAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <Input placeholder="Description" value={line.description} onChange={(e) => updateLine(idx, "description", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Input type="number" placeholder="Debit" value={line.debit} onChange={(e) => updateLine(idx, "debit", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Input type="number" placeholder="Credit" value={line.credit} onChange={(e) => updateLine(idx, "credit", e.target.value)} />
              </div>
              <div className="md:col-span-1 flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(idx)} disabled={form.lines.length <= 2}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
        {errors.lines && <p className="mt-2 text-xs text-red-500">{errors.lines}</p>}
        <div className={`mt-4 flex items-center justify-between text-sm font-medium ${balanced ? "text-emerald-600" : "text-red-600"}`}>
          <span>Totals: Debit {totalDebit.toFixed(2)} / Credit {totalCredit.toFixed(2)}</span>
          <span>{balanced ? "Balanced" : "Unbalanced"}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{isEdit ? "Update Entry" : "Post Journal Entry"}</Button>
      </div>
    </form>
  );
}
