// src/lib/leaseAgreementGenerator.ts
// Automatic lease agreement PDF generator.
// Uses the approved master template (public/lease-agreement-template.png) as the
// page background and overlays only the six variable fields with the lease data.
// The King of Bahrain image, legal text, signatures, and all other template
// content remain exactly as in the master template.

import { jsPDF } from "jspdf";
import type { Building, Lease, Tenant, Unit } from "@/types";

export interface LeaseAgreementContext {
  lease: Lease;
  tenant: Tenant;
  unit: Unit;
  building: Building;
  generatedBy?: string;
}

export type LeaseAgreementField =
  | "building"
  | "flat"
  | "leaseholder"
  | "total_rent"
  | "lease_start_date"
  | "lease_end_date";

export interface LeaseAgreementValidationError {
  field: LeaseAgreementField;
  message: string;
}

const TEMPLATE_VERSION = "1.0";
const TEMPLATE_PATH = "/lease-agreement-template.png";

// A4 page in points (jsPDF default unit).
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

// The template image is scaled to fit the page width while preserving its aspect ratio.
// We then place text at these (x, y) coordinates on the page in points.
// The coordinates are tuned to overlay the original placeholders in the rotated template.
const OVERLAYS = {
  building: { x: 360, y: 182, maxWidth: 170, size: 10, lineHeight: 12 },
  flat: { x: 360, y: 216, maxWidth: 170, size: 10, lineHeight: 12 },
  leaseholder: { x: 360, y: 250, maxWidth: 170, size: 10, lineHeight: 12 },
  total_rent: { x: 360, y: 284, maxWidth: 170, size: 10, lineHeight: 12 },
  lease_start_date: { x: 360, y: 318, maxWidth: 170, size: 10, lineHeight: 12 },
  lease_end_date: { x: 360, y: 352, maxWidth: 170, size: 10, lineHeight: 12 },
} as const;

// White patch under each placeholder so the new text replaces the original value.
const WHITE_PATCH_WIDTH = 180;
const WHITE_PATCH_HEIGHT = 16;

export function getLeaseAgreementTemplateVersion(): string {
  return TEMPLATE_VERSION;
}

/**
 * Validate that all required lease agreement fields are present.
 * Returns an array of missing-field errors (empty if ready to generate).
 */
export function validateLeaseAgreementFields(ctx: LeaseAgreementContext): LeaseAgreementValidationError[] {
  const errors: LeaseAgreementValidationError[] = [];
  if (!ctx.building?.name) {
    errors.push({ field: "building", message: "Building name is missing" });
  }
  if (!ctx.unit?.unitNumber) {
    errors.push({ field: "flat", message: "Unit/flat number is missing" });
  }
  if (!ctx.tenant?.name) {
    errors.push({ field: "leaseholder", message: "Tenant/leaseholder name is missing" });
  }
  if (ctx.lease.monthlyRent == null || ctx.lease.monthlyRent <= 0) {
    errors.push({ field: "total_rent", message: "Monthly rent is missing or invalid" });
  }
  if (!ctx.lease.startDate) {
    errors.push({ field: "lease_start_date", message: "Lease start date is missing" });
  }
  if (!ctx.lease.endDate) {
    errors.push({ field: "lease_end_date", message: "Lease end date is missing" });
  }
  return errors;
}

/** Format a date as "MMMM dd, yyyy" (e.g. "April 01, 2020") to match the template. */
function formatAgreementDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Format rent as "BD. 125.000 Per month" to match the template. */
function formatAgreementRent(amount: number): string {
  return `BD. ${amount.toFixed(3)} Per month`;
}

/** Load the master template image as a base64 data URL. */
async function loadTemplateImage(): Promise<string> {
  const res = await fetch(TEMPLATE_PATH);
  if (!res.ok) {
    throw new Error(`Failed to load lease agreement template: ${res.status}`);
  }
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate a lease agreement PDF from the master template and lease data.
 * Throws LeaseAgreementValidationError[] if required fields are missing.
 */
export async function generateLeaseAgreementPdf(ctx: LeaseAgreementContext): Promise<jsPDF> {
  const errors = validateLeaseAgreementFields(ctx);
  if (errors.length > 0) throw errors;

  const { lease, tenant, unit, building } = ctx;

  const templateBase64 = await loadTemplateImage();

  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    orientation: "portrait",
  });

  // Fit the template image to the page width, centered vertically.
  const imgWidth = PAGE_WIDTH;
  const imgProps = doc.getImageProperties(templateBase64);
  const imgHeight = (imgWidth * imgProps.height) / imgProps.width;
  const imgY = Math.max(0, (PAGE_HEIGHT - imgHeight) / 2);

  doc.addImage(templateBase64, "PNG", 0, imgY, imgWidth, imgHeight);

  // Variable values to overlay.
  const values: Record<LeaseAgreementField, string> = {
    building: building.name,
    flat: unit.unitNumber,
    leaseholder: tenant.name,
    total_rent: formatAgreementRent(lease.monthlyRent),
    lease_start_date: formatAgreementDate(lease.startDate),
    lease_end_date: formatAgreementDate(lease.endDate),
  };

  doc.setFont("times", "normal");
  doc.setTextColor(0, 0, 0);

  for (const [key, config] of Object.entries(OVERLAYS)) {
    const text = values[key as LeaseAgreementField];
    const { x, y, maxWidth, size } = config;

    // White patch to cover the original placeholder value.
    doc.setFillColor(255, 255, 255);
    doc.rect(x - 2, y - size + 1, WHITE_PATCH_WIDTH, WHITE_PATCH_HEIGHT, "F");

    // Overlay the new value.
    doc.setFontSize(size);
    doc.text(text, x, y, { maxWidth });
  }

  return doc;
}

/** Download the generated lease agreement PDF. */
export async function downloadLeaseAgreement(ctx: LeaseAgreementContext): Promise<void> {
  const doc = await generateLeaseAgreementPdf(ctx);
  const filename = `${ctx.lease.contractNumber}-Lease-Agreement.pdf`;
  doc.save(filename);
}

/** Return the generated lease agreement PDF as a base64 data URL. */
export async function getLeaseAgreementDataUrl(ctx: LeaseAgreementContext): Promise<string> {
  const doc = await generateLeaseAgreementPdf(ctx);
  return doc.output("datauristring");
}

export { TEMPLATE_VERSION };
