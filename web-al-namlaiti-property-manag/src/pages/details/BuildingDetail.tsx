import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import BuildingForm from "@/components/forms/BuildingForm";
import { ArrowLeft, Pencil, MapPin, Layers, Home, Users, Plus, AlertTriangle, Shield } from "lucide-react";

export default function BuildingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { buildings, units, owners, leases, getBuildingById, getOwnerById } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);

  const building = id ? getBuildingById(id) : undefined;

  if (!building) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/buildings")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Building not found.</p>
      </div>
    );
  }

  const buildingUnits = units.filter((u) => u.buildingId === building.id);
  const occupied = buildingUnits.filter((u) => u.status === "Occupied").length;
  const vacant = buildingUnits.filter((u) => u.status === "Vacant").length;
  const occupancyRate = buildingUnits.length > 0 ? Math.round((occupied / buildingUnits.length) * 100) : 0;
  const owner = getOwnerById(building.ownerId);
  const openComplaints = 0; // placeholder

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/buildings")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{building.name}</h1>
          <StatusBadge status={building.status} />
        </div>
        <p className="text-sm text-muted-foreground">{building.address}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-2xl font-bold text-foreground">{buildingUnits.length}</p>
            <p className="text-xs text-muted-foreground">Total Units</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-2xl font-bold text-emerald-600">{occupied}</p>
            <p className="text-xs text-muted-foreground">Occupied</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-2xl font-bold text-blue-600">{vacant}</p>
            <p className="text-xs text-muted-foreground">Vacant</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-2xl font-bold text-primary">{occupancyRate}%</p>
            <p className="text-xs text-muted-foreground">Occupancy</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Building Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Code</p>
                <p className="font-medium">{building.code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Floors</p>
                <p className="font-medium flex items-center gap-2"><Layers className="h-4 w-4" /> {building.floors}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Year Built</p>
                <p className="font-medium">{building.yearBuilt || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amenities</p>
                <p className="font-medium">{building.amenities || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Insurance</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Insurance Provider</p>
                <p className="font-medium">{building.insuranceProvider || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Policy Number</p>
                <p className="font-medium">{building.insurancePolicyNumber || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expiry Date</p>
                <p className="font-medium">{building.insuranceExpiryDate || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Ownership Structure</h3>
            {owner ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                  {owner.name.charAt(0)}
                </div>
                <div>
                  <Link to={`/owners/${owner.id}`} className="font-medium text-primary hover:underline">{owner.name}</Link>
                  <p className="text-xs text-muted-foreground">100% ownership</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No owner linked.</p>
            )}
            <div className="mt-6 space-y-2">
              <Button variant="secondary" className="w-full justify-start" onClick={() => navigate("/units")}>
                <Home className="mr-2 h-4 w-4" /> View All Units
              </Button>
              <Button variant="secondary" className="w-full justify-start" onClick={() => navigate("/units")}>
                <Plus className="mr-2 h-4 w-4" /> Add Unit
              </Button>
              <Button variant="secondary" className="w-full justify-start" onClick={() => navigate("/complaints")}>
                <AlertTriangle className="mr-2 h-4 w-4" /> View Complaints
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">Units ({buildingUnits.length})</h3>
            <Button size="sm" onClick={() => navigate("/units")}>
              <Plus className="mr-2 h-4 w-4" /> Add Unit
            </Button>
          </div>
          {buildingUnits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No units registered.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Unit #</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Floor</th>
                    <th className="px-4 py-3 text-left font-medium">Size (sqft)</th>
                    <th className="px-4 py-3 text-left font-medium">Rent (BHD)</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {buildingUnits.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link to={`/units/${u.id}`} className="font-medium text-primary hover:underline">{u.unitNumber}</Link>
                      </td>
                      <td className="px-4 py-3">{u.type}</td>
                      <td className="px-4 py-3">{u.floor}</td>
                      <td className="px-4 py-3">{u.size}</td>
                      <td className="px-4 py-3">{u.baseRent}</td>
                      <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Building</DialogTitle>
            <DialogDescription>Update the building details below.</DialogDescription>
          </DialogHeader>
          <BuildingForm initialData={building} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
