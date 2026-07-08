import type {
  Owner,
  Building,
  Unit,
  Tenant,
  Lease,
  Invoice,
  Payment,
  Expense,
  ChartOfAccount,
  JournalEntry,
  Distribution,
  EWABill,
  Complaint,
  MaintenanceRequest,
  Vendor,
  Asset,
  Document,
} from "@/types";

export const owners: Owner[] = [
  {
    id: "own-1",
    name: "Ahmed Al Rashid",
    email: "owner@propvault.com",
    phone: "+97333112233",
    status: "Active",
    bankName: "National Bank of Bahrain",
    bankAccount: "BH00NBOK00001234567891",
    taxId: "",
    buildingCount: 2,
    notes: "Primary owner for Al Noor and Seef Business Tower.",
  },
  {
    id: "own-2",
    name: "Khalid Al Mansoori",
    email: "owner2@propvault.com",
    phone: "+97333998877",
    status: "Active",
    bankName: "Bahrain Islamic Bank",
    bankAccount: "BH00BIBB00009876543210",
    taxId: "",
    buildingCount: 1,
    notes: "Owner of Riffa Gardens Complex.",
  },
];

export const buildings: Building[] = [
  {
    id: "bld-1",
    code: "BLD-001",
    name: "Al Noor Residences",
    address: "Building 234, Road 1702, Block 317, Juffair",
    status: "Active",
    ownerId: "own-1",
    floors: 12,
    units: 10,
    yearBuilt: 2019,
    description: "Premium residential tower in Juffair with studios and apartments.",
  },
  {
    id: "bld-2",
    code: "BLD-002",
    name: "Seef Business Tower",
    address: "Tower B, Gate 7, Seef District, Road 2811",
    status: "Active",
    ownerId: "own-1",
    floors: 18,
    units: 10,
    yearBuilt: 2017,
    description: "Commercial and residential mixed-use tower in Seef.",
  },
  {
    id: "bld-3",
    code: "BLD-003",
    name: "Riffa Gardens Complex",
    address: "Block 903, Road 3012, Riffa",
    status: "Active",
    ownerId: "own-2",
    floors: 6,
    units: 8,
    yearBuilt: 2021,
    description: "Modern residential complex in Riffa.",
  },
];

