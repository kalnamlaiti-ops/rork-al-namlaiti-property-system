import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import UnitForm from "@/components/forms/UnitForm";
import { ArrowLeft, Pencil, Home, Building2, FileText, Wrench } from "lucide-react";

export default function UnitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { units, buildings, leases, expenses, getUnitById, getBuildingById, getTenantById, getLeaseById } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);

  const unit = id ? getUnitById(id) : undefined;
  const building = unit ? getBuildingById(unit.buildingId) : undefined;
  const lease = unit ? leases.find((l) => l.unitId === unit.id && l.status === "Active") : undefined;
  const tenant = lease ? getTenantById(lease.tenantId) : undefined;
  const unitExpenses = unit ? expenses.filter((e) => e.unitId === unit.id) : [];

  if (!unit) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/units")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Unit not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/units")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">Unit {unit.unitNumber}</h1>
        <StatusBadge status={unit.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        <Link to={`/buildings/${building?.id}`} className="text-primary hover:underline">{building?.name}</Link>
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Unit Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="text-sm text-muted-foreground">Type</p><p className="font-medium">{unit.type}</p></div>
              <div><p className="text-sm text-muted-foreground">Furnished</p><p className="font-medium">{unit.furnished}</p></div>
              <div><p className="text-sm text-muted-foreground">Floor</p><p className="font-medium">{unit.floor}</p></div>
              <div><p className="text-sm text-muted-foreground">Size</p><p className="font-medium">{unit.size} sqft</p></div>
              <div><p className="text-sm text-muted-foreground">Bedrooms</p><p className="font-medium">{unit.bedrooms}</p></div>
              <div><p className="text-sm text-muted-foreground">Bathrooms</p><p className="font-medium">{unit.bathrooms}</p></div>
              <div><p className="text-sm text-muted-foreground">Base Rent</p><p className="font-medium">BHD {unit.baseRent}</p></div>
              <div><p className="text-sm text-muted-foreground">Security Deposit</p><p className="font-medium">BHD {unit.securityDeposit}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Current Lease</h3>
            {lease ? (
              <div className="space-y-3">
                <Link to={`/leases/${lease.id}`} className="font-medium text-primary hover:underline">{lease.contractNumber}</Link>
                <p className="text-sm text-muted-foreground">Tenant: <Link to={`/tenants/${lease.tenantId}`} className="text-primary hover:underline">{tenant?.name}</Link></p>
                <p className="text-sm text-muted-foreground">Rent: BHD {lease.monthlyRent}/mo</p>
                <p className="text-sm text-muted-foreground">Until: {lease.endDate}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active lease.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Recent Expenses</h3>
            {unitExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses linked.</p>
            ) : (
              <div className="space-y-3">
                {unitExpenses.slice(0, 5).map((e) => (
                  <Link key={e.id} to={`/expenses/${e.id}`} className="flex items-center justify-between rounded-lg bg-muted/50 p-3 hover:bg-muted/80">
                    <div>
                      <p className="font-medium">{e.category}</p>
                      <p className="text-xs text-muted-foreground">{e.vendor}</p>
                    </div>
                    <p className="font-medium">BHD {e.amount}</p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Quick Actions</h3>
            <div className="space-y-2">
              <Button variant="secondary" className="w-full justify-start" onClick={() => navigate("/leases")}>
                <FileText className="mr-2 h-4 w-4" /> View Lease History
              </Button>
              <Button variant="secondary" className="w-full justify-start" onClick={() => navigate("/maintenance")}>
                <Wrench className="mr-2 h-4 w-4" /> Maintenance Requests
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
            <DialogDescription>Update the unit details below.</DialogDescription>
          </DialogHeader>
          <UnitForm initialData={unit} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
