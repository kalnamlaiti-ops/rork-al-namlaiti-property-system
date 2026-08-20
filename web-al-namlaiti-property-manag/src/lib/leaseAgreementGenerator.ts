// src/lib/leaseAgreementGenerator.ts
// Automatic lease agreement PDF generator.
// Uses the approved master template (public/lease-agreement-template.png) as the
// page background and overlays only the English variable fields with the lease data.
// All Arabic content, agreement conditions, signatures, and the King of Bahrain image
// remain exactly as in the master template.

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
  | "owner"
  | "leaseholder"
  | "type_of_rented_property"
  | "location"
  | "bldg_no"
  | "road"
  | "block"
  | "lease_period"
  | "lease_period_from"
  | "lease_period_to"
  | "sum_of_rent";

export interface LeaseAgreementValidationError {
  field: LeaseAgreementField;
  message: string;
}

const TEMPLATE_VERSION = "2.1";
const TEMPLATE_PATH = "/lease-agreement-template.png";

const OWNER_NAME = "Husain Namlaiti";

// A4 page in points (jsPDF default unit).
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

// The template is 1132x1600 px. When scaled to fit page width it fills A4 exactly,
// so pixel coordinates are converted to PDF points by multiplying by 595.28/1132.
// All coordinates below are fixed and tuned for the English labels in the master template.
const OVERLAYS = {
  owner: { x: 68, y: 176, maxWidth: 380, size: 10, lineHeight: 12, patchWidth: 390 },
  leaseholder: { x: 97, y: 195, maxWidth: 360, size: 10, lineHeight: 12, patchWidth: 370 },
  type_of_rented_property: { x: 155, y: 213, maxWidth: 120, size: 10, lineHeight: 12, patchWidth: 125 },
  location: { x: 329, y: 213, maxWidth: 120, size: 10, lineHeight: 12, patchWidth: 125 },
  bldg_no: { x: 92, y: 231, maxWidth: 75, size: 10, lineHeight: 12, patchWidth: 80 },
  road: { x: 192, y: 231, maxWidth: 85, size: 10, lineHeight: 12, patchWidth: 90 },
  block: { x: 303, y: 231, maxWidth: 85, size: 10, lineHeight: 12, patchWidth: 90 },
  lease_period: { x: 103, y: 250, maxWidth: 300, size: 10, lineHeight: 12, patchWidth: 310 },
  lease_period_from: { x: 71, y: 268, maxWidth: 140, size: 10, lineHeight: 12, patchWidth: 145 },
  lease_period_to: { x: 229, y: 268, maxWidth: 140, size: 10, lineHeight: 12, patchWidth: 145 },
  sum_of_rent: { x: 108, y: 287, maxWidth: 380, size: 9, lineHeight: 12, patchWidth: 390 },
} as const;

// White patch under each placeholder so the new text replaces the original value.
const WHITE_PATCH_HEIGHT = 16;

export function getLeaseAgreementTemplateVersion(): string {
  return TEMPLATE_VERSION;
}

/**
 * Format a date as "dd MMMM yyyy" (e.g. "20 July 2026") to match the template.
 */
function formatAgreementDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format monthly rent as "BD 120.000 per month".
 */
function formatAgreementRent(amount: number): string {
  return `BD ${amount.toFixed(3)} per month`;
}

/**
 * Calculate the lease period in months/years between two dates.
 * Examples: "1 month", "2 months", "1 year", "1 year 2 months".
 */
function formatLeasePeriod(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);

  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const dayDiff = end.getDate() - start.getDate();
  if (dayDiff < 0) {
    months -= 1;
  }

  if (months < 0) months = 0;

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  const yearText = years === 0 ? "" : years === 1 ? "1 year" : `${years} years`;
  const monthText = remainingMonths === 0 ? "" : remainingMonths === 1 ? "1 month" : `${remainingMonths} months`;

  if (yearText && monthText) return `${yearText} ${monthText}`;
  return yearText || monthText || "1 month";
}

/**
 * Validate that all required lease agreement fields are present.
 * Returns an array of missing-field errors (empty if ready to generate).
 */
export function validateLeaseAgreementFields(ctx: LeaseAgreementContext): LeaseAgreementValidationError[] {
  const errors: LeaseAgreementValidationError[] = [];
  if (!ctx.tenant?.name) {
    errors.push({ field: "leaseholder", message: "Tenant/leaseholder name is missing" });
  }
  if (!ctx.unit?.unitNumber) {
    errors.push({ field: "type_of_rented_property", message: "Unit/flat number is missing" });
  }
  if (!ctx.lease.buildingNumber?.trim()) {
    errors.push({ field: "bldg_no", message: "Building number is missing" });
  }
  if (!ctx.lease.road?.trim()) {
    errors.push({ field: "road", message: "Road number is missing" });
  }
  if (!ctx.lease.block?.trim()) {
    errors.push({ field: "block", message: "Block number is missing" });
  }
  if (!ctx.lease.location?.trim()) {
    errors.push({ field: "location", message: "Location is missing" });
  }
  if (ctx.lease.monthlyRent == null || ctx.lease.monthlyRent <= 0) {
    errors.push({ field: "sum_of_rent", message: "Monthly rent is missing or invalid" });
  }
  if (!ctx.lease.startDate) {
    errors.push({ field: "lease_period_from", message: "Lease start date is missing" });
  }
  if (!ctx.lease.endDate) {
    errors.push({ field: "lease_period_to", message: "Lease end date is missing" });
  }
  return errors;
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

  const { lease, tenant, unit } = ctx;

  const templateBase64 = await loadTemplateImage();

  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    orientation: "portrait",
  });

  // Fit the template image to the page width. The template is almost exactly A4 aspect ratio.
  const imgWidth = PAGE_WIDTH;
  const imgProps = doc.getImageProperties(templateBase64);
  const imgHeight = (imgWidth * imgProps.height) / imgProps.width;
  const imgY = Math.max(0, (PAGE_HEIGHT - imgHeight) / 2);

  doc.addImage(templateBase64, "PNG", 0, imgY, imgWidth, imgHeight);

  // Fixed variable values to overlay in the English section only.
  const values: Record<keyof typeof OVERLAYS, string> = {
    owner: OWNER_NAME,
    leaseholder: tenant.name,
    type_of_rented_property: unit.unitNumber,
    location: lease.location ?? "",
    bldg_no: lease.buildingNumber ?? "",
    road: lease.road ?? "",
    block: lease.block ?? "",
    lease_period: formatLeasePeriod(lease.startDate, lease.endDate),
    lease_period_from: formatAgreementDate(lease.startDate),
    lease_period_to: formatAgreementDate(lease.endDate),
    sum_of_rent: formatAgreementRent(lease.monthlyRent),
  };

  doc.setFont("times", "normal");
  doc.setTextColor(0, 0, 0);

  for (const [key, config] of Object.entries(OVERLAYS)) {
    const text = values[key as keyof typeof OVERLAYS];
    const { x, y, maxWidth, size, patchWidth } = config;

    // White patch to cover the original placeholder line/area.
    doc.setFillColor(255, 255, 255);
    doc.rect(x - 2, y - size + 1, patchWidth, WHITE_PATCH_HEIGHT, "F");

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
