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
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
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
  registeredBy: string | null;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    doc.text(
      `Generated: ${new Date().toLocaleDateString()}  |  Total Entries: ${data.length}`,
      14,
      22,
    );

    const headers = [
      "#",
      "Name",
      "Mobile",
      "Email",
      "Batch",
      "Under 5",
      "5+",
      "Attendees",
      "T-Shirt",
      "Payment",
      "Amount",
      "Registered By",
      "Status",
      "Date",
    ];

    const rows = data.map((r, i) => [
      String(i + 1),
      r.name,
      r.mobile,
      r.email || "-",
      r.batch,
      String(r.guestsUnder5),
      String(r.guests5AndAbove),
      String(r.totalAttendees),
      r.tShirtSize || "-",
      r.paymentMethod || "-",
      String(r.amount),
      r.registeredBy || "myself",
      r.status,
      r.createdAt ? r.createdAt.split("T")[0] : "-",
    ]);

    const totalPersons = data.reduce((s, r) => s + r.totalAttendees, 0);
    const totalUnder5 = data.reduce((s, r) => s + r.guestsUnder5, 0);
    const total5Plus = data.reduce((s, r) => s + r.guests5AndAbove, 0);
    const totalAmount = data.reduce((s, r) => s + r.amount, 0);

    rows.push([
      "",
      "TOTAL",
      "",
      "",
      "",
      String(totalUnder5),
      String(total5Plus),
      String(totalPersons),
      "",
      "",
      String(totalAmount),
      "",
      "",
      "",
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 28,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [38, 40, 74], textColor: [220, 194, 130] },
      didParseCell: (hookData) => {
        if (
          hookData.section === "body" &&
          hookData.row.index === rows.length - 1
        ) {
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.fillColor = [38, 40, 74];
          hookData.cell.styles.textColor = [220, 194, 130];
        }
      },
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

    let grandPersons = 0;
    let grandUnder5 = 0;
    let grand5Plus = 0;
    let grandAmount = 0;
    let grandEntries = 0;

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
        "Under 5",
        "5+",
        "Attendees",
        "T-Shirt",
        "Payment",
        "Amount",
        "Registered By",
        "Status",
      ];

      const rows = batchRegs.map((r, i) => [
        String(i + 1),
        r.name,
        r.mobile,
        r.email || "-",
        String(r.guestsUnder5),
        String(r.guests5AndAbove),
        String(r.totalAttendees),
        r.tShirtSize || "-",
        r.paymentMethod || "-",
        String(r.amount),
        r.registeredBy || "myself",
        r.status,
      ]);

      const batchPersons = batchRegs.reduce((s, r) => s + r.totalAttendees, 0);
      const batchUnder5 = batchRegs.reduce((s, r) => s + r.guestsUnder5, 0);
      const batch5Plus = batchRegs.reduce((s, r) => s + r.guests5AndAbove, 0);
      const batchAmount = batchRegs.reduce((s, r) => s + r.amount, 0);

      grandPersons += batchPersons;
      grandUnder5 += batchUnder5;
      grand5Plus += batch5Plus;
      grandAmount += batchAmount;
      grandEntries += batchRegs.length;

      rows.push([
        "",
        "TOTAL",
        "",
        "",
        String(batchUnder5),
        String(batch5Plus),
        String(batchPersons),
        "",
        "",
        String(batchAmount),
        "",
        "",
      ]);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 22,
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [38, 40, 74], textColor: [220, 194, 130] },
        didParseCell: (hookData) => {
          if (
            hookData.section === "body" &&
            hookData.row.index === rows.length - 1
          ) {
            hookData.cell.styles.fontStyle = "bold";
            hookData.cell.styles.fillColor = [38, 40, 74];
            hookData.cell.styles.textColor = [220, 194, 130];
          }
        },
      });
    }

    // Grand total summary page
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Grand Total Summary", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);

    autoTable(doc, {
      head: [["Metric", "Value"]],
      body: [
        ["Total Entries (Registrants)", String(grandEntries)],
        ["Total Entry Persons (All Attendees)", String(grandPersons)],
        ["Total Under 5 Guests", String(grandUnder5)],
        ["Total 5+ Guests", String(grand5Plus)],
        ["Total Amount", `${grandAmount} BDT`],
      ],
      startY: 28,
      styles: { fontSize: 11, cellPadding: 4 },
      headStyles: { fillColor: [38, 40, 74], textColor: [220, 194, 130] },
      columnStyles: { 0: { fontStyle: "bold" } },
    });

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
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead className="text-center">Under 5</TableHead>
                <TableHead className="text-center">5+</TableHead>
                <TableHead className="text-center">Attendees</TableHead>
                <TableHead>T-Shirt</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Registered By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={16}
                    className="text-center py-8 text-muted-foreground">
                    No registrations found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r, i) => {
                  const isExpanded = expandedId === r.id;
                  const hasGuests = r.totalGuests > 0;

                  // Build guest list with age category
                  const guestDetails: { name: string; ageCategory: string }[] =
                    [];
                  if (hasGuests) {
                    const under5Count = r.guestsUnder5 || 0;
                    const above5Count = r.guests5AndAbove || 0;
                    const names = r.guestNames || [];

                    for (let g = 0; g < under5Count; g++) {
                      guestDetails.push({
                        name: names[g] || `Guest ${g + 1}`,
                        ageCategory: "Under 5",
                      });
                    }
                    for (let g = 0; g < above5Count; g++) {
                      guestDetails.push({
                        name:
                          names[under5Count + g] ||
                          `Guest ${under5Count + g + 1}`,
                        ageCategory: "5 and above",
                      });
                    }
                  }

                  return (
                    <Fragment key={r.id}>
                      <TableRow className={isExpanded ? "border-b-0" : ""}>
                        <TableCell className="w-8 px-2">
                          {hasGuests ? (
                            <button
                              onClick={() =>
                                setExpandedId(isExpanded ? null : r.id)
                              }
                              className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition"
                              title={
                                isExpanded ? "Hide guests" : "Show guests"
                              }>
                              {isExpanded ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronRight size={16} />
                              )}
                            </button>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {i + 1}
                        </TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-sm">{r.mobile}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.email || "-"}
                        </TableCell>
                        <TableCell>{r.batch}</TableCell>
                        <TableCell className="text-center">
                          {r.guestsUnder5 > 0 ? (
                            <button
                              onClick={() =>
                                setExpandedId(isExpanded ? null : r.id)
                              }
                              className="text-blue-400 hover:underline cursor-pointer">
                              {r.guestsUnder5}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.guests5AndAbove > 0 ? (
                            <button
                              onClick={() =>
                                setExpandedId(isExpanded ? null : r.id)
                              }
                              className="text-orange-400 hover:underline cursor-pointer">
                              {r.guests5AndAbove}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.totalAttendees}
                        </TableCell>
                        <TableCell>{r.tShirtSize || "-"}</TableCell>
                        <TableCell className="capitalize">
                          {r.paymentMethod || "-"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          &#x09F3;{r.amount}
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {r.registeredBy || "myself"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusColor[r.status] || ""}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {r.createdAt
                            ? new Date(r.createdAt).toLocaleDateString()
                            : "-"}
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

                      {/* Expanded guest details */}
                      {isExpanded && hasGuests && (
                        <TableRow className="bg-muted/20 hover:bg-muted/30">
                          <TableCell colSpan={17} className="py-3 px-6">
                            <div className="ml-6">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">
                                Guests ({guestDetails.length})
                              </p>
                              <table className="w-auto text-sm border border-border/50 rounded-lg overflow-hidden">
                                <thead>
                                  <tr className="bg-muted/40">
                                    <th className="px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground">
                                      #
                                    </th>
                                    <th className="px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground">
                                      Guest Name
                                    </th>
                                    <th className="px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground">
                                      Age Category
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {guestDetails.map((g, gi) => (
                                    <tr
                                      key={gi}
                                      className="border-t border-border/30">
                                      <td className="px-3 py-1.5 text-xs text-muted-foreground">
                                        {gi + 1}
                                      </td>
                                      <td className="px-3 py-1.5">{g.name}</td>
                                      <td className="px-3 py-1.5">
                                        <Badge
                                          variant="outline"
                                          className={
                                            g.ageCategory === "Under 5"
                                              ? "bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs"
                                              : "bg-orange-500/15 text-orange-400 border-orange-500/30 text-xs"
                                          }>
                                          {g.ageCategory}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRegistrations;
