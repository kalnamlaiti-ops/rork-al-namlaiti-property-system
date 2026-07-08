import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import DocumentForm from "@/components/forms/DocumentForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Search, FileText, Download, Eye, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Document } from "@/types";

export default function Documents() {
  const navigate = useNavigate();
  const { documents, getOwnerById, getBuildingById, getUnitById, getTenantById, getLeaseById, getInvoiceById, deleteDocument } = useData();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | undefined>();
  const [viewingDocument, setViewingDocument] = useState<Document | undefined>();
  const [deletingDocument, setDeletingDocument] = useState<Document | undefined>();

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "All" || d.entityType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [search, typeFilter, documents]);

  const getEntityName = (d: Document) => {
    switch (d.entityType) {
      case "Owner": return getOwnerById(d.entityId)?.name;
      case "Building": return getBuildingById(d.entityId)?.name;
      case "Unit": return getUnitById(d.entityId)?.unitNumber;
      case "Tenant": return getTenantById(d.entityId)?.name;
      case "Lease": return getLeaseById(d.entityId)?.contractNumber;
      case "Invoice": return getInvoiceById(d.entityId)?.invoiceNumber;
      default: return "General";
    }
  };

  const getEntityLink = (d: Document) => {
    switch (d.entityType) {
      case "Owner": return `/owners/${d.entityId}`;
      case "Building": return `/buildings/${d.entityId}`;
      case "Unit": return `/units/${d.entityId}`;
      case "Tenant": return `/tenants/${d.entityId}`;
      case "Lease": return `/leases/${d.entityId}`;
      case "Invoice": return `/invoices/${d.entityId}`;
      default: return undefined;
    }
  };

  const openAdd = () => {
    setEditingDocument(undefined);
    setDialogOpen(true);
  };

  const openEdit = (d: Document) => {
    setEditingDocument(d);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingDocument(undefined);
  };

  const handleDownload = (d: Document) => {
    if (d.fileUrl && d.fileUrl !== "#") {
      window.open(d.fileUrl, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle={`${documents.length} document(s) uploaded`}
        action={{ label: "Upload Document", onClick: openAdd }}
      />

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search document name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="All">All Types</option>
          <option value="Owner">Owner</option>
          <option value="Building">Building</option>
          <option value="Unit">Unit</option>
          <option value="Tenant">Tenant</option>
          <option value="Lease">Lease</option>
          <option value="Invoice">Invoice</option>
          <option value="General">General</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((d) => {
          const entityLink = getEntityLink(d);
          return (
            <Card key={d.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{d.name}</p>
                    <p className="text-sm text-muted-foreground">{d.type} · {d.entityType} · {getEntityName(d)}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Uploaded {format(new Date(d.uploadDate), "dd MMM yyyy")}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" size="sm" onClick={() => handleDownload(d)} disabled={!d.fileUrl || d.fileUrl === "#"}>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                  <Button variant="outline" className="flex-1" size="sm" onClick={() => setViewingDocument(d)}>
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(d)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingDocument(d)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DeleteConfirmDialog
        open={Boolean(deletingDocument)}
        onOpenChange={(o) => !o && setDeletingDocument(undefined)}
        itemName={deletingDocument?.name}
        onConfirm={() => deletingDocument && deleteDocument(deletingDocument.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDocument ? "Edit Document" : "Upload Document"}</DialogTitle>
            <DialogDescription>Fill in the document details below.</DialogDescription>
          </DialogHeader>
          <DocumentForm initialData={editingDocument} onClose={closeDialog} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingDocument)} onOpenChange={() => setViewingDocument(undefined)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingDocument?.name}</DialogTitle>
            <DialogDescription>Document details</DialogDescription>
          </DialogHeader>
          {viewingDocument && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><p className="text-muted-foreground">Type</p><p className="font-medium">{viewingDocument.type}</p></div>
                <div><p className="text-muted-foreground">Linked To</p><p className="font-medium">{viewingDocument.entityType} · {getEntityName(viewingDocument)}</p></div>
                <div><p className="text-muted-foreground">Upload Date</p><p className="font-medium">{format(new Date(viewingDocument.uploadDate), "dd MMM yyyy")}</p></div>
                <div><p className="text-muted-foreground">File URL</p><p className="font-medium break-all">{viewingDocument.fileUrl}</p></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleDownload(viewingDocument)} disabled={!viewingDocument.fileUrl || viewingDocument.fileUrl === "#"}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
                <Button variant="outline" onClick={() => { setViewingDocument(undefined); openEdit(viewingDocument); }}>
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
