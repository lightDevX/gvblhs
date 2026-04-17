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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CheckCircle,
  Download,
  FileText,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  guestNames: string[];
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

const statusColor: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

const AdminRegistrations = () => {
  const { user, loading: authLoading } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r)),
        );
        toast.success(`Registration ${status}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    return registrations.filter((r) => {
      if (batchFilter !== "all" && r.batch !== batchFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.mobile.includes(q) ||
          (r.email && r.email.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [registrations, search, batchFilter, statusFilter]);

  const generatePDF = (data: Registration[], title: string) => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}  |  Total: ${data.length}`, 14, 22);

    const headers = [
      "#",
      "Name",
      "Mobile",
      "Email",
      "Batch",
      "Guests",
      "Attendees",
      "T-Shirt",
      "Payment",
      "TxnID",
      "Amount",
      "Status",
      "Date",
    ];

    const rows = data.map((r, i) => [
      String(i + 1),
      r.name,
      r.mobile,
      r.email || "-",
      r.batch,
      String(r.totalGuests),
      String(r.totalAttendees),
      r.tShirtSize || "-",
      r.paymentMethod || "-",
      r.transactionId || "-",
      String(r.amount),
      r.status,
      r.createdAt ? r.createdAt.split("T")[0] : "-",
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 28,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [38, 40, 74], textColor: [220, 194, 130] },
    });

    return doc;
  };

  const exportPDF = () => {
    const doc = generatePDF(filtered, "GVBLHS Reunion 2026 - Registrations");
    doc.save("registrations.pdf");
    toast.success("PDF downloaded");
  };

  const exportBatchWise = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    let first = true;

    const batchGroups = BATCHES.filter((b) =>
      registrations.some((r) => r.batch === b),
    );

    if (batchGroups.length === 0) {
      toast.error("No registrations to export");
      return;
    }

    for (const batch of batchGroups) {
      const batchRegs = registrations.filter((r) => r.batch === batch);
      if (batchRegs.length === 0) continue;

      if (!first) doc.addPage();
      first = false;

      doc.setFontSize(14);
      doc.text(`Batch ${batch}  (${batchRegs.length} registrations)`, 14, 15);

      const headers = [
        "#",
        "Name",
        "Mobile",
        "Email",
        "Guests",
        "Attendees",
        "T-Shirt",
        "Payment",
        "TxnID",
        "Amount",
        "Status",
      ];

      const rows = batchRegs.map((r, i) => [
        String(i + 1),
        r.name,
        r.mobile,
        r.email || "-",
        String(r.totalGuests),
        String(r.totalAttendees),
        r.tShirtSize || "-",
        r.paymentMethod || "-",
        r.transactionId || "-",
        String(r.amount),
        r.status,
      ]);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 22,
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [38, 40, 74], textColor: [220, 194, 130] },
      });
    }

    doc.save("registrations-batchwise.pdf");
    toast.success("Batch-wise PDF downloaded");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Registrations
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage and review all registrations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportPDF}
            disabled={filtered.length === 0}>
            <Download size={16} className="mr-1" /> Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportBatchWise}
            disabled={registrations.length === 0}>
            <FileText size={16} className="mr-1" /> Batch-wise PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search by name, mobile, or email..."
                className="pl-9 bg-background/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger className="w-full sm:w-32 bg-background/50">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-32 bg-background/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">
            Showing {filtered.length} of {registrations.length} registrations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead className="text-center">Guests</TableHead>
                <TableHead className="text-center">Attendees</TableHead>
                <TableHead>T-Shirt</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>TxnID</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                    No registrations found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm">{r.mobile}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.email || "-"}
                    </TableCell>
                    <TableCell>{r.batch}</TableCell>
                    <TableCell className="text-center">{r.totalGuests}</TableCell>
                    <TableCell className="text-center">{r.totalAttendees}</TableCell>
                    <TableCell>{r.tShirtSize || "-"}</TableCell>
                    <TableCell className="capitalize">{r.paymentMethod || "-"}</TableCell>
                    <TableCell className="text-xs font-mono max-w-[120px] truncate">
                      {r.transactionId || "-"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      &#x09F3;{r.amount}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColor[r.status] || ""}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {r.status !== "approved" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                            onClick={() => updateStatus(r.id, "approved")}
                            disabled={updatingId === r.id}
                            title="Approve">
                            <CheckCircle size={15} />
                          </Button>
                        )}
                        {r.status !== "rejected" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => updateStatus(r.id, "rejected")}
                            disabled={updatingId === r.id}
                            title="Reject">
                            <XCircle size={15} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRegistrations;
