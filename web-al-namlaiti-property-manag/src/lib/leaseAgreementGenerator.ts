// src/lib/leaseAgreementGenerator.ts
// Automatic lease agreement PDF generator.
// Uses the approved master template (public/lease-agreement-template.png) as the
// page background and overlays only the variable fields with the lease data.
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
  | "owner"
  | "leaseholder"
  | "type_of_rented_property"
  | "location"
  | "bldg_no"
  | "road"
  | "block"
  | "lease_period_from"
  | "lease_period_to"
  | "sum_of_rent"
  | "lease_start_date"
  | "lease_end_date";

export interface LeaseAgreementValidationError {
  field: LeaseAgreementField;
  message: string;
}

const TEMPLATE_VERSION = "2.0";
const TEMPLATE_PATH = "/lease-agreement-template.png";

const OWNER_NAME = "Husain Namlaiti";
const LOCATION_NAME = "Manama";

// A4 page in points (jsPDF default unit).
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

// The template is 1132x1600 px. When scaled to fit page width it almost fills A4.
// Coordinates below are in PDF points and tuned for the new bilingual template.
const OVERLAYS = {
  owner: { x: 150, y: 171, maxWidth: 320, size: 10, lineHeight: 12 },
  leaseholder: { x: 180, y: 189, maxWidth: 300, size: 10, lineHeight: 12 },
  type_of_rented_property: { x: 290, y: 210, maxWidth: 160, size: 10, lineHeight: 12 },
  location: { x: 660 * 0.526, y: 210, maxWidth: 140, size: 10, lineHeight: 12 },
  bldg_no: { x: 160, y: 229, maxWidth: 90, size: 10, lineHeight: 12 },
  road: { x: 350, y: 229, maxWidth: 90, size: 10, lineHeight: 12 },
  block: { x: 560, y: 229, maxWidth: 90, size: 10, lineHeight: 12 },
  lease_period_from: { x: 150, y: 268, maxWidth: 140, size: 10, lineHeight: 12 },
  lease_period_to: { x: 480, y: 268, maxWidth: 140, size: 10, lineHeight: 12 },
  sum_of_rent: { x: 210, y: 287, maxWidth: 360, size: 10, lineHeight: 12 },
} as const;

// White patch under each placeholder so the new text replaces the original value.
const WHITE_PATCH_WIDTH = 170;
const WHITE_PATCH_HEIGHT = 16;

export function getLeaseAgreementTemplateVersion(): string {
  return TEMPLATE_VERSION;
}

/**
 * Convert a number to English words (up to 999,999).
 */
export function numberToWords(num: number): string {
  if (num === 0) return "zero";
  if (num < 0) return "negative " + numberToWords(-num);

  const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const teens = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  function convertChunk(n: number): string {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const rem = n % 10;
      return tens[Math.floor(n / 10)] + (rem ? " " + ones[rem] : "");
    }
    const rem = n % 100;
    return ones[Math.floor(n / 100)] + " hundred" + (rem ? " " + convertChunk(rem) : "");
  }

  const thousands = Math.floor(num / 1000);
  const remainder = num % 1000;
  let result = "";
  if (thousands > 0) {
    result += convertChunk(thousands) + " thousand";
  }
  if (remainder > 0) {
    result += (result ? " " : "") + convertChunk(remainder);
  }
  return result;
}

/**
 * Validate that all required lease agreement fields are present.
 * Returns an array of missing-field errors (empty if ready to generate).
 */
export function validateLeaseAgreementFields(ctx: LeaseAgreementContext): LeaseAgreementValidationError[] {
  const errors: LeaseAgreementValidationError[] = [];
  if (!ctx.lease.buildingNumber?.trim()) {
    errors.push({ field: "bldg_no", message: "Building number is missing" });
  }
  if (!ctx.unit?.unitNumber) {
    errors.push({ field: "type_of_rented_property", message: "Unit/flat number is missing" });
  }
  if (!ctx.lease.road?.trim()) {
    errors.push({ field: "road", message: "Road is missing" });
  }
  if (!ctx.lease.block?.trim()) {
    errors.push({ field: "block", message: "Block is missing" });
  }
  if (!ctx.tenant?.name) {
    errors.push({ field: "leaseholder", message: "Tenant/leaseholder name is missing" });
  }
  if (ctx.lease.monthlyRent == null || ctx.lease.monthlyRent <= 0) {
    errors.push({ field: "sum_of_rent", message: "Monthly rent is missing or invalid" });
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

/** Format rent as "BD. 125.000 per month / BD. one hundred twenty five per month". */
function formatAgreementRent(amount: number): string {
  const words = numberToWords(Math.floor(amount));
  return `BD. ${amount.toFixed(3)} per month / BD. ${words} per month`;
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

  // Variable values to overlay.
  const values: Record<keyof typeof OVERLAYS, string> = {
    owner: OWNER_NAME,
    leaseholder: tenant.name,
    type_of_rented_property: unit.unitNumber,
    location: LOCATION_NAME,
    bldg_no: lease.buildingNumber ?? "",
    road: lease.road ?? "",
    block: lease.block ?? "",
    lease_period_from: formatAgreementDate(lease.startDate),
    lease_period_to: formatAgreementDate(lease.endDate),
    sum_of_rent: formatAgreementRent(lease.monthlyRent),
  };

  doc.setFont("times", "normal");
  doc.setTextColor(0, 0, 0);

  for (const [key, config] of Object.entries(OVERLAYS)) {
    const text = values[key as keyof typeof OVERLAYS];
    const { x, y, maxWidth, size } = config;

    // White patch to cover the original placeholder line/area.
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
