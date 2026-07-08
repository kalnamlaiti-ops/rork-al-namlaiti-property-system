import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import OwnerForm from "@/components/forms/OwnerForm";
import { ArrowLeft, Pencil, Phone, Landmark, Mail, Building2 } from "lucide-react";
import type { Owner } from "@/types";

export default function OwnerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { owners, buildings, getOwnerById, updateOwner } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);

  const owner = id ? getOwnerById(id) : undefined;

  if (!owner) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Owner not found.</p>
      </div>
    );
  }

  const ownerBuildings = buildings.filter((b) => b.ownerId === owner.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/owners")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{owner.name}</h1>
        <StatusBadge status={owner.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Owner Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="flex items-center gap-2 font-medium"><Mail className="h-4 w-4" /> {owner.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="flex items-center gap-2 font-medium"><Phone className="h-4 w-4" /> {owner.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tax ID</p>
                <p className="font-medium">{owner.taxId || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{owner.notes || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Banking</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Bank</p>
                <p className="flex items-center gap-2 font-medium"><Landmark className="h-4 w-4" /> {owner.bankName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Account / IBAN</p>
                <p className="font-medium">{owner.bankAccount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-base font-semibold">Buildings</h3>
          {ownerBuildings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No buildings linked.</p>
          ) : (
            <div className="space-y-3">
              {ownerBuildings.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                      {b.name.charAt(0)}
                    </div>
                    <div>
                      <Link to={`/buildings/${b.id}`} className="font-medium text-primary hover:underline">
                        {b.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{b.code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">100%</p>
                    <p className="text-xs text-muted-foreground">Managing Owner</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Owner</DialogTitle>
            <DialogDescription>Update the owner details below.</DialogDescription>
          </DialogHeader>
          <OwnerForm initialData={owner} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
