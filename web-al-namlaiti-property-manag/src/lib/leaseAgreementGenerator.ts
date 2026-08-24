// src/lib/leaseAgreementGenerator.ts
// Fixed-position lease agreement PDF generator.
// The master template (public/lease-agreement-template.png) is the locked background.
// Every English variable field is rendered at its own calibrated X/Y coordinate
// stored in the shared workspace. Field positions are calibrated once on the
// "Lease Template Calibration" page and reused for every future lease agreement.
// Arabic content, legal conditions, signatures, witness labels, and the King of
// Bahrain image remain untouched.

import { jsPDF } from "jspdf";
import type { Building, Lease, LeaseTemplateField, LeaseTemplateFieldKey, Tenant, Unit } from "@/types";

export interface LeaseAgreementContext {
  lease: Lease;
  tenant: Tenant;
  unit: Unit;
  building: Building;
  generatedBy?: string;
}

export interface LeaseTemplateFieldConfig {
  fieldKey: LeaseTemplateFieldKey;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  textAlign: "left" | "center" | "right";
}

export interface LeaseAgreementValidationError {
  field: LeaseTemplateFieldKey;
  message: string;
}

const TEMPLATE_VERSION = "3.0";
const TEMPLATE_ID = "default-template";
const TEMPLATE_PATH = "/lease-agreement-template.png";

const OWNER_NAME = "Husain Namlaiti";

// A4 page in points (jsPDF default unit).
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

// Default calibrated positions for the 1132x1600 px template.
// Coordinates are in PDF points (A4 width = 595.28 pt). Converted from pixel
// positions using scale 595.28/1132 ≈ 0.526 pt/px. These defaults are used until
// an admin overrides them on the Lease Template Calibration page.
export const DEFAULT_FIELD_CONFIGS: Record<LeaseTemplateFieldKey, Omit<LeaseTemplateFieldConfig, "fieldKey">> = {
  owner_name: { x: 68, y: 176, width: 380, height: 16, fontSize: 10, fontFamily: "times", textAlign: "left" },
  tenant_name: { x: 97, y: 195, width: 360, height: 16, fontSize: 10, fontFamily: "times", textAlign: "left" },
  flat_number: { x: 155, y: 213, width: 120, height: 16, fontSize: 10, fontFamily: "times", textAlign: "left" },
  location: { x: 329, y: 213, width: 120, height: 16, fontSize: 10, fontFamily: "times", textAlign: "left" },
  building_number: { x: 92, y: 231, width: 75, height: 16, fontSize: 10, fontFamily: "times", textAlign: "left" },
  road_number: { x: 192, y: 231, width: 85, height: 16, fontSize: 10, fontFamily: "times", textAlign: "left" },
  block_number: { x: 303, y: 231, width: 85, height: 16, fontSize: 10, fontFamily: "times", textAlign: "left" },
  lease_period: { x: 103, y: 250, width: 300, height: 16, fontSize: 10, fontFamily: "times", textAlign: "left" },
  start_date: { x: 71, y: 268, width: 140, height: 16, fontSize: 10, fontFamily: "times", textAlign: "left" },
  end_date: { x: 229, y: 268, width: 140, height: 16, fontSize: 10, fontFamily: "times", textAlign: "left" },
  rent_amount: { x: 108, y: 287, width: 380, height: 16, fontSize: 9, fontFamily: "times", textAlign: "left" },
  cpr_number: { x: 68, y: 305, width: 260, height: 16, fontSize: 10, fontFamily: "times", textAlign: "left" },
  phone_number: { x: 340, y: 305, width: 230, height: 16, fontSize: 10, fontFamily: "times", textAlign: "left" },
};

export const ALL_FIELD_KEYS: LeaseTemplateFieldKey[] = [
  "owner_name",
  "tenant_name",
  "flat_number",
  "building_number",
  "road_number",
  "block_number",
  "location",
  "lease_period",
  "start_date",
  "end_date",
  "rent_amount",
  "cpr_number",
  "phone_number",
];

export const FIELD_LABELS: Record<LeaseTemplateFieldKey, string> = {
  owner_name: "Owner",
  tenant_name: "Leaseholder",
  flat_number: "Type of rented Property",
  building_number: "Bldg No.",
  road_number: "Road",
  block_number: "Block",
  location: "Location",
  lease_period: "Lease Period",
  start_date: "From",
  end_date: "To",
  rent_amount: "Sum of Rent",
  cpr_number: "CPR No.",
  phone_number: "Phone No.",
};

/** Build a config lookup from stored LeaseTemplateField records. */
export function buildFieldConfigMap(fields: LeaseTemplateField[]): Record<LeaseTemplateFieldKey, LeaseTemplateFieldConfig> {
  const map: Partial<Record<LeaseTemplateFieldKey, LeaseTemplateFieldConfig>> = {};
  for (const key of ALL_FIELD_KEYS) {
    const stored = fields.find((f) => f.templateId === TEMPLATE_ID && f.fieldKey === key && f.isActive);
    if (stored) {
      map[key] = {
        fieldKey: key,
        x: stored.x,
        y: stored.y,
        width: stored.width,
        height: stored.height,
        fontSize: stored.fontSize,
        fontFamily: stored.fontFamily,
        textAlign: stored.textAlign,
      };
    } else {
      map[key] = { fieldKey: key, ...DEFAULT_FIELD_CONFIGS[key] };
    }
  }
  return map as Record<LeaseTemplateFieldKey, LeaseTemplateFieldConfig>;
}

