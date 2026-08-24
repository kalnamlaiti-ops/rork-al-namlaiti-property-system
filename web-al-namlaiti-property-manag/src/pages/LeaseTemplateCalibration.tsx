import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useData } from "@/context/DataContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { LeaseTemplateField, LeaseTemplateFieldKey } from "@/types";
import {
  ALL_FIELD_KEYS,
  DEFAULT_FIELD_CONFIGS,
  FIELD_LABELS,
  generateLeaseAgreementPdf,
  getLeaseTemplateId,
  type LeaseTemplateFieldConfig,
} from "@/lib/leaseAgreementGenerator";
import { Ruler, RotateCcw, Save, Eye, Download } from "lucide-react";

const PDF_WIDTH = 595.28;
const PDF_HEIGHT = 841.89;

interface DragState {
  key: LeaseTemplateFieldKey;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function LeaseTemplateCalibration() {
  const { leaseTemplateFields, tenants, units, buildings, sendUpdate, sendAdd, sendDelete } = useData();
  const templateId = useMemo(() => getLeaseTemplateId(), []);
  const [screenWidth, setScreenWidth] = useState(700);
  const [selectedKey, setSelectedKey] = useState<LeaseTemplateFieldKey>("owner_name");
  const [drag, setDrag] = useState<DragState | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const scale = screenWidth / PDF_WIDTH;

  const storedFields = useMemo(() => {
    return leaseTemplateFields.filter((f) => f.templateId === templateId && f.isActive);
  }, [leaseTemplateFields, templateId]);

  const fieldMap = useMemo(() => {
    const map: Partial<Record<LeaseTemplateFieldKey, LeaseTemplateField>> = {};
    for (const key of ALL_FIELD_KEYS) {
      const stored = storedFields.find((f) => f.fieldKey === key);
      if (stored) {
        map[key] = stored;
      } else {
        const def = DEFAULT_FIELD_CONFIGS[key];
        map[key] = {
          id: generateId("ltf"),
          templateId,
          fieldKey: key,
          x: def.x,
          y: def.y,
          width: def.width,
          height: def.height,
          fontSize: def.fontSize,
          fontFamily: def.fontFamily,
          textAlign: def.textAlign,
          isActive: true,
        };
      }
    }
    return map as Record<LeaseTemplateFieldKey, LeaseTemplateField>;
  }, [storedFields, templateId]);

  const selectedField = fieldMap[selectedKey];

  const updateField = useCallback(
    (key: LeaseTemplateFieldKey, patch: Partial<LeaseTemplateField>) => {
      const field = fieldMap[key];
      if (!field) return;
      if (storedFields.find((f) => f.id === field.id)) {
        sendUpdate("leaseTemplateFields", field.id, patch as Record<string, unknown>);
      } else {
        sendAdd("leaseTemplateFields", { ...field, ...patch });
      }
    },
    [fieldMap, storedFields, sendUpdate, sendAdd],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, key: LeaseTemplateFieldKey) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedKey(key);
      const field = fieldMap[key];
      setDrag({
        key,
        startX: e.clientX,
        startY: e.clientY,
        initialX: field.x,
        initialY: field.y,
      });
    },
    [fieldMap],
  );

  useEffect(() => {
    if (!drag) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - drag.startX) / scale;
      const deltaY = (e.clientY - drag.startY) / scale;
      const x = Math.max(0, Math.min(PDF_WIDTH - 10, drag.initialX + deltaX));
      const y = Math.max(0, Math.min(PDF_HEIGHT - 10, drag.initialY + deltaY));
      updateField(drag.key, { x, y });
    };

    const handleMouseUp = () => {
      setDrag(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [drag, scale, updateField]);

  const resetAll = useCallback(() => {
    for (const field of storedFields) {
      sendDelete("leaseTemplateFields", field.id, field as unknown as Record<string, unknown>);
    }
    for (const key of ALL_FIELD_KEYS) {
      const def = DEFAULT_FIELD_CONFIGS[key];
      sendAdd("leaseTemplateFields", {
        id: generateId("ltf"),
        templateId,
        fieldKey: key,
        x: def.x,
        y: def.y,
        width: def.width,
        height: def.height,
        fontSize: def.fontSize,
        fontFamily: def.fontFamily,
        textAlign: def.textAlign,
        isActive: true,
      });
    }
    toast.success("Reset to default template positions");
  }, [storedFields, sendDelete, sendAdd, templateId]);

  const previewPdf = useCallback(async () => {
    const tenant = tenants.find((t) => t.name === "Sharmila Ramesh") || tenants[0];
    const unit = units.find((u) => u.unitNumber === "01") || units[0];
    if (!tenant || !unit) {
      toast.error("Add a tenant named Sharmila Ramesh and a unit 01 first to preview.");
      return;
    }
    const building = buildings.find((b) => b.id === unit.buildingId) || buildings[0];
    if (!building) {
      toast.error("No building found for the selected unit.");
      return;
    }
    const ctx = {
      lease: {
        id: "preview",
        contractNumber: "PREVIEW-001",
        tenantId: tenant.id,
        unitId: unit.id,
        startDate: "2026-07-20",
        endDate: "2027-07-20",
        monthlyRent: 120,
        securityDeposit: 0,
        status: "Active" as const,
        paymentFrequency: "Monthly" as const,
        contractDays: 365,
        buildingNumber: "1440",
        road: "2321",
        block: "323",
        location: "Manama",
        cprNumber: "91234567",
        phoneNumber: "+973 3605 1133",
      },
      tenant,
      unit,
      building,
    };
    const configs: Record<LeaseTemplateFieldKey, LeaseTemplateFieldConfig> = {} as Record<LeaseTemplateFieldKey, LeaseTemplateFieldConfig>;
    for (const key of ALL_FIELD_KEYS) {
      const f = fieldMap[key];
      configs[key] = {
        fieldKey: key,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        fontSize: f.fontSize,
        fontFamily: f.fontFamily,
        textAlign: f.textAlign,
      };
    }
    const doc = await generateLeaseAgreementPdf(ctx, configs);
    const url = doc.output("datauristring");
    const win = window.open();
    if (win) {
      win.document.write(`<iframe src="${url}" width="100%" height="100%" style="border:none"></iframe>`);
    }
  }, [tenants, units, buildings, fieldMap]);

  const downloadPreview = useCallback(async () => {
    const tenant = tenants.find((t) => t.name === "Sharmila Ramesh") || tenants[0];
    const unit = units.find((u) => u.unitNumber === "01") || units[0];
    if (!tenant || !unit) {
      toast.error("Add a tenant named Sharmila Ramesh and a unit 01 first to preview.");
      return;
    }
    const building = buildings.find((b) => b.id === unit.buildingId) || buildings[0];
    if (!building) return;
    const ctx = {
      lease: {
        id: "preview",
        contractNumber: "PREVIEW-001",
        tenantId: tenant.id,
        unitId: unit.id,
        startDate: "2026-07-20",
        endDate: "2027-07-20",
        monthlyRent: 120,
        securityDeposit: 0,
        status: "Active" as const,
        paymentFrequency: "Monthly" as const,
        contractDays: 365,
        buildingNumber: "1440",
        road: "2321",
        block: "323",
        location: "Manama",
        cprNumber: "91234567",
        phoneNumber: "+973 3605 1133",
      },
      tenant,
      unit,
      building,
    };
    const configs: Record<LeaseTemplateFieldKey, LeaseTemplateFieldConfig> = {} as Record<LeaseTemplateFieldKey, LeaseTemplateFieldConfig>;
    for (const key of ALL_FIELD_KEYS) {
      const f = fieldMap[key];
      configs[key] = {
        fieldKey: key,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        fontSize: f.fontSize,
        fontFamily: f.fontFamily,
        textAlign: f.textAlign,
      };
    }
    const doc = await generateLeaseAgreementPdf(ctx, configs);
    doc.save("Lease-Agreement-Preview.pdf");
  }, [tenants, units, buildings, fieldMap]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lease Template Calibration"
        subtitle="Position each editable English field exactly over the master template. Coordinates are saved and reused for every lease agreement."
      />

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <Card>
            <CardContent className="p-4">
              <div className="mb-4 flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                <span className="text-sm font-medium">Template image at 1× scale = {PDF_WIDTH.toFixed(2)} pt wide</span>
              </div>
              <div
                ref={imageContainerRef}
                className="relative inline-block cursor-crosshair select-none border bg-white"
                style={{ width: screenWidth }}
              >
                <img
                  src="/lease-agreement-template.png"
                  alt="Lease agreement template"
                  className="block w-full"
                  draggable={false}
                />
                {ALL_FIELD_KEYS.map((key) => {
                  const f = fieldMap[key];
                  const isSelected = selectedKey === key;
                  return (
                    <div
                      key={key}
                      onMouseDown={(e) => handleMouseDown(e, key)}
                      className={`absolute cursor-move overflow-hidden border-2 px-1 py-0.5 text-xs font-medium ${
                        isSelected
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-blue-500 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20"
                      }`}
                      style={{
                        left: f.x * scale,
                        top: f.y * scale - f.fontSize * scale,
                        width: f.width * scale,
                        height: f.height * scale,
                        fontSize: f.fontSize * scale,
                      }}
                    >
                      {FIELD_LABELS[key]}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full lg:w-80">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-2">
                <Label>Selected Field</Label>
                <Select value={selectedKey} onValueChange={(v) => setSelectedKey(v as LeaseTemplateFieldKey)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_FIELD_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {FIELD_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="x">X (pt)</Label>
                  <Input
                    id="x"
                    type="number"
                    step={0.5}
                    value={selectedField.x}
                    onChange={(e) => updateField(selectedKey, { x: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="y">Y (pt)</Label>
                  <Input
                    id="y"
                    type="number"
                    step={0.5}
                    value={selectedField.y}
                    onChange={(e) => updateField(selectedKey, { y: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="width">Width (pt)</Label>
                  <Input
                    id="width"
                    type="number"
                    step={0.5}
                    value={selectedField.width}
                    onChange={(e) => updateField(selectedKey, { width: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="height">Height (pt)</Label>
                  <Input
                    id="height"
                    type="number"
                    step={0.5}
                    value={selectedField.height}
                    onChange={(e) => updateField(selectedKey, { height: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="fontSize">Font Size (pt)</Label>
                  <Input
                    id="fontSize"
                    type="number"
                    step={0.5}
                    value={selectedField.fontSize}
                    onChange={(e) => updateField(selectedKey, { fontSize: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fontFamily">Font Family</Label>
                  <Input
                    id="fontFamily"
                    value={selectedField.fontFamily}
                    onChange={(e) => updateField(selectedKey, { fontFamily: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Text Align</Label>
                <Select
                  value={selectedField.textAlign}
                  onValueChange={(v) =>
                    updateField(selectedKey, { textAlign: v as "left" | "center" | "right" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-2">
                <Button variant="outline" className="w-full" onClick={previewPdf}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Test PDF
                </Button>
                <Button variant="outline" className="w-full" onClick={downloadPreview}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Test PDF
                </Button>
                <Button variant="secondary" className="w-full" onClick={resetAll}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Defaults
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Drag a box on the template to move it. Edit numbers here for precision. Changes are saved automatically to the shared workspace.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
