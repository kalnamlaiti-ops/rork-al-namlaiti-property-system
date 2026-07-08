import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { useData } from "@/context/DataContext";
import { BarChart3, PieChart, FileText, Download, TrendingUp, DollarSign, Building2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, LineChart, Line } from "recharts";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 0 }).format(amount);
}

const COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) {
    toast.info("No data to export");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => `"${String(row[h]).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`${filename} exported`);
}

export default function Reports() {
  const navigate = useNavigate();
  const { buildings, units, leases, tenants, invoices, expenses, payments } = useData();
  const occupancyData = buildings.map((b) => {
    const bUnits = units.filter((u) => u.buildingId === b.id);
    const occupied = bUnits.filter((u) => u.status === "Occupied").length;
    return { name: b.name.split(" ")[0], total: bUnits.length, occupied, vacant: bUnits.length - occupied };
  });

  const incomeExpenseData = [
    { name: "Jan", income: 8200, expense: 2100 },
    { name: "Feb", income: 8400, expense: 2300 },
    { name: "Mar", income: 8600, expense: 1900 },
    { name: "Apr", income: 8500, expense: 2500 },
    { name: "May", income: 8800, expense: 2200 },
    { name: "Jun", income: 9000, expense: 2400 },
  ];

  const invoiceStatusData = [
    { name: "Paid", value: invoices.filter((i) => i.status === "Paid").length },
    { name: "Partial", value: invoices.filter((i) => i.status === "Partial").length },
    { name: "Overdue", value: invoices.filter((i) => i.status === "Overdue").length },
    { name: "Sent", value: invoices.filter((i) => i.status === "Sent").length },
  ];

  const totalRent = leases.reduce((sum, l) => sum + l.monthlyRent, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const netIncome = totalCollected - totalExpenses;

  const exportIncomeExpense = () => {
    downloadCsv(
      `income-vs-expenses-${format(new Date(), "yyyy-MM-dd")}.csv`,
      incomeExpenseData.map((row) => ({ Month: row.name, Income: row.income, Expenses: row.expense })),
    );
  };

  const exportInvoiceStatus = () => {
    downloadCsv(
      `invoice-status-${format(new Date(), "yyyy-MM-dd")}.csv`,
      invoiceStatusData.map((row) => ({ Status: row.name, Count: row.value })),
    );
  };

  const exportOccupancy = () => {
    downloadCsv(
      `occupancy-by-building-${format(new Date(), "yyyy-MM-dd")}.csv`,
      occupancyData.map((row) => ({ Building: row.name, Total: row.total, Occupied: row.occupied, Vacant: row.vacant })),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="MIS Reports" subtitle="Management information and portfolio analytics" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Rental Income</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(totalRent)}</p>
              </div>
              <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(totalCollected)}</p>
              </div>
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <p className="mt-2 text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="rounded-lg bg-red-100 p-2 text-red-600">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Income</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(netIncome)}</p>
              </div>
              <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                <PieChart className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Income vs Expenses</CardTitle>
              <Button variant="ghost" size="sm" onClick={exportIncomeExpense}>
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={incomeExpenseData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Invoice Status</CardTitle>
              <Button variant="ghost" size="sm" onClick={exportInvoiceStatus}>
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RPieChart>
                  <Pie data={invoiceStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {invoiceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Occupancy by Building</CardTitle>
            <Button variant="ghost" size="sm" onClick={exportOccupancy}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancyData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="occupied" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vacant" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate("/buildings")}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-indigo-100 p-3 text-indigo-600">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Portfolio Summary</p>
              <p className="text-sm text-muted-foreground">Buildings, units, occupancy overview</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate("/tenants")}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-emerald-100 p-3 text-emerald-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Tenant Report</p>
              <p className="text-sm text-muted-foreground">Active tenants, leases, arrears</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate("/invoices")}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-amber-100 p-3 text-amber-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Financial Statement</p>
              <p className="text-sm text-muted-foreground">Income, expenses, distributions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate("/invoices")}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-red-100 p-3 text-red-600">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Aging Report</p>
              <p className="text-sm text-muted-foreground">Outstanding receivables by age</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
