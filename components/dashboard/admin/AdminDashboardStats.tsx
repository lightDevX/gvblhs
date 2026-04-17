"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3,
  CheckCircle,
  Clock,
  GraduationCap,
  ShieldAlert,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

interface Registration {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  batch: string;
  religion: string | null;
  guestsUnder5: number;
  guests5AndAbove: number;
  totalGuests: number;
  totalAttendees: number;
  tShirtSize: string | null;
  paymentMethod: string | null;
  transactionId: string | null;
  amount: number;
  status: string;
  createdAt: string;
}

const BATCHES = Array.from({ length: 11 }, (_, i) => String(2000 + i));

const CHART_COLORS = [
  "hsl(38, 90%, 55%)",
  "hsl(350, 70%, 60%)",
  "hsl(200, 70%, 55%)",
  "hsl(150, 60%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(30, 80%, 55%)",
  "hsl(170, 60%, 50%)",
];

const AdminDashboardStats = () => {
  const { user, loading: authLoading } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartBatch, setChartBatch] = useState("all");

  useEffect(() => {
    if (!authLoading && user) {
      fetchRegistrations();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchRegistrations = async () => {
    try {
      const res = await fetch("/api/admin/registrations");
      if (res.ok) {
        setRegistrations(await res.json());
      } else {
        toast.error("Failed to load registrations");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShieldAlert className="h-12 w-12 mb-4 opacity-40" />
        <h2 className="font-heading text-xl font-semibold text-foreground mb-1">
          Access Denied
        </h2>
        <p>You need admin privileges to view this page.</p>
      </div>
    );
  }

  const totalRegistrars = registrations.length;
  const totalGuests = registrations.reduce(
    (s, r) => s + (r.totalGuests || 0),
    0,
  );
  const totalAttendees = registrations.reduce(
    (s, r) => s + (r.totalAttendees || 1),
    0,
  );
  const pendingCount = registrations.filter(
    (r) => r.status === "pending",
  ).length;
  const approvedCount = registrations.filter(
    (r) => r.status === "approved",
  ).length;
  const rejectedCount = registrations.filter(
    (r) => r.status === "rejected",
  ).length;

  // Batch distribution chart
  const batchData = BATCHES.map((b) => ({
    batch: b,
    registrars: registrations.filter((r) => r.batch === b).length,
    attendees: registrations
      .filter((r) => r.batch === b)
      .reduce((s, r) => s + (r.totalAttendees || 1), 0),
  })).filter((d) => d.registrars > 0);

  // Payment method distribution
  const paymentData = ["bkash", "nagad", "rocket", "bank", "manual"]
    .map((m) => ({
      name: m.charAt(0).toUpperCase() + m.slice(1),
      value: registrations.filter((r) => r.paymentMethod === m).length,
    }))
    .filter((d) => d.value > 0);

  // Status distribution
  const statusData = [
    { name: "Pending", value: pendingCount, color: "hsl(45, 90%, 55%)" },
    { name: "Approved", value: approvedCount, color: "hsl(140, 60%, 50%)" },
    { name: "Rejected", value: rejectedCount, color: "hsl(0, 70%, 55%)" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">
          Admin Dashboard
        </h2>
        <p className="text-muted-foreground mt-1">
          Registration overview and statistics
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <GraduationCap size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalRegistrars}</p>
              <p className="text-xs text-muted-foreground">Registrars</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <UserCheck size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalGuests}</p>
              <p className="text-xs text-muted-foreground">Total Guests</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Users size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalAttendees}</p>
              <p className="text-xs text-muted-foreground">Attendees</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
              <Clock size={20} className="text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
              <CheckCircle size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
              <XCircle size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{rejectedCount}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batch distribution */}
        {batchData.length > 0 && (
          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" /> Batch
                  Distribution
                </CardTitle>
                <Select value={chartBatch} onValueChange={setChartBatch}>
                  <SelectTrigger className="w-28 h-8 text-xs bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Registrars</SelectItem>
                    <SelectItem value="attendees">Attendees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={batchData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(222, 30%, 18%)"
                    />
                    <XAxis
                      dataKey="batch"
                      stroke="hsl(220, 15%, 55%)"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(220, 15%, 55%)"
                      fontSize={12}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(222, 40%, 10%)",
                        border: "1px solid hsl(222, 30%, 18%)",
                        borderRadius: 8,
                        color: "hsl(40, 33%, 92%)",
                      }}
                      labelStyle={{ color: "hsl(40, 33%, 92%)" }}
                      itemStyle={{ color: "hsl(40, 33%, 92%)" }}
                    />
                    <Bar
                      dataKey={
                        chartBatch === "attendees" ? "attendees" : "registrars"
                      }
                      radius={[6, 6, 0, 0]}>
                      {batchData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment + Status pie charts */}
        <div className="space-y-6">
          {paymentData.length > 0 && (
            <Card className="glass border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={65}
                        innerRadius={30}
                        paddingAngle={2}
                        fontSize={11}>
                        {paymentData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(222, 40%, 10%)",
                          border: "1px solid hsl(222, 30%, 18%)",
                          borderRadius: 8,
                          color: "hsl(40, 33%, 92%)",
                        }}
                        formatter={(value, name) => [`${value}`, `${name}`]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {statusData.length > 0 && (
            <Card className="glass border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Registration Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={65}
                        innerRadius={30}
                        paddingAngle={2}
                        fontSize={11}>
                        {statusData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(45, 90%, 98%)", // Light cream/gold background
                          border: "1px solid hsl(38, 90%, 55%)", // Gold border
                          borderRadius: 8,
                          color: "hsl(38, 80%, 35%)", // Dark gold text
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                        }}
                        formatter={(value, name) => [`${value}`, `${name}`]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardStats;
