import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import VendorForm from "@/components/forms/VendorForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Search, Phone, Mail, Pencil, Eye, Trash2 } from "lucide-react";
import type { Vendor } from "@/types";

export default function Vendors() {
  const navigate = useNavigate();
  const { vendors, deleteVendor } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | undefined>();
  const [viewingVendor, setViewingVendor] = useState<Vendor | undefined>();
  const [deletingVendor, setDeletingVendor] = useState<Vendor | undefined>();

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.category.toLowerCase().includes(search.toLowerCase()) ||
        v.contact.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, vendors]);

  const openAdd = () => {
    setEditingVendor(undefined);
    setDialogOpen(true);
  };

  const openEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingVendor(undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Vendors" subtitle={`${vendors.length} vendor(s)`} action={{ label: "Add Vendor", onClick: openAdd }} />

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vendor name, category, contact..."
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
        {filtered.map((v) => (
          <Card key={v.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{v.name}</p>
                  <p className="text-sm text-muted-foreground">{v.category}</p>
                </div>
                <StatusBadge status={v.status} />
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs font-medium uppercase text-foreground">Contact:</span> {v.contact}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {v.phone}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {v.email}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" className="flex-1" size="sm" onClick={() => setViewingVendor(v)}>
                  <Eye className="mr-2 h-4 w-4" /> View
                </Button>
                <Button variant="outline" className="flex-1" size="sm" onClick={() => openEdit(v)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingVendor(v)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DeleteConfirmDialog
        open={Boolean(deletingVendor)}
        onOpenChange={(o) => !o && setDeletingVendor(undefined)}
        itemName={deletingVendor?.name}
        onConfirm={() => deletingVendor && deleteVendor(deletingVendor.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
            <DialogDescription>Fill in the vendor details below.</DialogDescription>
          </DialogHeader>
          <VendorForm initialData={editingVendor} onClose={closeDialog} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingVendor)} onOpenChange={() => setViewingVendor(undefined)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingVendor?.name}</DialogTitle>
            <DialogDescription>Vendor details</DialogDescription>
          </DialogHeader>
          {viewingVendor && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><p className="text-muted-foreground">Category</p><p className="font-medium">{viewingVendor.category}</p></div>
                <div><p className="text-muted-foreground">Status</p><p className="font-medium"><StatusBadge status={viewingVendor.status} /></p></div>
                <div><p className="text-muted-foreground">Contact Person</p><p className="font-medium">{viewingVendor.contact}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-medium flex items-center gap-2"><Phone className="h-4 w-4" /> {viewingVendor.phone}</p></div>
                <div className="sm:col-span-2"><p className="text-muted-foreground">Email</p><p className="font-medium flex items-center gap-2"><Mail className="h-4 w-4" /> {viewingVendor.email}</p></div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => { setViewingVendor(undefined); openEdit(viewingVendor); }}>
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
