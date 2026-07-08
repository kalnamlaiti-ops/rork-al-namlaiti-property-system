import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import JournalEntryForm from "@/components/forms/JournalEntryForm";
import { ArrowLeft, Pencil, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 0 }).format(amount);
}

export default function JournalEntryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { journalEntries, chartOfAccounts, getJournalEntryById } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);

  const entry = id ? getJournalEntryById(id) : undefined;
  const accountName = (id: string) => chartOfAccounts.find((a) => a.id === id)?.name ?? id;

  if (!entry) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/journal-entries")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Journal entry not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/journal-entries")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{entry.entryNumber}</h1>
      </div>
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Calendar className="h-4 w-4" /> {format(new Date(entry.date), "dd MMM yyyy")}
        <FileText className="ml-2 h-4 w-4" /> {entry.description}
      </p>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">Journal Lines</h3>
            <p className="text-sm font-semibold text-muted-foreground">Total: {formatCurrency(entry.total)}</p>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Account</th>
                  <th className="px-4 py-3 text-right font-medium">Debit</th>
                  <th className="px-4 py-3 text-right font-medium">Credit</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entry.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 font-medium">{accountName(line.accountId)}</td>
                    <td className="px-4 py-3 text-right">{line.debit > 0 ? formatCurrency(line.debit) : "—"}</td>
                    <td className="px-4 py-3 text-right">{line.credit > 0 ? formatCurrency(line.credit) : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{line.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Journal Entry</DialogTitle>
            <DialogDescription>Update the journal entry details below.</DialogDescription>
          </DialogHeader>
          <JournalEntryForm initialData={entry} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
