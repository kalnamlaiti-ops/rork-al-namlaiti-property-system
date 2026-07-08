import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import MaintenanceForm from "@/components/forms/MaintenanceForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Search, Pencil, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { MaintenanceRequest } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 0 }).format(amount);
}

export default function Maintenance() {
  const { maintenanceRequests, getUnitById, getBuildingById, deleteMaintenanceRequest } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | undefined>();
  const [viewingRequest, setViewingRequest] = useState<MaintenanceRequest | undefined>();
  const [deletingRequest, setDeletingRequest] = useState<MaintenanceRequest | undefined>();

  const pending = maintenanceRequests.filter((m) => m.status === "Pending").length;
  const inProgress = maintenanceRequests.filter((m) => m.status === "In Progress").length;
  const totalCost = maintenanceRequests.reduce((sum, m) => sum + (m.cost ?? 0), 0);

  const filtered = useMemo(() => {
    return maintenanceRequests.filter((m) => {
      const matchesSearch =
        m.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.vendor?.toLowerCase().includes(search.toLowerCase()) || false;
      const matchesStatus = statusFilter === "All" || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, maintenanceRequests]);

  const openAdd = () => {
    setEditingRequest(undefined);
    setDialogOpen(true);
  };

  const openEdit = (request: MaintenanceRequest) => {
    setEditingRequest(request);
    setDialogOpen(true);
  };

  const closeView = () => setViewingRequest(undefined);

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRequest(undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        subtitle={`${maintenanceRequests.length} request(s) · ${pending} pending · ${inProgress} in progress`}
        action={{ label: "New Request", onClick: openAdd }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(totalCost)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search request number, title, vendor..."
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
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Request #</th>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Unit / Building</th>
                <th className="px-4 py-3 text-left font-medium">Vendor</th>
                <th className="px-4 py-3 text-left font-medium">Cost</th>
                <th className="px-4 py-3 text-left font-medium">Scheduled</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((m) => {
                const unit = getUnitById(m.unitId);
                const building = getBuildingById(m.buildingId);
                return (
                  <tr key={m.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{m.requestNumber}</td>
                    <td className="px-4 py-3">{m.title}</td>
                    <td className="px-4 py-3">
                      <p>{unit?.unitNumber}</p>
                      <p className="text-xs text-muted-foreground">{building?.name}</p>
                    </td>
                    <td className="px-4 py-3">{m.vendor || "—"}</td>
                    <td className="px-4 py-3">{m.cost ? formatCurrency(m.cost) : "—"}</td>
                    <td className="px-4 py-3">{m.scheduledDate ? format(new Date(m.scheduledDate), "dd/MM/yyyy") : "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setViewingRequest(m)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> View
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingRequest(m)}>
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
        open={Boolean(deletingRequest)}
        onOpenChange={(o) => !o && setDeletingRequest(undefined)}
        itemName={deletingRequest?.requestNumber}
        onConfirm={() => deletingRequest && deleteMaintenanceRequest(deletingRequest.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRequest ? "Edit Request" : "New Request"}</DialogTitle>
            <DialogDescription>Fill in the maintenance request details below.</DialogDescription>
          </DialogHeader>
          <MaintenanceForm initialData={editingRequest} onClose={closeDialog} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingRequest)} onOpenChange={closeView}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingRequest?.requestNumber}</DialogTitle>
            <DialogDescription>{viewingRequest?.title}</DialogDescription>
          </DialogHeader>
          {viewingRequest && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Unit</p>
                  <p className="font-medium">{getUnitById(viewingRequest.unitId)?.unitNumber}</p>
                  <p className="text-xs text-muted-foreground">{getBuildingById(viewingRequest.buildingId)?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium"><StatusBadge status={viewingRequest.status} /></p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vendor</p>
                  <p className="font-medium">{viewingRequest.vendor || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cost</p>
                  <p className="font-medium">{viewingRequest.cost ? `BHD ${viewingRequest.cost}` : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Scheduled Date</p>
                  <p className="font-medium">{viewingRequest.scheduledDate ? format(new Date(viewingRequest.scheduledDate), "dd MMM yyyy") : "—"}</p>
                </div>
              </div>
              {viewingRequest.description && (
                <div>
                  <p className="text-muted-foreground">Description</p>
                  <p className="font-medium whitespace-pre-line">{viewingRequest.description}</p>
                </div>
              )}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => { closeView(); openEdit(viewingRequest); }}>
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
