"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3,
  Download,
  GraduationCap,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  religion: string | null;
  category: string;
  batch: string | null;
  transactionId: string | null;
  isVerified: boolean;
  createdAt: string;
}

const BATCHES = Array.from({ length: 11 }, (_, i) => String(2000 + i));

const AdminDashboardStats = () => {
  const { user, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBatch, setFilterBatch] = useState("all");
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      if (authLoading) return;

      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user is admin
      if (user.role !== "admin") {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await fetchProfiles();
    };

    checkAdminAndFetch();
  }, [user, authLoading]);

  const fetchProfiles = async () => {
    try {
      const response = await fetch("/api/admin/profiles");
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      } else {
        toast.error("Failed to fetch profiles");
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
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

  if (!user || !isAdmin) {
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

  const students = profiles.filter((p) => p.category === "student");
  const guests = profiles.filter((p) => p.category === "guest");

  // Batch distribution
  const batchData = BATCHES.map((b) => ({
    batch: b,
    count: students.filter((s) => s.batch === b).length,
  })).filter((d) => d.count > 0);

  // Filtered list
  const filtered = profiles.filter((p) => {
    if (filterCategory !== "all" && p.category !== filterCategory) return false;
    if (filterBatch !== "all" && p.batch !== filterBatch) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Religion",
      "Category",
      "Batch",
      "Transaction ID",
      "Registered",
      "Verified",
    ];
    const rows = filtered.map((p) => [
      p.name,
      p.email,
      p.phone || "",
      p.religion || "",
      p.category,
      p.batch || "",
      p.transactionId || "",
      new Date(p.createdAt).toLocaleDateString(),
      p.isVerified ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `registrations_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Export started");
  };

  const CHART_COLORS = [
    "hsl(38, 90%, 55%)",
    "hsl(350, 70%, 60%)",
    "hsl(200, 70%, 55%)",
    "hsl(150, 60%, 50%)",
    "hsl(280, 60%, 55%)",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">
          Admin Dashboard
        </h2>
        <p className="text-muted-foreground mt-1">
          Overview of all registrations
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass border-border/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Users size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{profiles.length}</p>
              <p className="text-xs text-muted-foreground">
                Total Registrations
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <GraduationCap size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{students.length}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center">
              <UserCheck size={22} className="text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{guests.length}</p>
              <p className="text-xs text-muted-foreground">Guests</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch distribution chart */}
      {batchData.length > 0 && (
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Batch Distribution
            </CardTitle>
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
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
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

      {/* Filters */}
      <Card className="glass border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg">All Registrations</CardTitle>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1.5" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[140px] bg-background/50">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="guest">Guests</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterBatch} onValueChange={setFilterBatch}>
              <SelectTrigger className="w-[130px] bg-background/50">
                <SelectValue placeholder="Batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {BATCHES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border/50 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Religion</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground py-8">
                      No registrations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-xs">{p.email}</TableCell>
                      <TableCell className="text-xs">
                        {p.phone || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            p.category === "guest"
                              ? "bg-accent/10 text-accent border-accent/30"
                              : "bg-primary/10 text-primary border-primary/30"
                          }>
                          {p.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.batch || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {p.religion || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={p.isVerified ? "default" : "secondary"}
                          className={
                            p.isVerified ? "bg-green-500/10 text-green-500" : ""
                          }>
                          {p.isVerified ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardStats;
