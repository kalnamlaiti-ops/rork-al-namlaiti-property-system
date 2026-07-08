import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/context/DataContext";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Command,
  FileScan,
  Home,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 0 }).format(amount);
}

const revenueForecast = [
  { month: "Jul", income: 42000, expenses: 16500, cash: 25500 },
  { month: "Aug", income: 44800, expenses: 17100, cash: 27700 },
  { month: "Sep", income: 46200, expenses: 15200, cash: 31000 },
  { month: "Oct", income: 48900, expenses: 18300, cash: 30600 },
  { month: "Nov", income: 51500, expenses: 17600, cash: 33900 },
  { month: "Dec", income: 54800, expenses: 19100, cash: 35700 },
];

const automationQueue = [
  "Generate 184 July invoices and post double-entry journals",
  "Send WhatsApp reminders to 17 tenants over 500 BHD",
  "Reconcile BenefitPay batch and flag 2 duplicate payments",
  "Extract EWA PDFs, match units, and detect leak anomalies",
];

const aiModules = [
  { icon: Command, title: "Natural Language Control", text: "Ask: ‘Find empty apartments’ or ‘Predict next month income.’" },
  { icon: BrainCircuit, title: "AI Financial Analyst", text: "Forecasts revenue, vacancy loss, cash flow, and unusual expenses." },
  { icon: FileScan, title: "Document Intelligence", text: "Reads leases, receipts, utility bills, and links records automatically." },
  { icon: Radar, title: "Digital Twin + IoT", text: "3D building health, utility hotspots, smart locks, meters, and leak sensors." },
];

export default function Dashboard() {
  const { buildings, units, invoices } = useData();
  const totalUnits = units.length;
  const occupied = units.filter((u) => u.status === "Occupied").length;
  const vacant = units.filter((u) => u.status === "Vacant").length;
  const occupancyRate = Math.round((occupied / Math.max(totalUnits, 1)) * 100);
  const totalBilled = invoices.reduce((sum, i) => sum + i.amount, 0);
  const outstanding = invoices.reduce((sum, i) => sum + i.balance, 0);
  const totalCollected = totalBilled - outstanding;
  const overdueInvoices = invoices.filter((i) => i.status === "Overdue");
  const overdueAmount = overdueInvoices.reduce((sum, i) => sum + i.balance, 0);
  const portfolioHealth = Math.min(98, Math.round(72 + occupancyRate / 5 + (totalCollected / Math.max(totalBilled, 1)) * 10));

  const unitMix = [
    { name: "Occupied", value: occupied, color: "#10b981" },
    { name: "Vacant", value: vacant, color: "#6366f1" },
    { name: "Maintenance", value: Math.max(2, Math.round(totalUnits * 0.06)), color: "#f59e0b" },
  ];

  const kpiCards = [
    { title: "Managed Assets", value: `${buildings.length} buildings`, sub: `${totalUnits} units across towers, villas, offices, shops`, icon: Building2 },
    { title: "Occupancy", value: `${occupancyRate}%`, sub: `${occupied} occupied · ${vacant} ready to lease`, icon: Home },
    { title: "Monthly Collection", value: formatCurrency(totalCollected), sub: `${formatCurrency(outstanding)} still outstanding`, icon: CircleDollarSign },
    { title: "AI Risk Radar", value: `${overdueInvoices.length} flags`, sub: `${formatCurrency(overdueAmount)} overdue exposure`, icon: ShieldCheck },
  ];

  return (
    <div className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-slate-950 px-5 py-6 text-white shadow-2xl shadow-indigo-950/20 sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,.45),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(20,184,166,.35),transparent_28%),linear-gradient(135deg,rgba(15,23,42,.96),rgba(2,6,23,.98))]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> PropVault AI Operating System · Bahrain & GCC Ready
            </div>
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">Manage 100,000+ units with one AI-powered command center.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                A premium property management OS unifying leasing, EWA utilities, maintenance, payments, accounting, portals, and predictive intelligence in real time.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/invoices" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]">
                Generate invoices <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/reports" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15">
                Open AI executive dashboard
              </Link>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Predictive Building Health</p>
                <p className="text-4xl font-semibold">{portfolioHealth}/100</p>
              </div>
              <Bot className="h-10 w-10 text-cyan-200" />
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={revenueForecast}>
                <defs><linearGradient id="cash" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22d3ee" stopOpacity={0.75}/><stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,.15)", borderRadius: 16 }} />
                <Area type="monotone" dataKey="cash" stroke="#67e8f9" strokeWidth={3} fill="url(#cash)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="glass-card overflow-hidden">
            <CardContent className="p-5">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><kpi.icon className="h-5 w-5" /></div>
              <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{kpi.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="glass-card">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-primary" /> Financial intelligence forecast</CardTitle></CardHeader>
          <CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={revenueForecast}><CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25}/><XAxis dataKey="month"/><YAxis tickFormatter={(v) => `${v / 1000}k`}/><Tooltip formatter={(v: number) => formatCurrency(v)} /><Bar dataKey="income" fill="#6366f1" radius={[8,8,0,0]} /><Bar dataKey="expenses" fill="#f59e0b" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer></CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Zap className="h-5 w-5 text-amber-500" /> Smart automation queue</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {automationQueue.map((item, index) => (<div key={item} className="flex gap-3 rounded-2xl border bg-background/60 p-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500"/><div><p className="text-sm font-medium">{item}</p><p className="text-xs text-muted-foreground">Run order #{index + 1} · audit logged · owner approved</p></div></div>))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass-card lg:col-span-1">
          <CardHeader><CardTitle className="text-lg">Portfolio digital twin</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <ResponsiveContainer width="100%" height={210}><PieChart><Pie data={unitMix} innerRadius={58} outerRadius={86} paddingAngle={5} dataKey="value">{unitMix.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
            {unitMix.map((item) => <div key={item.name} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.name}</span><span className="font-semibold">{item.value} units</span></div>)}
          </CardContent>
        </Card>
        <Card className="glass-card lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">AI-native modules ready for enterprise scale</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {aiModules.map((module) => (<div key={module.title} className="rounded-3xl border bg-background/70 p-5 transition hover:-translate-y-1 hover:shadow-xl"><module.icon className="mb-4 h-6 w-6 text-primary"/><h3 className="font-semibold">{module.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{module.text}</p></div>))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-red-200/70 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/20">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><div className="rounded-full bg-red-100 p-2 text-red-600 dark:bg-red-900/40"><AlertTriangle className="h-5 w-5" /></div><div><p className="font-semibold text-red-700 dark:text-red-300">{overdueInvoices.length} overdue invoice(s) need attention</p><p className="text-sm text-red-600 dark:text-red-300/80">Total outstanding exposure: {formatCurrency(overdueAmount)}</p></div></div>
          <Link to="/invoices" className="inline-flex items-center text-sm font-medium text-red-700 hover:underline dark:text-red-300">Resolve now <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </CardContent>
      </Card>
    </div>
  );
}
