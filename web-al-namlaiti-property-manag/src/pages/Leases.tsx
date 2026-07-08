import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import LeaseForm from "@/components/forms/LeaseForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Search, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Lease } from "@/types";

export default function Leases() {
  const navigate = useNavigate();
  const { leases, buildings, getTenantById, getUnitById, getBuildingById, deleteLease } = useData();
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLease, setEditingLease] = useState<Lease | undefined>();
  const [deletingLease, setDeletingLease] = useState<Lease | undefined>();

  const expiringSoon = leases.filter((l) => {
    const end = new Date(l.endDate);
    const diff = Math.ceil((end.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return l.status === "Active" && diff <= 60 && diff > 0;
  }).length;

  const filtered = useMemo(() => {
    return leases.filter((l) => {
      const tenant = getTenantById(l.tenantId);
      const unit = getUnitById(l.unitId);
      const building = unit ? getBuildingById(unit.buildingId) : undefined;
      const matchesSearch =
        l.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
        (tenant?.name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesBuilding = buildingFilter === "All" || building?.id === buildingFilter;
      const matchesStatus = statusFilter === "All" || l.status === statusFilter;
      return matchesSearch && matchesBuilding && matchesStatus;
    });
  }, [search, buildingFilter, statusFilter, leases, getTenantById, getUnitById, getBuildingById]);

  const openAdd = () => {
    setEditingLease(undefined);
    setDialogOpen(true);
  };

  const openEdit = (lease: Lease) => {
    setEditingLease(lease);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingLease(undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lease Contracts"
        subtitle={`${leases.length} contract(s)`}
        action={{ label: "New Lease", onClick: openAdd }}
        secondaryAction={expiringSoon > 0 ? { label: `Expiring Soon (${expiringSoon})`, variant: "outline" } : undefined}
      />

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contract number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="All">All Buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
            <option value="Terminating">Terminating</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Contract #</th>
                <th className="px-4 py-3 text-left font-medium">Tenant</th>
                <th className="px-4 py-3 text-left font-medium">Unit / Building</th>
                <th className="px-4 py-3 text-left font-medium">Rent (BHD/mo)</th>
                <th className="px-4 py-3 text-left font-medium">Period</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((l) => {
                const tenant = getTenantById(l.tenantId);
                const unit = getUnitById(l.unitId);
                const building = unit ? getBuildingById(unit.buildingId) : undefined;
                return (
                  <tr key={l.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{l.contractNumber}</td>
                    <td className="px-4 py-3">{tenant?.name}</td>
                    <td className="px-4 py-3">
                      <p>{unit?.unitNumber}</p>
                      <p className="text-xs text-muted-foreground">{building?.name}</p>
                    </td>
                    <td className="px-4 py-3">{l.monthlyRent}</td>
                    <td className="px-4 py-3">
                      <p>{format(new Date(l.startDate), "dd/MM/yyyy")}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(l.endDate), "dd/MM/yyyy")}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/leases/${l.id}`)}>
                          View
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(l)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingLease(l)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={Boolean(deletingLease)}
        onOpenChange={(o) => !o && setDeletingLease(undefined)}
        itemName={deletingLease?.contractNumber}
        onConfirm={() => deletingLease && deleteLease(deletingLease.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLease ? "Edit Lease" : "New Lease"}</DialogTitle>
            <DialogDescription>Fill in the lease contract details below.</DialogDescription>
          </DialogHeader>
          <LeaseForm initialData={editingLease} onClose={closeDialog} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
