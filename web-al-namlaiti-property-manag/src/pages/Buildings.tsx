import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import BuildingForm from "@/components/forms/BuildingForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { MapPin, Layers, Home, Users, Eye, Pencil, Trash2 } from "lucide-react";
import type { Building } from "@/types";

export default function Buildings() {
  const navigate = useNavigate();
  const { buildings, owners, getBuildingUnits, deleteBuilding } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | undefined>();
  const [deletingBuilding, setDeletingBuilding] = useState<Building | undefined>();

  const filtered = useMemo(() => {
    return buildings.filter((b) => {
      const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase()) || b.code.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, buildings]);

  const openAdd = () => {
    setEditingBuilding(undefined);
    setDialogOpen(true);
  };

  const openEdit = (building: Building) => {
    setEditingBuilding(building);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingBuilding(undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buildings"
        subtitle={`${buildings.length} building(s) in your portfolio`}
        action={{ label: "Add Building", onClick: openAdd }}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((b) => {
          const owner = owners.find((o) => o.id === b.ownerId);
          const unitCount = getBuildingUnits(b.id).length;
          return (
            <Card key={b.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{b.name}</p>
                    <p className="text-sm text-muted-foreground">{b.code}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>

                <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  {b.address}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{b.floors}</p>
                    <p className="text-xs text-muted-foreground">Floors</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{unitCount}</p>
                    <p className="text-xs text-muted-foreground">Units</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{owner ? 1 : 0}</p>
                    <p className="text-xs text-muted-foreground">Owners</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" size="sm" onClick={() => navigate(`/buildings/${b.id}`)}>
                    <Eye className="mr-2 h-4 w-4" /> View Details
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingBuilding(b)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DeleteConfirmDialog
        open={Boolean(deletingBuilding)}
        onOpenChange={(o) => !o && setDeletingBuilding(undefined)}
        itemName={deletingBuilding?.name}
        onConfirm={() => deletingBuilding && deleteBuilding(deletingBuilding.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBuilding ? "Edit Building" : "Add New Building"}</DialogTitle>
            <DialogDescription>Fill in the building details below.</DialogDescription>
          </DialogHeader>
          <BuildingForm initialData={editingBuilding} onClose={closeDialog} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
