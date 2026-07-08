import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import ExpenseForm from "@/components/forms/ExpenseForm";
import { ArrowLeft, Pencil, Receipt, Calendar, Building2, Home, User } from "lucide-react";
import { format } from "date-fns";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 2 }).format(amount);
}

export default function ExpenseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { expenses, buildings, units, getBuildingById, getUnitById } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);

  const expense = id ? expenses.find((e) => e.id === id) : undefined;
  const building = expense?.buildingId ? getBuildingById(expense.buildingId) : undefined;
  const unit = expense?.unitId ? getUnitById(expense.unitId) : undefined;

  if (!expense) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/expenses")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Expense not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/expenses")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{expense.expenseNumber}</h1>
        <StatusBadge status={expense.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Expense Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium flex items-center gap-2"><Receipt className="h-4 w-4" /> {expense.category}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium text-lg">{formatCurrency(expense.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> {format(new Date(expense.expenseDate), "dd MMM yyyy")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendor</p>
                <p className="font-medium">{expense.vendor}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Building</p>
                <p className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {building ? <Link to={`/buildings/${building.id}`} className="text-primary hover:underline">{building.name}</Link> : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unit</p>
                <p className="font-medium flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  {unit ? <Link to={`/units/${unit.id}`} className="text-primary hover:underline">{unit.unitNumber}</Link> : "—"}
                </p>
              </div>
              {expense.description && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{expense.description}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update the expense details below.</DialogDescription>
          </DialogHeader>
          <ExpenseForm initialData={expense} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