export const units: Unit[] = [
  { id: "u-101", buildingId: "bld-1", unitNumber: "101", floor: 1, type: "Studio", size: 55, bedrooms: 0, bathrooms: 1, furnished: "Unfurnished", status: "Occupied", baseRent: 185, securityDeposit: 370, serviceChargeType: "Flat Amount", serviceCharge: 20, notes: "" },
  { id: "u-102", buildingId: "bld-1", unitNumber: "102", floor: 1, type: "1BR", size: 75, bedrooms: 1, bathrooms: 1, furnished: "Furnished", status: "Occupied", baseRent: 280, securityDeposit: 560, serviceChargeType: "Flat Amount", serviceCharge: 25, notes: "" },
  { id: "u-201", buildingId: "bld-1", unitNumber: "201", floor: 2, type: "1BR", size: 80, bedrooms: 1, bathrooms: 1, furnished: "Furnished", status: "Occupied", baseRent: 295, securityDeposit: 590, serviceChargeType: "Flat Amount", serviceCharge: 25, notes: "" },
  { id: "u-202", buildingId: "bld-1", unitNumber: "202", floor: 2, type: "2BR", size: 110, bedrooms: 2, bathrooms: 2, furnished: "Unfurnished", status: "Occupied", baseRent: 420, securityDeposit: 840, serviceChargeType: "Flat Amount", serviceCharge: 35, notes: "" },
  { id: "u-301", buildingId: "bld-1", unitNumber: "301", floor: 3, type: "2BR", size: 115, bedrooms: 2, bathrooms: 2, furnished: "Semi-Furnished", status: "Occupied", baseRent: 440, securityDeposit: 880, serviceChargeType: "Flat Amount", serviceCharge: 35, notes: "" },
  { id: "u-302", buildingId: "bld-1", unitNumber: "302", floor: 3, type: "3BR", size: 155, bedrooms: 3, bathrooms: 2, furnished: "Furnished", status: "Occupied", baseRent: 620, securityDeposit: 1240, serviceChargeType: "Flat Amount", serviceCharge: 45, notes: "" },
  { id: "u-401", buildingId: "bld-1", unitNumber: "401", floor: 4, type: "2BR", size: 112, bedrooms: 2, bathrooms: 2, furnished: "Unfurnished", status: "Occupied", baseRent: 430, securityDeposit: 860, serviceChargeType: "Flat Amount", serviceCharge: 35, notes: "" },
  { id: "u-402", buildingId: "bld-1", unitNumber: "402", floor: 4, type: "3BR", size: 160, bedrooms: 3, bathrooms: 3, furnished: "Furnished", status: "Occupied", baseRent: 650, securityDeposit: 1300, serviceChargeType: "Flat Amount", serviceCharge: 45, notes: "" },
  { id: "u-501", buildingId: "bld-1", unitNumber: "501", floor: 5, type: "Studio", size: 58, bedrooms: 0, bathrooms: 1, furnished: "Unfurnished", status: "Vacant", baseRent: 190, securityDeposit: 380, serviceChargeType: "Flat Amount", serviceCharge: 20, notes: "" },
  { id: "u-502", buildingId: "bld-1", unitNumber: "502", floor: 5, type: "1BR", size: 82, bedrooms: 1, bathrooms: 1, furnished: "Semi-Furnished", status: "Vacant", baseRent: 300, securityDeposit: 600, serviceChargeType: "Flat Amount", serviceCharge: 25, notes: "" },

  { id: "u-s101", buildingId: "bld-2", unitNumber: "S101", floor: 1, type: "Commercial", size: 90, bedrooms: 0, bathrooms: 1, furnished: "Unfurnished", status: "Occupied", baseRent: 450, securityDeposit: 900, serviceChargeType: "Flat Amount", serviceCharge: 50, notes: "" },
  { id: "u-s201", buildingId: "bld-2", unitNumber: "S201", floor: 2, type: "1BR", size: 70, bedrooms: 1, bathrooms: 1, furnished: "Furnished", status: "Occupied", baseRent: 340, securityDeposit: 680, serviceChargeType: "Flat Amount", serviceCharge: 30, notes: "" },
  { id: "u-s202", buildingId: "bld-2", unitNumber: "S202", floor: 2, type: "2BR", size: 110, bedrooms: 2, bathrooms: 2, furnished: "Furnished", status: "Occupied", baseRent: 480, securityDeposit: 960, serviceChargeType: "Flat Amount", serviceCharge: 40, notes: "" },
  { id: "u-s301", buildingId: "bld-2", unitNumber: "S301", floor: 3, type: "1BR", size: 75, bedrooms: 1, bathrooms: 1, furnished: "Unfurnished", status: "Occupied", baseRent: 500, securityDeposit: 1000, serviceChargeType: "Flat Amount", serviceCharge: 30, notes: "" },
  { id: "u-s302", buildingId: "bld-2", unitNumber: "S302", floor: 3, type: "3BR", size: 150, bedrooms: 3, bathrooms: 3, furnished: "Furnished", status: "Occupied", baseRent: 680, securityDeposit: 1360, serviceChargeType: "Flat Amount", serviceCharge: 45, notes: "" },
  { id: "u-s401", buildingId: "bld-2", unitNumber: "S401", floor: 4, type: "2BR", size: 100, bedrooms: 2, bathrooms: 2, furnished: "Semi-Furnished", status: "Occupied", baseRent: 330, securityDeposit: 660, serviceChargeType: "Flat Amount", serviceCharge: 35, notes: "" },
  { id: "u-s501", buildingId: "bld-2", unitNumber: "S501", floor: 5, type: "Studio", size: 50, bedrooms: 0, bathrooms: 1, furnished: "Unfurnished", status: "Vacant", baseRent: 210, securityDeposit: 420, serviceChargeType: "Flat Amount", serviceCharge: 20, notes: "" },
  { id: "u-s502", buildingId: "bld-2", unitNumber: "S502", floor: 5, type: "1BR", size: 78, bedrooms: 1, bathrooms: 1, furnished: "Furnished", status: "Maintenance", baseRent: 320, securityDeposit: 640, serviceChargeType: "Flat Amount", serviceCharge: 25, notes: "" },
  { id: "u-s601", buildingId: "bld-2", unitNumber: "S601", floor: 6, type: "2BR", size: 120, bedrooms: 2, bathrooms: 2, furnished: "Furnished", status: "Reserved", baseRent: 550, securityDeposit: 1100, serviceChargeType: "Flat Amount", serviceCharge: 40, notes: "" },
  { id: "u-s602", buildingId: "bld-2", unitNumber: "S602", floor: 6, type: "3BR", size: 170, bedrooms: 3, bathrooms: 3, furnished: "Furnished", status: "Vacant", baseRent: 750, securityDeposit: 1500, serviceChargeType: "Flat Amount", serviceCharge: 50, notes: "" },

  { id: "u-r01", buildingId: "bld-3", unitNumber: "R01", floor: 1, type: "Studio", size: 60, bedrooms: 0, bathrooms: 1, furnished: "Unfurnished", status: "Occupied", baseRent: 155, securityDeposit: 310, serviceChargeType: "Flat Amount", serviceCharge: 20, notes: "" },
  { id: "u-r02", buildingId: "bld-3", unitNumber: "R02", floor: 1, type: "1BR", size: 72, bedrooms: 1, bathrooms: 1, furnished: "Furnished", status: "Occupied", baseRent: 230, securityDeposit: 460, serviceChargeType: "Flat Amount", serviceCharge: 25, notes: "" },
  { id: "u-r03", buildingId: "bld-3", unitNumber: "R03", floor: 2, type: "1BR", size: 78, bedrooms: 1, bathrooms: 1, furnished: "Semi-Furnished", status: "Occupied", baseRent: 250, securityDeposit: 500, serviceChargeType: "Flat Amount", serviceCharge: 25, notes: "" },
  { id: "u-r04", buildingId: "bld-3", unitNumber: "R04", floor: 2, type: "2BR", size: 105, bedrooms: 2, bathrooms: 2, furnished: "Furnished", status: "Occupied", baseRent: 365, securityDeposit: 730, serviceChargeType: "Flat Amount", serviceCharge: 35, notes: "" },
  { id: "u-r05", buildingId: "bld-3", unitNumber: "R05", floor: 3, type: "2BR", size: 110, bedrooms: 2, bathrooms: 2, furnished: "Unfurnished", status: "Occupied", baseRent: 380, securityDeposit: 760, serviceChargeType: "Flat Amount", serviceCharge: 35, notes: "" },
  { id: "u-r06", buildingId: "bld-3", unitNumber: "R06", floor: 3, type: "3BR", size: 145, bedrooms: 3, bathrooms: 2, furnished: "Furnished", status: "Vacant", baseRent: 520, securityDeposit: 1040, serviceChargeType: "Flat Amount", serviceCharge: 45, notes: "" },
  { id: "u-r07", buildingId: "bld-3", unitNumber: "R07", floor: 4, type: "1BR", size: 76, bedrooms: 1, bathrooms: 1, furnished: "Unfurnished", status: "Occupied", baseRent: 240, securityDeposit: 480, serviceChargeType: "Flat Amount", serviceCharge: 25, notes: "" },
  { id: "u-r08", buildingId: "bld-3", unitNumber: "R08", floor: 4, type: "2BR", size: 108, bedrooms: 2, bathrooms: 2, furnished: "Semi-Furnished", status: "Occupied", baseRent: 370, securityDeposit: 740, serviceChargeType: "Flat Amount", serviceCharge: 35, notes: "" },
];

