import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/context/DataContext";
import TenantForm from "@/components/forms/TenantForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Search, Pencil, Trash2 } from "lucide-react";
import type { Tenant } from "@/types";

export default function Tenants() {
  const navigate = useNavigate();
  const { tenants, buildings, getTenantLeases, getUnitById, getBuildingById, deleteTenant } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [buildingFilter, setBuildingFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | undefined>();
  const [deletingTenant, setDeletingTenant] = useState<Tenant | undefined>();

  const tenantBuildings = useMemo(() => {
    const map = new Map<string, string[]>();
    tenants.forEach((t) => {
      const ids = new Set<string>();
      if (t.buildingId) ids.add(t.buildingId);
      getTenantLeases(t.id)
        .map((l) => getUnitById(l.unitId)?.buildingId)
        .filter(Boolean)
        .forEach((id) => ids.add(id as string));
      const names = Array.from(ids)
        .map((buildingId) => getBuildingById(buildingId)?.name ?? "")
        .filter(Boolean);
      map.set(t.id, names);
    });
    return map;
  }, [tenants, getTenantLeases, getUnitById, getBuildingById]);

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase()) ||
        t.phone.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || t.status === statusFilter;
      const matchesType = typeFilter === "All" || t.type === typeFilter;
      const buildingNames = tenantBuildings.get(t.id) ?? [];
      const matchesBuilding =
        buildingFilter === "All" || buildingNames.some((name) => name === buildingFilter);
      return matchesSearch && matchesStatus && matchesType && matchesBuilding;
    });
  }, [search, statusFilter, typeFilter, buildingFilter, tenants, tenantBuildings]);

  const openAdd = () => {
    setEditingTenant(undefined);
    setDialogOpen(true);
  };

  const openEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTenant(undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        subtitle={`${tenants.length} tenant(s) registered`}
        action={{ label: "Add Tenant", onClick: openAdd }}
      />

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={buildingFilter} onValueChange={setBuildingFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Buildings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Buildings</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b.id} value={b.name}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="All">All Types</option>
            <option value="Individual">Individual</option>
            <option value="Company">Company</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Contact</th>
                <th className="px-4 py-3 text-left font-medium">Building</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Leases</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                        {t.name.charAt(0)}
                      </div>
                      <span className="font-medium text-foreground">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p>{t.email}</p>
                    <p className="text-xs text-muted-foreground">{t.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    {(tenantBuildings.get(t.id) ?? []).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.type} />
                  </td>
                  <td className="px-4 py-3">{getTenantLeases(t.id).length}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/tenants/${t.id}`)}>
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingTenant(t)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={Boolean(deletingTenant)}
        onOpenChange={(o) => !o && setDeletingTenant(undefined)}
        itemName={deletingTenant?.name}
        onConfirm={() => deletingTenant && deleteTenant(deletingTenant.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTenant ? "Edit Tenant" : "New Tenant"}</DialogTitle>
            <DialogDescription>Fill in the tenant details below.</DialogDescription>
          </DialogHeader>
          <TenantForm initialData={editingTenant} onClose={closeDialog} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