export function getLeaseAgreementTemplateVersion(): string {
  return TEMPLATE_VERSION;
}

export function getLeaseTemplateId(): string {
  return TEMPLATE_ID;
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
 * Format a date as "dd MMMM yyyy" (e.g. "20 July 2026").
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
 * Calculate the lease period between two dates.
 * Examples: "1 Month", "2 Months", "1 Year", "1 Year 2 Months".
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

  const yearText = years === 0 ? "" : years === 1 ? "1 Year" : `${years} Years`;
  const monthText = remainingMonths === 0 ? "" : remainingMonths === 1 ? "1 Month" : `${remainingMonths} Months`;

  if (yearText && monthText) return `${yearText} ${monthText}`;
  return yearText || monthText || "1 Year";
}

/**
 * Validate that all required lease agreement fields are present.
 */
export function validateLeaseAgreementFields(ctx: LeaseAgreementContext): LeaseAgreementValidationError[] {
  const errors: LeaseAgreementValidationError[] = [];
  if (!ctx.tenant?.name) {
    errors.push({ field: "tenant_name", message: "Tenant/leaseholder name is missing" });
  }
  if (!ctx.unit?.unitNumber) {
    errors.push({ field: "flat_number", message: "Flat/unit number is missing" });
  }
  if (!ctx.lease.buildingNumber?.trim()) {
    errors.push({ field: "building_number", message: "Building number is missing" });
  }
  if (!ctx.lease.road?.trim()) {
    errors.push({ field: "road_number", message: "Road number is missing" });
  }
  if (!ctx.lease.block?.trim()) {
    errors.push({ field: "block_number", message: "Block number is missing" });
  }
  if (!ctx.lease.location?.trim()) {
    errors.push({ field: "location", message: "Location is missing" });
  }
  if (ctx.lease.monthlyRent == null || ctx.lease.monthlyRent <= 0) {
    errors.push({ field: "rent_amount", message: "Monthly rent is missing or invalid" });
  }
  if (!ctx.lease.startDate) {
    errors.push({ field: "start_date", message: "Lease start date is missing" });
  }
  if (!ctx.lease.endDate) {
    errors.push({ field: "end_date", message: "Lease end date is missing" });
  }
  if (!ctx.lease.cprNumber?.trim()) {
    errors.push({ field: "cpr_number", message: "CPR number is missing" });
  }
  if (!ctx.lease.phoneNumber?.trim()) {
    errors.push({ field: "phone_number", message: "Phone number is missing" });
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
export async function generateLeaseAgreementPdf(
  ctx: LeaseAgreementContext,
  fieldConfigs: Record<LeaseTemplateFieldKey, LeaseTemplateFieldConfig> = buildFieldConfigMap([]),
): Promise<jsPDF> {
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

  const values: Record<LeaseTemplateFieldKey, string> = {
    owner_name: OWNER_NAME,
    tenant_name: tenant.name,
    flat_number: unit.unitNumber,
    building_number: lease.buildingNumber ?? "",
    road_number: lease.road ?? "",
    block_number: lease.block ?? "",
    location: lease.location ?? "",
    lease_period: formatLeasePeriod(lease.startDate, lease.endDate),
    start_date: formatAgreementDate(lease.startDate),
    end_date: formatAgreementDate(lease.endDate),
    rent_amount: formatAgreementRent(lease.monthlyRent),
    // CPR and phone are rendered with fixed prefixes on the agreement.
    cpr_number: lease.cprNumber ? `CPR: ${lease.cprNumber}` : "",
    phone_number: lease.phoneNumber ? `Ph#: ${lease.phoneNumber}` : "",
  };

  for (const key of ALL_FIELD_KEYS) {
    const config = fieldConfigs[key];
    if (!config) continue;

    const { x, y, width, height, fontSize, fontFamily, textAlign } = config;
    const text = values[key];

    // Set font family if available; fallback to times.
    try {
      doc.setFont(fontFamily || "times", "normal");
    } catch {
      doc.setFont("times", "normal");
    }
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(fontSize);

    // White patch to erase the original placeholder before drawing the new value.
    doc.setFillColor(255, 255, 255);
    doc.rect(x - 1, y - fontSize + 1, width + 2, height, "F");

    // Draw the value at the fixed coordinate.
    const align = textAlign || "left";
    let drawX = x;
    if (align === "center") {
      const textWidth = doc.getTextWidth(text);
      drawX = x + (width - textWidth) / 2;
    } else if (align === "right") {
      const textWidth = doc.getTextWidth(text);
      drawX = x + width - textWidth;
    }
    doc.text(text, drawX, y, { maxWidth: width });
  }

  return doc;
}

/** Download the generated lease agreement PDF. */
export async function downloadLeaseAgreement(
  ctx: LeaseAgreementContext,
  fieldConfigs?: Record<LeaseTemplateFieldKey, LeaseTemplateFieldConfig>,
): Promise<void> {
  const doc = await generateLeaseAgreementPdf(ctx, fieldConfigs);
  const filename = `${ctx.lease.contractNumber}-Lease-Agreement.pdf`;
  doc.save(filename);
}

/** Return the generated lease agreement PDF as a base64 data URL. */
export async function getLeaseAgreementDataUrl(
  ctx: LeaseAgreementContext,
  fieldConfigs?: Record<LeaseTemplateFieldKey, LeaseTemplateFieldConfig>,
): Promise<string> {
  const doc = await generateLeaseAgreementPdf(ctx, fieldConfigs);
  return doc.output("datauristring");
}

export { TEMPLATE_VERSION, TEMPLATE_ID };
