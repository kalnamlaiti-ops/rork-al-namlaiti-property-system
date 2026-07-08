import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import AssetForm from "@/components/forms/AssetForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Search, Pencil, Eye, Package, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Asset } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 0 }).format(amount);
}

export default function Assets() {
  const navigate = useNavigate();
  const { assets, getBuildingById, deleteAsset } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();
  const [viewingAsset, setViewingAsset] = useState<Asset | undefined>();
  const [deletingAsset, setDeletingAsset] = useState<Asset | undefined>();

  const totalValue = assets.reduce((sum, a) => sum + a.cost, 0);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      const building = a.buildingId ? getBuildingById(a.buildingId) : undefined;
      const matchesSearch =
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.category.toLowerCase().includes(search.toLowerCase()) ||
        (building?.name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, assets, getBuildingById]);

  const openAdd = () => {
    setEditingAsset(undefined);
    setDialogOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingAsset(undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Assets" subtitle={`${assets.length} asset(s) registered`} action={{ label: "Add Asset", onClick: openAdd }} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Total Asset Value</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search asset name, category, building..."
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
          <option value="Disposed">Disposed</option>
          <option value="Under Maintenance">Under Maintenance</option>
        </select>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Asset</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Building</th>
                <th className="px-4 py-3 text-left font-medium">Purchase Date</th>
                <th className="px-4 py-3 text-right font-medium">Cost</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((a) => {
                const building = a.buildingId ? getBuildingById(a.buildingId) : undefined;
                return (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3">{a.category}</td>
                    <td className="px-4 py-3">{building?.name || "—"}</td>
                    <td className="px-4 py-3">{format(new Date(a.purchaseDate), "dd/MM/yyyy")}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(a.cost)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setViewingAsset(a)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> View
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingAsset(a)}>
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
        open={Boolean(deletingAsset)}
        onOpenChange={(o) => !o && setDeletingAsset(undefined)}
        itemName={deletingAsset?.name}
        onConfirm={() => deletingAsset && deleteAsset(deletingAsset.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAsset ? "Edit Asset" : "Add Asset"}</DialogTitle>
            <DialogDescription>Fill in the asset details below.</DialogDescription>
          </DialogHeader>
          <AssetForm initialData={editingAsset} onClose={closeDialog} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingAsset)} onOpenChange={() => setViewingAsset(undefined)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingAsset?.name}</DialogTitle>
            <DialogDescription>Asset details</DialogDescription>
          </DialogHeader>
          {viewingAsset && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><p className="text-muted-foreground">Category</p><p className="font-medium">{viewingAsset.category}</p></div>
                <div><p className="text-muted-foreground">Status</p><p className="font-medium"><StatusBadge status={viewingAsset.status} /></p></div>
                <div><p className="text-muted-foreground">Purchase Date</p><p className="font-medium">{format(new Date(viewingAsset.purchaseDate), "dd MMM yyyy")}</p></div>
                <div><p className="text-muted-foreground">Cost</p><p className="font-medium">{formatCurrency(viewingAsset.cost)}</p></div>
                <div className="sm:col-span-2"><p className="text-muted-foreground">Building</p><p className="font-medium">{getBuildingById(viewingAsset.buildingId ?? "")?.name || "—"}</p></div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => { setViewingAsset(undefined); openEdit(viewingAsset); }}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
