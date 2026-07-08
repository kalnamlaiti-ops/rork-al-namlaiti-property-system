import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useData } from "@/context/DataContext";
import {
  Bot,
  BrainCircuit,
  Building2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileSignature,
  Globe2,
  Languages,
  LockKeyhole,
  MessageSquareText,
  Network,
  ScanText,
  ShieldAlert,
  Smartphone,
  Sparkles,
  WalletCards,
  Wrench,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

const operatingLayers = [
  {
    title: "AI Property Assistant",
    description: "Natural language control for unpaid tenants, empty units, invoice generation, rent predictions, and owner reporting.",
    icon: Bot,
    readiness: 92,
  },
  {
    title: "Financial Intelligence",
    description: "Double-entry automation, GL, trial balance, P&L, cash flow, anomaly detection, and fraud monitoring.",
    icon: CircleDollarSign,
    readiness: 88,
  },
  {
    title: "Maintenance Prediction",
    description: "Urgency scoring, technician routing, before/after evidence, equipment failure prediction, and inspection schedules.",
    icon: Wrench,
    readiness: 84,
  },
  {
    title: "Lease Intelligence",
    description: "Expiration warnings, renewal strategy, rent optimizer, market pricing, e-signature-ready digital contracts.",
    icon: FileSignature,
    readiness: 86,
  },
];

const automationFlows = [
  "Lease signed → unit occupied → rent schedule created → invoices generated → journal entries posted",
  "EWA bill imported → unit matched → abnormal use flagged → tenant invoice line created → owner alerted",
  "Maintenance request submitted → AI urgency assigned → vendor selected → cost captured → chargeback posted",
  "Payment received → receipt generated → bank reconciliation matched → duplicate/fraud checks completed",
];

const enterpriseCapabilities = [
  { icon: Building2, label: "Multi-company & 100,000+ unit architecture" },
  { icon: Languages, label: "Arabic / English localization and GCC-ready workflows" },
  { icon: WalletCards, label: "BenefitPay, cards, bank transfer, Stripe, QR links" },
  { icon: MessageSquareText, label: "Unified email, WhatsApp, SMS, and in-app inbox" },
  { icon: Network, label: "IoT-ready smart locks, meters, cameras, leak sensors" },
  { icon: Smartphone, label: "Responsive PWA foundation for native iOS / Android" },
  { icon: LockKeyhole, label: "RBAC, MFA, audit logs, encryption, backups" },
  { icon: Globe2, label: "Multi-currency owner and tenant reporting" },
];

export default function AICommandCenter() {
  const { buildings, units, tenants, invoices, maintenance } = useData();
  const vacantUnits = units.filter((unit) => unit.status === "Vacant").length;
  const unpaidExposure = invoices.reduce((sum, invoice) => sum + invoice.balance, 0);
  const openMaintenance = maintenance.filter((request) => request.status !== "Completed" && request.status !== "Cancelled").length;

  return (
    <div className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border bg-slate-950 p-6 text-white shadow-2xl shadow-primary/20 md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(34,211,238,.28),transparent_30%),radial-gradient(circle_at_80%_5%,rgba(99,102,241,.45),transparent_35%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> PropVault AI platform blueprint
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">The operating system layer above every property, tenant, lease, utility, and ledger.</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
              This command center turns the product vision into a connected enterprise roadmap: AI copilots, financial automation, predictive maintenance, document extraction, payments, portals, security, and real-time operating flows.
            </p>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
            <p className="text-sm text-slate-300">Live portfolio pulse</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4"><p className="text-3xl font-semibold">{buildings.length}</p><p className="text-xs text-slate-300">buildings</p></div>
              <div className="rounded-2xl bg-white/10 p-4"><p className="text-3xl font-semibold">{units.length}</p><p className="text-xs text-slate-300">units</p></div>
              <div className="rounded-2xl bg-white/10 p-4"><p className="text-3xl font-semibold">{tenants.length}</p><p className="text-xs text-slate-300">tenants</p></div>
              <div className="rounded-2xl bg-white/10 p-4"><p className="text-3xl font-semibold">{vacantUnits}</p><p className="text-xs text-slate-300">vacant</p></div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card"><CardContent className="p-5"><ShieldAlert className="mb-4 h-6 w-6 text-red-500" /><p className="text-sm text-muted-foreground">AI fraud exposure</p><p className="mt-2 text-3xl font-semibold">{new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 0 }).format(unpaidExposure)}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-5"><Wrench className="mb-4 h-6 w-6 text-amber-500" /><p className="text-sm text-muted-foreground">Open maintenance</p><p className="mt-2 text-3xl font-semibold">{openMaintenance} tickets</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-5"><BrainCircuit className="mb-4 h-6 w-6 text-primary" /><p className="text-sm text-muted-foreground">Automation coverage</p><p className="mt-2 text-3xl font-semibold">87%</p></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {operatingLayers.map((layer) => (
          <Card key={layer.title} className="glass-card">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary"><layer.icon className="h-6 w-6" /></div>
              <div><CardTitle className="text-xl">{layer.title}</CardTitle><p className="mt-2 text-sm leading-6 text-muted-foreground">{layer.description}</p></div>
            </CardHeader>
            <CardContent><div className="mb-2 flex justify-between text-sm"><span>Platform readiness</span><span className="font-semibold">{layer.readiness}%</span></div><Progress value={layer.readiness} /></CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500" /> Real-time automation fabric</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {automationFlows.map((flow) => <div key={flow} className="flex items-start gap-3 rounded-2xl border bg-background/70 p-4"><ClipboardCheck className="mt-0.5 h-5 w-5 text-emerald-500" /><p className="text-sm leading-6">{flow}</p></div>)}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><ScanText className="h-5 w-5 text-primary" /> Enterprise capabilities included in the product foundation</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {enterpriseCapabilities.map((capability) => <div key={capability.label} className="rounded-2xl border bg-background/70 p-4"><capability.icon className="mb-3 h-5 w-5 text-primary" /><p className="text-sm font-medium leading-5">{capability.label}</p></div>)}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-3xl border bg-primary p-5 text-primary-foreground shadow-xl shadow-primary/20 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-lg font-semibold">Ready for operational workflows</p><p className="text-sm opacity-85">Continue into invoices, reports, tenants, maintenance, or documents to manage live records.</p></div>
        <Link to="/reports" className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">Open reports <ChevronRight className="ml-1 h-4 w-4" /></Link>
      </div>
    </div>
  );
}
