import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import DistributionForm from "@/components/forms/DistributionForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Search, Pencil, Eye, Trash2 } from "lucide-react";
import type { Distribution } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 0 }).format(amount);
}

export default function Distributions() {
  const navigate = useNavigate();
  const { distributions, owners, buildings, getOwnerById, getBuildingById, deleteDistribution } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDistribution, setEditingDistribution] = useState<Distribution | undefined>();
  const [deletingDistribution, setDeletingDistribution] = useState<Distribution | undefined>();

  const total = distributions.reduce((sum, d) => sum + d.amount, 0);

  const filtered = useMemo(() => {
    return distributions.filter((d) => {
      const owner = getOwnerById(d.ownerId);
      const building = d.buildingId ? getBuildingById(d.buildingId) : undefined;
      return (
        (owner?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (building?.name ?? "").toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [search, distributions, getOwnerById, getBuildingById]);

  const openAdd = () => {
    setEditingDistribution(undefined);
    setDialogOpen(true);
  };

  const openEdit = (distribution: Distribution) => {
    setEditingDistribution(distribution);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingDistribution(undefined);
  };

  const viewDistribution = (id: string) => {
    navigate(`/distributions/${id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Distributions"
        subtitle={`${distributions.length} distribution(s)`}
        action={{ label: "New Distribution", onClick: openAdd }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Total Distributions</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(total)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search owner or building..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Owner</th>
                <th className="px-4 py-3 text-left font-medium">Building</th>
                <th className="px-4 py-3 text-left font-medium">Period</th>
                <th className="px-4 py-3 text-left font-medium">Distribution Date</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((d) => {
                const owner = getOwnerById(d.ownerId);
                const building = d.buildingId ? getBuildingById(d.buildingId) : undefined;
                return (
                  <tr key={d.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{owner?.name}</td>
                    <td className="px-4 py-3">{building?.name || "All"}</td>
                    <td className="px-4 py-3">{d.period}</td>
                    <td className="px-4 py-3">{d.distributionDate}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(d.amount)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => viewDistribution(d.id)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> View
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingDistribution(d)}>
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
        open={Boolean(deletingDistribution)}
        onOpenChange={(o) => !o && setDeletingDistribution(undefined)}
        itemName={deletingDistribution?.period}
        onConfirm={() => deletingDistribution && deleteDistribution(deletingDistribution.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDistribution ? "Edit Distribution" : "New Distribution"}</DialogTitle>
            <DialogDescription>Enter the owner distribution details below.</DialogDescription>
          </DialogHeader>
          <DistributionForm initialData={editingDistribution} onClose={closeDialog} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
