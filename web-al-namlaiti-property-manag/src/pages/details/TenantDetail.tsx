import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import TenantForm from "@/components/forms/TenantForm";
import { ArrowLeft, Pencil, Mail, Phone, FileText, Building2 } from "lucide-react";

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenants, leases, units, getTenantById, getUnitById, getBuildingById } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);

  const tenant = id ? getTenantById(id) : undefined;
  const tenantLeases = tenant ? leases.filter((l) => l.tenantId === tenant.id) : [];

  if (!tenant) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/tenants")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Tenant not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/tenants")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-lg">
          {tenant.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{tenant.name}</h1>
          <p className="text-sm text-muted-foreground">{tenant.type} · {tenant.crNumber ? `CPR: ${tenant.crNumber}` : "No CPR"}</p>
        </div>
        <StatusBadge status={tenant.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Personal Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium flex items-center gap-2"><Mail className="h-4 w-4" /> {tenant.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium flex items-center gap-2"><Phone className="h-4 w-4" /> {tenant.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{tenant.address || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Building</p>
                <p className="font-medium flex items-center gap-2"><Building2 className="h-4 w-4" /> {tenant.buildingId ? getBuildingById(tenant.buildingId)?.name : "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium whitespace-pre-line">{tenant.notes || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Lease Summary</h3>
            <p className="text-3xl font-bold text-foreground">{tenantLeases.length}</p>
            <p className="text-sm text-muted-foreground">Active leases</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-base font-semibold">Leases</h3>
          {tenantLeases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leases.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Contract #</th>
                    <th className="px-4 py-3 text-left font-medium">Unit</th>
                    <th className="px-4 py-3 text-left font-medium">Building</th>
                    <th className="px-4 py-3 text-left font-medium">Rent</th>
                    <th className="px-4 py-3 text-left font-medium">Period</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tenantLeases.map((l) => {
                    const unit = getUnitById(l.unitId);
                    const building = unit ? getBuildingById(unit.buildingId) : undefined;
                    return (
                      <tr key={l.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link to={`/leases/${l.id}`} className="font-medium text-primary hover:underline">{l.contractNumber}</Link>
                        </td>
                        <td className="px-4 py-3">{unit?.unitNumber}</td>
                        <td className="px-4 py-3">{building?.name}</td>
                        <td className="px-4 py-3">BHD {l.monthlyRent}</td>
                        <td className="px-4 py-3">{l.startDate} to {l.endDate}</td>
                        <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>Update the tenant details below.</DialogDescription>
          </DialogHeader>
          <TenantForm initialData={tenant} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