export const tenants: Tenant[] = [
  { id: "t-1", name: "Aisha Al Dosari", email: "aisha.dosari@demo.bh", phone: "+97333223344", type: "Individual", status: "Active", leaseCount: 2, address: "" },
  { id: "t-2", name: "Ali Al Mahmood", email: "ali.mahmood@demo.bh", phone: "+97333889900", type: "Individual", status: "Active", leaseCount: 2, address: "" },
  { id: "t-3", name: "Carlos Rodriguez", email: "crodriguez@demo.bh", phone: "+97336112233", type: "Individual", status: "Active", leaseCount: 2, address: "" },
  { id: "t-4", name: "Fatima Al Khalifa", email: "fatima.khalifa@demo.bh", phone: "+97333445566", type: "Individual", status: "Active", leaseCount: 2, address: "" },
  { id: "t-5", name: "Global Tech Solutions WLL", email: "admin@globaltech-bh.com", phone: "+97331733445", type: "Company", status: "Active", crNumber: "CR123456", leaseCount: 2, address: "" },
  { id: "t-6", name: "John Smith", email: "tenant@propvault.com", phone: "+97339001122", type: "Individual", status: "Active", leaseCount: 3, address: "" },
  { id: "t-7", name: "Mohammed Hassan", email: "mhassan@demo.bh", phone: "+97338556677", type: "Individual", status: "Active", leaseCount: 2, address: "" },
  { id: "t-8", name: "Priya Sharma", email: "priya.sharma@demo.bh", phone: "+97337001122", type: "Individual", status: "Active", leaseCount: 2, address: "" },
  { id: "t-9", name: "Rania Hassan", email: "rania.hassan@demo.bh", phone: "+97336677889", type: "Individual", status: "Active", leaseCount: 1, address: "" },
  { id: "t-10", name: "Sarah Williams", email: "sarah.williams@demo.bh", phone: "+97335544332", type: "Individual", status: "Active", leaseCount: 1, address: "" },
];

