import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import DistributionForm from "@/components/forms/DistributionForm";
import { ArrowLeft, Pencil, User, Building2, Calendar, Banknote } from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 0 }).format(amount);
}

export default function DistributionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { distributions, owners, buildings, getDistributionById, getOwnerById, getBuildingById } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);

  const distribution = id ? getDistributionById(id) : undefined;
  const owner = distribution ? getOwnerById(distribution.ownerId) : undefined;
  const building = distribution?.buildingId ? getBuildingById(distribution.buildingId) : undefined;

  if (!distribution) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/distributions")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Distribution not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/distributions")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">Distribution Statement</h1>
        <StatusBadge status={distribution.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Distribution Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Owner</p>
                <p className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <Link to={`/owners/${owner?.id}`} className="text-primary hover:underline">{owner?.name}</Link>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Building</p>
                <p className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <Link to={`/buildings/${building?.id}`} className="text-primary hover:underline">{building?.name || "All"}</Link>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Period</p>
                <p className="font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> {distribution.period}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Distribution Date</p>
                <p className="font-medium">{distribution.distributionDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Banknote className="mx-auto mb-2 h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">Owner Share</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(distribution.amount)}</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Distribution</DialogTitle>
            <DialogDescription>Update the distribution details below.</DialogDescription>
          </DialogHeader>
          <DistributionForm initialData={distribution} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
