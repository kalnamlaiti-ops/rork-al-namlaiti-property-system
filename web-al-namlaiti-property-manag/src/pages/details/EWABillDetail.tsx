import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import EWABillForm from "@/components/forms/EWABillForm";
import { ArrowLeft, Pencil, Zap, Calendar, FileText, Home, Building2 } from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 2 }).format(amount);
}

export default function EWABillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ewaBills, leases, units, buildings, getBuildingById } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);

  const bill = id ? ewaBills.find((b) => b.id === id) : undefined;
  const lease = bill ? leases.find((l) => l.id === bill.leaseId) : undefined;
  const unit = bill ? units.find((u) => u.id === bill.unitId) : undefined;
  const building = bill ? getBuildingById(bill.buildingId) : undefined;

  if (!bill) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/ewa-bills")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">EWA bill not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/ewa-bills")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{bill.billNumber}</h1>
        <StatusBadge status={bill.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Bill Amount</p><p className="text-2xl font-bold">{formatCurrency(bill.billAmount)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Lease Limit</p><p className="text-2xl font-bold">{formatCurrency(bill.limit)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Excess</p><p className="text-2xl font-bold text-orange-600">{formatCurrency(bill.excess)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Due Date</p><p className="text-2xl font-bold">{bill.dueDate}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Bill Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="text-sm text-muted-foreground">Month</p><p className="font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> {bill.month}</p></div>
              <div><p className="text-sm text-muted-foreground">Lease</p><p className="font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> <Link to={`/leases/${lease?.id}`} className="text-primary hover:underline">{lease?.contractNumber}</Link></p></div>
              <div><p className="text-sm text-muted-foreground">Unit</p><p className="font-medium flex items-center gap-2"><Home className="h-4 w-4" /> <Link to={`/units/${unit?.id}`} className="text-primary hover:underline">{unit?.unitNumber}</Link></p></div>
              <div><p className="text-sm text-muted-foreground">Building</p><p className="font-medium flex items-center gap-2"><Building2 className="h-4 w-4" /> <Link to={`/buildings/${building?.id}`} className="text-primary hover:underline">{building?.name}</Link></p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit EWA Bill</DialogTitle>
            <DialogDescription>Update the EWA bill details below.</DialogDescription>
          </DialogHeader>
          <EWABillForm initialData={bill} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
