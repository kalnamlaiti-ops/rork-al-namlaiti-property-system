import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import JournalEntryForm from "@/components/forms/JournalEntryForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Search, Pencil, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { JournalEntry } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 0 }).format(amount);
}

export default function JournalEntries() {
  const navigate = useNavigate();
  const { journalEntries, chartOfAccounts, deleteJournalEntry } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | undefined>();
  const [deletingEntry, setDeletingEntry] = useState<JournalEntry | undefined>();

  const filtered = useMemo(() => {
    return journalEntries.filter((j) =>
      j.entryNumber.toLowerCase().includes(search.toLowerCase()) ||
      j.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, journalEntries]);

  const openAdd = () => {
    setEditingEntry(undefined);
    setDialogOpen(true);
  };

  const openEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingEntry(undefined);
  };

  const viewEntry = (id: string) => {
    navigate(`/journal-entries/${id}`);
  };

  const accountName = (id: string) => chartOfAccounts.find((a) => a.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal Entries"
        subtitle={`${journalEntries.length} journal entry(s)`}
        action={{ label: "Add Entry", onClick: openAdd }}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search entry number, description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-4">
        {filtered.map((j) => (
          <Card key={j.id}>
            <CardContent className="p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{j.entryNumber}</p>
                  <p className="text-sm text-muted-foreground">{format(new Date(j.date), "dd MMM yyyy")} · {j.description}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-semibold text-foreground">{formatCurrency(j.total)}</p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Account</th>
                      <th className="px-4 py-2 text-right font-medium">Debit</th>
                      <th className="px-4 py-2 text-right font-medium">Credit</th>
                      <th className="px-4 py-2 text-left font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {j.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-2">{accountName(line.accountId)}</td>
                        <td className="px-4 py-2 text-right">{line.debit > 0 ? formatCurrency(line.debit) : "—"}</td>
                        <td className="px-4 py-2 text-right">{line.credit > 0 ? formatCurrency(line.credit) : "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{line.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => viewEntry(j.id)}>
                  <Eye className="mr-1 h-3.5 w-3.5" /> View
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(j)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingEntry(j)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DeleteConfirmDialog
        open={Boolean(deletingEntry)}
        onOpenChange={(o) => !o && setDeletingEntry(undefined)}
        itemName={deletingEntry?.entryNumber}
        onConfirm={() => deletingEntry && deleteJournalEntry(deletingEntry.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Journal Entry" : "New Journal Entry"}</DialogTitle>
            <DialogDescription>Enter the journal entry details and ensure debits equal credits.</DialogDescription>
          </DialogHeader>
          <JournalEntryForm initialData={editingEntry} onClose={closeDialog} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
