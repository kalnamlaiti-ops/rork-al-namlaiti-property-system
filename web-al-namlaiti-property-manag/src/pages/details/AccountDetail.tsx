import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import ChartOfAccountForm from "@/components/forms/ChartOfAccountForm";
import { ArrowLeft, Pencil } from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 0 }).format(amount);
}

const typeColors: Record<string, string> = {
  Asset: "bg-blue-100 text-blue-700",
  Liability: "bg-amber-100 text-amber-700",
  Equity: "bg-purple-100 text-purple-700",
  Income: "bg-emerald-100 text-emerald-700",
  Expense: "bg-red-100 text-red-700",
};

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { chartOfAccounts, getChartOfAccountById } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);

  const account = id ? getChartOfAccountById(id) : undefined;
  const parent = account?.parentId ? getChartOfAccountById(account.parentId) : undefined;

  if (!account) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/chart-of-accounts")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Account not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/chart-of-accounts")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{account.name}</h1>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[account.type]}`}>
          {account.type}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">Account code {account.code}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Account Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Code</p>
                <p className="font-medium">{account.code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{account.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{account.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Parent</p>
                <p className="font-medium">{parent ? `${parent.code} — ${parent.name}` : "Top Level"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Balance</h3>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(account.balance)}</p>
            <p className="text-sm text-muted-foreground">Current balance</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>Update the account details below.</DialogDescription>
          </DialogHeader>
          <ChartOfAccountForm initialData={account} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
