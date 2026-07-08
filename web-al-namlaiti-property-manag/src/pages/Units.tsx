import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import UnitForm from "@/components/forms/UnitForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Search, Pencil, Plus, Trash2 } from "lucide-react";
import type { Unit } from "@/types";

export default function Units() {
  const navigate = useNavigate();
  const { units, buildings, getBuildingById, getUnitLease, getTenantById, deleteUnit } = useData();
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | undefined>();
  const [deletingUnit, setDeletingUnit] = useState<Unit | undefined>();

  const filtered = useMemo(() => {
    return units.filter((u) => {
      const building = getBuildingById(u.buildingId);
      const matchesSearch =
        u.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
        (building?.name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesBuilding = buildingFilter === "All" || u.buildingId === buildingFilter;
      const matchesStatus = statusFilter === "All" || u.status === statusFilter;
      const matchesType = typeFilter === "All" || u.type === typeFilter;
      return matchesSearch && matchesBuilding && matchesStatus && matchesType;
    });
  }, [search, buildingFilter, statusFilter, typeFilter, units, getBuildingById]);

  const openAdd = () => {
    setEditingUnit(undefined);
    setDialogOpen(true);
  };

  const openEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingUnit(undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Units" subtitle={`${units.length} unit(s) registered`} action={{ label: "Add Unit", onClick: openAdd }} />

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search unit number..."
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
            <option value="Vacant">Vacant</option>
            <option value="Occupied">Occupied</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Reserved">Reserved</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="All">All Types</option>
            <option value="Studio">Studio</option>
            <option value="1BR">1BR</option>
            <option value="2BR">2BR</option>
            <option value="3BR">3BR</option>
            <option value="Commercial">Commercial</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Unit #</th>
                <th className="px-4 py-3 text-left font-medium">Building</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Floor</th>
                <th className="px-4 py-3 text-left font-medium">Size (sqft)</th>
                <th className="px-4 py-3 text-left font-medium">Rent (BHD)</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((u) => {
                const building = getBuildingById(u.buildingId);
                const lease = getUnitLease(u.id);
                const tenant = lease ? getTenantById(lease.tenantId) : undefined;
                return (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{u.unitNumber}</td>
                    <td className="px-4 py-3">{building?.name}</td>
                    <td className="px-4 py-3">{u.type}</td>
                    <td className="px-4 py-3">{u.floor}</td>
                    <td className="px-4 py-3">{u.size}</td>
                    <td className="px-4 py-3">{u.baseRent}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/units/${u.id}`)}>
                          View
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingUnit(u)}>
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
        open={Boolean(deletingUnit)}
        onOpenChange={(o) => !o && setDeletingUnit(undefined)}
        itemName={deletingUnit?.unitNumber}
        onConfirm={() => deletingUnit && deleteUnit(deletingUnit.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUnit ? "Edit Unit" : "New Unit"}</DialogTitle>
            <DialogDescription>Fill in the unit details below.</DialogDescription>
          </DialogHeader>
          <UnitForm initialData={editingUnit} onClose={closeDialog} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
