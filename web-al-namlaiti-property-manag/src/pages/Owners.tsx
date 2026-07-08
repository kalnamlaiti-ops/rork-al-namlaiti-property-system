import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import OwnerForm from "@/components/forms/OwnerForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Phone, Building2, Landmark, Eye, Pencil, Trash2 } from "lucide-react";
import type { Owner } from "@/types";

export default function Owners() {
  const navigate = useNavigate();
  const { owners, buildings, deleteOwner } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | undefined>();
  const [deletingOwner, setDeletingOwner] = useState<Owner | undefined>();

  const filtered = useMemo(() => {
    return owners.filter((o) => {
      const matchesSearch = o.name.toLowerCase().includes(search.toLowerCase()) || o.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, owners]);

  const openAdd = () => {
    setEditingOwner(undefined);
    setDialogOpen(true);
  };

  const openEdit = (owner: Owner) => {
    setEditingOwner(owner);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingOwner(undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Property Owners"
        subtitle={`${owners.length} owner(s) registered`}
        action={{ label: "Add Owner", onClick: openAdd }}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
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
        {filtered.map((owner) => {
          const ownerBuildings = buildings.filter((b) => b.ownerId === owner.id);
          return (
            <Card key={owner.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                      {owner.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{owner.name}</p>
                      <p className="text-sm text-muted-foreground">{owner.email}</p>
                    </div>
                  </div>
                  <StatusBadge status={owner.status} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3">
                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">{ownerBuildings.length}</p>
                    <p className="text-xs text-muted-foreground">Buildings</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">{owner.taxId || "—"}</p>
                    <p className="text-xs text-muted-foreground">Tax ID</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {owner.phone}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Landmark className="h-4 w-4" />
                    {owner.bankName}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" size="sm" onClick={() => navigate(`/owners/${owner.id}`)}>
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Button>
                  <Button variant="outline" className="flex-1" size="sm" onClick={() => openEdit(owner)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingOwner(owner)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DeleteConfirmDialog
        open={Boolean(deletingOwner)}
        onOpenChange={(o) => !o && setDeletingOwner(undefined)}
        itemName={deletingOwner?.name}
        onConfirm={() => deletingOwner && deleteOwner(deletingOwner.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOwner ? "Edit Owner" : "New Owner"}</DialogTitle>
            <DialogDescription>Fill in the owner details below.</DialogDescription>
          </DialogHeader>
          <OwnerForm initialData={editingOwner} onClose={closeDialog} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