export const leases: Lease[] = [
  { id: "l-1", contractNumber: "CNT-2024-L007", tenantId: "t-3", unitId: "u-401", startDate: "2025-01-01", endDate: "2025-12-31", monthlyRent: 430, securityDeposit: 860, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-2", contractNumber: "CNT-2024-L011", tenantId: "t-6", unitId: "u-s202", startDate: "2025-02-01", endDate: "2026-01-31", monthlyRent: 480, securityDeposit: 960, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-3", contractNumber: "CNT-2024-L012", tenantId: "t-4", unitId: "u-s301", startDate: "2024-09-01", endDate: "2025-08-31", monthlyRent: 500, securityDeposit: 1000, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-4", contractNumber: "CNT-2024-L013", tenantId: "t-7", unitId: "u-s302", startDate: "2025-03-01", endDate: "2026-02-28", monthlyRent: 680, securityDeposit: 1360, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-5", contractNumber: "CNT-2024-L014", tenantId: "t-10", unitId: "u-s401", startDate: "2024-11-01", endDate: "2025-10-31", monthlyRent: 330, securityDeposit: 660, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-6", contractNumber: "CNT-2024-L016", tenantId: "t-8", unitId: "u-r02", startDate: "2025-01-01", endDate: "2025-12-31", monthlyRent: 230, securityDeposit: 460, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-7", contractNumber: "CNT-2024-L018", tenantId: "t-1", unitId: "u-r04", startDate: "2024-10-01", endDate: "2025-09-30", monthlyRent: 365, securityDeposit: 730, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-8", contractNumber: "CNT-2024-L020", tenantId: "t-9", unitId: "u-r05", startDate: "2025-03-01", endDate: "2026-02-28", monthlyRent: 380, securityDeposit: 760, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-9", contractNumber: "CNT-2024-L021", tenantId: "t-2", unitId: "u-102", startDate: "2024-08-01", endDate: "2025-07-31", monthlyRent: 280, securityDeposit: 560, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-10", contractNumber: "CNT-2024-L022", tenantId: "t-5", unitId: "u-s101", startDate: "2024-07-01", endDate: "2025-06-30", monthlyRent: 450, securityDeposit: 900, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-11", contractNumber: "CNT-2024-L023", tenantId: "t-6", unitId: "u-201", startDate: "2024-06-01", endDate: "2025-05-31", monthlyRent: 295, securityDeposit: 590, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-12", contractNumber: "CNT-2024-L024", tenantId: "t-1", unitId: "u-302", startDate: "2025-02-01", endDate: "2026-01-31", monthlyRent: 620, securityDeposit: 1240, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-13", contractNumber: "CNT-2024-L025", tenantId: "t-7", unitId: "u-202", startDate: "2024-12-01", endDate: "2025-11-30", monthlyRent: 420, securityDeposit: 840, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-14", contractNumber: "CNT-2024-L026", tenantId: "t-4", unitId: "u-101", startDate: "2025-04-01", endDate: "2026-03-31", monthlyRent: 185, securityDeposit: 370, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-15", contractNumber: "CNT-2024-L027", tenantId: "t-8", unitId: "u-402", startDate: "2024-10-01", endDate: "2025-09-30", monthlyRent: 650, securityDeposit: 1300, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-16", contractNumber: "CNT-2024-L028", tenantId: "t-2", unitId: "u-r07", startDate: "2025-05-01", endDate: "2026-04-30", monthlyRent: 240, securityDeposit: 480, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-17", contractNumber: "CNT-2024-L029", tenantId: "t-3", unitId: "u-r08", startDate: "2024-08-01", endDate: "2025-07-31", monthlyRent: 370, securityDeposit: 740, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-18", contractNumber: "CNT-2024-L030", tenantId: "t-10", unitId: "u-r03", startDate: "2025-01-01", endDate: "2025-12-31", monthlyRent: 250, securityDeposit: 500, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-19", contractNumber: "CNT-2024-L031", tenantId: "t-5", unitId: "u-r01", startDate: "2024-09-01", endDate: "2025-08-31", monthlyRent: 155, securityDeposit: 310, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
  { id: "l-20", contractNumber: "CNT-2024-L032", tenantId: "t-6", unitId: "u-s601", startDate: "2025-07-01", endDate: "2026-06-30", monthlyRent: 550, securityDeposit: 1100, status: "Active", paymentFrequency: "Monthly", contractDays: 365, notes: "" },
];

export const invoices: Invoice[] = [
  { id: "inv-1", invoiceNumber: "INV-2026-000085", tenantId: "t-7", leaseId: "l-13", unitId: "u-202", dueDate: "2026-07-05", amount: 263, balance: 263, status: "Sent", lineItems: [{ id: "li-1", description: "Monthly rent - July 2026", amount: 228, type: "Rent" }, { id: "li-2", description: "Service charge", amount: 35, type: "Service Charge" }], notes: "" },
  { id: "inv-2", invoiceNumber: "INV-2025-1036", tenantId: "t-5", leaseId: "l-10", unitId: "u-s101", dueDate: "2025-07-05", amount: 1500, balance: 750, status: "Partial", lineItems: [{ id: "li-3", description: "Quarterly rent - Q3 2025", amount: 1350, type: "Rent" }, { id: "li-4", description: "Service charge", amount: 150, type: "Service Charge" }], notes: "" },
  { id: "inv-3", invoiceNumber: "INV-2025-1032", tenantId: "t-1", leaseId: "l-12", unitId: "u-302", dueDate: "2025-07-05", amount: 650, balance: 650, status: "Overdue", lineItems: [{ id: "li-5", description: "Monthly rent - July 2025", amount: 605, type: "Rent" }, { id: "li-6", description: "Service charge", amount: 45, type: "Service Charge" }], notes: "" },
  { id: "inv-4", invoiceNumber: "INV-2025-1040", tenantId: "t-9", leaseId: "l-8", unitId: "u-r05", dueDate: "2025-07-05", amount: 320, balance: 320, status: "Overdue", lineItems: [{ id: "li-7", description: "Monthly rent - July 2025", amount: 285, type: "Rent" }, { id: "li-8", description: "Service charge", amount: 35, type: "Service Charge" }], notes: "" },
  { id: "inv-5", invoiceNumber: "INV-2025-1044", tenantId: "t-6", leaseId: "l-2", unitId: "u-s202", dueDate: "2025-07-05", amount: 480, balance: 480, status: "Overdue", lineItems: [{ id: "li-9", description: "Monthly rent - July 2025", amount: 440, type: "Rent" }, { id: "li-10", description: "Service charge", amount: 40, type: "Service Charge" }], notes: "" },
  { id: "inv-6", invoiceNumber: "INV-2025-1028", tenantId: "t-3", leaseId: "l-1", unitId: "u-401", dueDate: "2025-07-05", amount: 430, balance: 430, status: "Overdue", lineItems: [{ id: "li-11", description: "Monthly rent - July 2025", amount: 395, type: "Rent" }, { id: "li-12", description: "Service charge", amount: 35, type: "Service Charge" }], notes: "" },
  { id: "inv-7", invoiceNumber: "INV-2025-1048", tenantId: "t-4", leaseId: "l-3", unitId: "u-s301", dueDate: "2025-07-05", amount: 500, balance: 0, status: "Paid", lineItems: [{ id: "li-13", description: "Monthly rent - July 2025", amount: 470, type: "Rent" }, { id: "li-14", description: "Service charge", amount: 30, type: "Service Charge" }], notes: "" },
  { id: "inv-8", invoiceNumber: "INV-2025-1052", tenantId: "t-7", leaseId: "l-4", unitId: "u-s302", dueDate: "2025-07-05", amount: 680, balance: 680, status: "Overdue", lineItems: [{ id: "li-15", description: "Monthly rent - July 2025", amount: 635, type: "Rent" }, { id: "li-16", description: "Service charge", amount: 45, type: "Service Charge" }], notes: "" },
  { id: "inv-9", invoiceNumber: "INV-2025-1024", tenantId: "t-8", leaseId: "l-6", unitId: "u-r02", dueDate: "2025-07-05", amount: 620, balance: 210, status: "Partial", lineItems: [{ id: "li-17", description: "Monthly rent - July 2025", amount: 595, type: "Rent" }, { id: "li-18", description: "Service charge", amount: 25, type: "Service Charge" }], notes: "" },
  { id: "inv-10", invoiceNumber: "INV-2025-1058", tenantId: "t-2", leaseId: "l-9", unitId: "u-102", dueDate: "2026-07-05", amount: 280, balance: 280, status: "Sent", lineItems: [{ id: "li-19", description: "Monthly rent - July 2026", amount: 255, type: "Rent" }, { id: "li-20", description: "Service charge", amount: 25, type: "Service Charge" }], notes: "" },
];

export const payments: Payment[] = [
  { id: "p-1", receiptNumber: "RCP-2025-001", invoiceId: "inv-7", tenantId: "t-4", amount: 500, paymentDate: "2025-07-02", method: "Bank Transfer", reference: "TRX-998877", notes: "" },
  { id: "p-2", receiptNumber: "RCP-2025-002", invoiceId: "inv-2", tenantId: "t-5", amount: 750, paymentDate: "2025-07-03", method: "Bank Transfer", reference: "TRX-998878", notes: "" },
  { id: "p-3", receiptNumber: "RCP-2025-003", invoiceId: "inv-9", tenantId: "t-8", amount: 410, paymentDate: "2025-07-04", method: "Cheque", reference: "CHQ-1234", notes: "" },
  { id: "p-4", receiptNumber: "RCP-2025-004", invoiceId: "inv-9", tenantId: "t-8", amount: 210, paymentDate: "2025-07-05", method: "Cash", reference: "", notes: "" },
  { id: "p-5", receiptNumber: "RCP-2025-005", invoiceId: "inv-7", tenantId: "t-4", amount: 0, paymentDate: "2025-07-01", method: "Online", reference: "", notes: "" },
];

export const expenses: Expense[] = [
  { id: "e-1", expenseNumber: "EXP-2025-001", category: "Maintenance", vendor: "Al Manara HVAC", buildingId: "bld-1", unitId: "u-302", amount: 240, expenseDate: "2025-06-15", status: "Paid", description: "AC servicing" },
  { id: "e-2", expenseNumber: "EXP-2025-002", category: "Cleaning", vendor: "Sparkle Cleaning", buildingId: "bld-2", amount: 180, expenseDate: "2025-06-20", status: "Paid", description: "Common area cleaning" },
  { id: "e-3", expenseNumber: "EXP-2025-003", category: "Utilities", vendor: "EWA", buildingId: "bld-3", amount: 450, expenseDate: "2025-06-25", status: "Pending", description: "Common area electricity" },
  { id: "e-4", expenseNumber: "EXP-2025-004", category: "Security", vendor: "SafeGuard Security", buildingId: "bld-1", amount: 320, expenseDate: "2025-06-28", status: "Approved", description: "Monthly security contract" },
  { id: "e-5", expenseNumber: "EXP-2025-005", category: "Insurance", vendor: "AXA Insurance", buildingId: "bld-2", amount: 1200, expenseDate: "2025-06-30", status: "Paid", description: "Annual building insurance" },
  { id: "e-6", expenseNumber: "EXP-2025-006", category: "Repair", vendor: "FixIt Maintenance", buildingId: "bld-3", unitId: "u-r06", amount: 85, expenseDate: "2025-07-01", status: "Pending", description: "Plumbing repair" },
];

export const chartOfAccounts: ChartOfAccount[] = [
  { id: "coa-1", code: "1000", name: "Cash & Bank", type: "Asset", balance: 45200 },
  { id: "coa-2", code: "1100", name: "Accounts Receivable", type: "Asset", balance: 7350 },
  { id: "coa-3", code: "1200", name: "Security Deposits", type: "Asset", balance: 19000 },
  { id: "coa-4", code: "2000", name: "Accounts Payable", type: "Liability", balance: 1200 },
  { id: "coa-5", code: "2100", name: "Tenant Deposits", type: "Liability", balance: 19000 },
  { id: "coa-6", code: "3000", name: "Owner Equity", type: "Equity", balance: 50000 },
  { id: "coa-7", code: "4000", name: "Rental Income", type: "Income", balance: 37523 },
  { id: "coa-8", code: "5000", name: "Service Charge Income", type: "Income", balance: 3200 },
  { id: "coa-9", code: "6000", name: "Maintenance Expense", type: "Expense", balance: 2400 },
  { id: "coa-10", code: "6100", name: "Utilities Expense", type: "Expense", balance: 1800 },
  { id: "coa-11", code: "6200", name: "Insurance Expense", type: "Expense", balance: 1200 },
  { id: "coa-12", code: "6300", name: "Management Fees", type: "Expense", balance: 2500 },
];

export const journalEntries: JournalEntry[] = [
  { id: "je-1", entryNumber: "JE-2025-001", date: "2025-07-01", description: "Monthly rent accrual", total: 5100, lines: [{ id: "jl-1", accountId: "coa-2", debit: 5100, credit: 0, description: "Rent receivable" }, { id: "jl-2", accountId: "coa-7", debit: 0, credit: 5100, description: "Rental income" }] },
  { id: "je-2", entryNumber: "JE-2025-002", date: "2025-07-02", description: "Bank deposit from tenants", total: 1500, lines: [{ id: "jl-3", accountId: "coa-1", debit: 1500, credit: 0, description: "Bank receipt" }, { id: "jl-4", accountId: "coa-2", debit: 0, credit: 1500, description: "Clear receivable" }] },
  { id: "je-3", entryNumber: "JE-2025-003", date: "2025-07-03", description: "Maintenance expense", total: 240, lines: [{ id: "jl-5", accountId: "coa-9", debit: 240, credit: 0, description: "Maintenance" }, { id: "jl-6", accountId: "coa-1", debit: 0, credit: 240, description: "Bank payment" }] },
];

export const distributions: Distribution[] = [
  { id: "d-1", ownerId: "own-1", buildingId: "bld-1", period: "2025-06", amount: 8200, distributionDate: "2025-07-10", status: "Pending", notes: "" },
  { id: "d-2", ownerId: "own-1", buildingId: "bld-2", period: "2025-06", amount: 10400, distributionDate: "2025-07-10", status: "Pending", notes: "" },
  { id: "d-3", ownerId: "own-2", buildingId: "bld-3", period: "2025-06", amount: 5600, distributionDate: "2025-07-10", status: "Pending", notes: "" },
];

export const ewaBills: EWABill[] = [
  { id: "ewa-1", billNumber: "EWA-2025-001", leaseId: "l-9", unitId: "u-102", buildingId: "bld-1", month: "Jun 2025", billAmount: 42, limit: 30, excess: 12, dueDate: "2025-07-15", status: "Pending" },
  { id: "ewa-2", billNumber: "EWA-2025-002", leaseId: "l-2", unitId: "u-s202", buildingId: "bld-2", month: "Jun 2025", billAmount: 58, limit: 40, excess: 18, dueDate: "2025-07-15", status: "Invoiced" },
  { id: "ewa-3", billNumber: "EWA-2025-003", leaseId: "l-7", unitId: "u-r04", buildingId: "bld-3", month: "Jun 2025", billAmount: 35, limit: 35, excess: 0, dueDate: "2025-07-15", status: "Paid" },
];

export const complaints: Complaint[] = [
  { id: "c-1", ticketNumber: "CMP-2025-001", tenantId: "t-6", unitId: "u-s202", title: "Water leak in bathroom", description: "Minor leak under sink", status: "In Progress", priority: "Medium", createdAt: "2025-06-28" },
  { id: "c-2", ticketNumber: "CMP-2025-002", tenantId: "t-1", unitId: "u-302", title: "Noise complaint", description: "Construction noise late night", status: "Open", priority: "High", createdAt: "2025-07-02" },
  { id: "c-3", ticketNumber: "CMP-2025-003", tenantId: "t-9", unitId: "u-r05", title: "Parking access", description: "Lost parking card", status: "Resolved", priority: "Low", createdAt: "2025-06-25" },
  { id: "c-4", ticketNumber: "CMP-2025-004", tenantId: "t-5", unitId: "u-s101", title: "AC not cooling", description: "Office AC needs repair", status: "Open", priority: "Urgent", createdAt: "2025-07-04" },
  { id: "c-5", ticketNumber: "CMP-2025-005", tenantId: "t-3", unitId: "u-401", title: "Elevator maintenance", description: "Lift makes noise", status: "In Progress", priority: "Medium", createdAt: "2025-07-01" },
];

export const maintenanceRequests: MaintenanceRequest[] = [
  { id: "m-1", requestNumber: "MNT-2025-001", unitId: "u-302", buildingId: "bld-1", title: "AC service", description: "Routine AC service", status: "Completed", cost: 80, vendor: "Al Manara HVAC", scheduledDate: "2025-06-15" },
  { id: "m-2", requestNumber: "MNT-2025-002", unitId: "u-s101", buildingId: "bld-2", title: "Electrical fix", description: "Replace faulty socket", status: "In Progress", cost: 45, vendor: "PowerFix", scheduledDate: "2025-07-06" },
  { id: "m-3", requestNumber: "MNT-2025-003", unitId: "u-r06", buildingId: "bld-3", title: "Plumbing repair", description: "Fix kitchen tap", status: "Pending", cost: 85, vendor: "FixIt Maintenance", scheduledDate: "2025-07-08" },
];

export const vendors: Vendor[] = [
  { id: "v-1", name: "Al Manara HVAC", category: "HVAC", contact: "Ahmed", phone: "+97333110011", email: "info@almanara.bh", status: "Active" },
  { id: "v-2", name: "Sparkle Cleaning", category: "Cleaning", contact: "Maria", phone: "+97333220022", email: "info@sparkle.bh", status: "Active" },
  { id: "v-3", name: "PowerFix", category: "Electrical", contact: "Khalid", phone: "+97333330033", email: "info@powerfix.bh", status: "Active" },
  { id: "v-4", name: "FixIt Maintenance", category: "Plumbing", contact: "John", phone: "+97333440044", email: "info@fixit.bh", status: "Active" },
  { id: "v-5", name: "SafeGuard Security", category: "Security", contact: "Salman", phone: "+97333550055", email: "info@safeguard.bh", status: "Active" },
];

export const assets: Asset[] = [
  { id: "a-1", name: "Lobby furniture set", category: "Furniture", buildingId: "bld-1", purchaseDate: "2024-01-15", cost: 2500, status: "Active" },
  { id: "a-2", name: "Security camera system", category: "Security", buildingId: "bld-2", purchaseDate: "2024-03-10", cost: 4200, status: "Active" },
  { id: "a-3", name: "Gym equipment", category: "Amenities", buildingId: "bld-3", purchaseDate: "2024-06-20", cost: 5600, status: "Active" },
];

export const documents: Document[] = [
  { id: "doc-1", name: "Al Noor Title Deed", type: "PDF", entityType: "Building", entityId: "bld-1", uploadDate: "2024-01-10", fileUrl: "#" },
  { id: "doc-2", name: "CNT-2024-L007 Contract", type: "PDF", entityType: "Lease", entityId: "l-1", uploadDate: "2024-12-28", fileUrl: "#" },
  { id: "doc-3", name: "Ahmed Al Rashid Passport", type: "PDF", entityType: "Owner", entityId: "own-1", uploadDate: "2024-02-05", fileUrl: "#" },
];

export const getBuildingById = (id: string) => buildings.find((b) => b.id === id);
export const getUnitById = (id: string) => units.find((u) => u.id === id);
export const getTenantById = (id: string) => tenants.find((t) => t.id === id);
export const getOwnerById = (id: string) => owners.find((o) => o.id === id);
export const getLeaseById = (id: string) => leases.find((l) => l.id === id);
export const getInvoiceById = (id: string) => invoices.find((i) => i.id === id);

export const getBuildingUnits = (buildingId: string) => units.filter((u) => u.buildingId === buildingId);
export const getTenantLeases = (tenantId: string) => leases.filter((l) => l.tenantId === tenantId);
export const getUnitLease = (unitId: string) => leases.find((l) => l.unitId === unitId && l.status === "Active");
export const getInvoicePayments = (invoiceId: string) => payments.filter((p) => p.invoiceId === invoiceId);
