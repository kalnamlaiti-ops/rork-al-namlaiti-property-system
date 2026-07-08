import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import ComplaintForm from "@/components/forms/ComplaintForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Search, Pencil, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Complaint } from "@/types";

export default function Complaints() {
  const { complaints, getTenantById, getUnitById, getBuildingById, deleteComplaint } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | undefined>();
  const [viewingComplaint, setViewingComplaint] = useState<Complaint | undefined>();
  const [deletingComplaint, setDeletingComplaint] = useState<Complaint | undefined>();

  const openCount = complaints.filter((c) => c.status === "Open").length;
  const inProgress = complaints.filter((c) => c.status === "In Progress").length;

  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      const tenant = getTenantById(c.tenantId);
      const matchesSearch =
        c.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        (tenant?.name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;
      const matchesPriority = priorityFilter === "All" || c.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [search, statusFilter, priorityFilter, complaints, getTenantById]);

  const openAdd = () => {
    setEditingComplaint(undefined);
    setDialogOpen(true);
  };

  const openEdit = (complaint: Complaint) => {
    setEditingComplaint(complaint);
    setDialogOpen(true);
  };

  const closeView = () => setViewingComplaint(undefined);

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingComplaint(undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Complaints"
        subtitle={`${complaints.length} ticket(s) · ${openCount} open · ${inProgress} in progress`}
        action={{ label: "New Ticket", onClick: openAdd }}
      />

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search ticket number, title, tenant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="All">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Ticket #</th>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Tenant</th>
                <th className="px-4 py-3 text-left font-medium">Unit</th>
                <th className="px-4 py-3 text-left font-medium">Priority</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c) => {
                const tenant = getTenantById(c.tenantId);
                const unit = getUnitById(c.unitId);
                const building = unit ? getBuildingById(unit.buildingId) : undefined;
                return (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{c.ticketNumber}</td>
                    <td className="px-4 py-3">{c.title}</td>
                    <td className="px-4 py-3">{tenant?.name}</td>
                    <td className="px-4 py-3">
                      <p>{unit?.unitNumber}</p>
                      <p className="text-xs text-muted-foreground">{building?.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3">{c.createdAt}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setViewingComplaint(c)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> View
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingComplaint(c)}>
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
        open={Boolean(deletingComplaint)}
        onOpenChange={(o) => !o && setDeletingComplaint(undefined)}
        itemName={deletingComplaint?.ticketNumber}
        onConfirm={() => deletingComplaint && deleteComplaint(deletingComplaint.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingComplaint ? "Edit Ticket" : "New Ticket"}</DialogTitle>
            <DialogDescription>Fill in the complaint details below.</DialogDescription>
          </DialogHeader>
          <ComplaintForm initialData={editingComplaint} onClose={closeDialog} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingComplaint)} onOpenChange={closeView}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingComplaint?.ticketNumber}</DialogTitle>
            <DialogDescription>{viewingComplaint?.title}</DialogDescription>
          </DialogHeader>
          {viewingComplaint && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Tenant</p>
                  <p className="font-medium">{getTenantById(viewingComplaint.tenantId)?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Unit</p>
                  <p className="font-medium">{getUnitById(viewingComplaint.unitId)?.unitNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Priority</p>
                  <p className="font-medium"><StatusBadge status={viewingComplaint.priority} /></p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium"><StatusBadge status={viewingComplaint.status} /></p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{format(new Date(viewingComplaint.createdAt), "dd MMM yyyy")}</p>
                </div>
              </div>
              {viewingComplaint.description && (
                <div>
                  <p className="text-muted-foreground">Description</p>
                  <p className="font-medium whitespace-pre-line">{viewingComplaint.description}</p>
                </div>
              )}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => { closeView(); openEdit(viewingComplaint); }}>
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
