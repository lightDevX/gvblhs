"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Download,
  Edit,
  FileText,
  Minus,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
  rejectionReason: string | null;
  createdAt: string;
}

interface EditFormData {
  name: string;
  mobile: string;
  email: string;
  batch: string;
  religion: string;
  tShirtSize: string;
  paymentMethod: string;
  transactionId: string;
  registeredBy: string;
  guestsUnder5: number;
  guests5AndAbove: number;
  guestNames: string[];
}

const BATCHES = Array.from({ length: 11 }, (_, i) => String(2000 + i));
const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const PAYMENT_METHODS = [
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "rocket", label: "Rocket" },
  { value: "bank", label: "Bank" },
  { value: "manual", label: "Manual" },
];
const PRICE_PER_MEMBER = 800;
const PRICE_PER_GUEST_5PLUS = 500;

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

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [editForm, setEditForm] = useState<EditFormData | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Confirm dialogs
  const [confirmAction, setConfirmAction] = useState<{
    type: "reject" | "delete" | "restore" | "deleteGuest";
    reg: Registration;
    guestIndex?: number;
    reason?: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      fetchRegistrations();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchRegistrations = useCallback(async () => {
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
  }, []);

  const updateStatus = async (
    id: string,
    status: string,
    rejectionReason?: string,
  ) => {
    setUpdatingId(id);
    try {
      const payload: Record<string, string> = { id, status };
      if (rejectionReason) payload.rejectionReason = rejectionReason;

      const res = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status,
                  rejectionReason:
                    status === "rejected" ? (rejectionReason ?? null) : null,
                }
              : r,
          ),
        );
        const label =
          status === "pending"
            ? "restored to pending"
            : status === "approved"
              ? "approved"
              : "rejected";
        toast.success(`Registration ${label}`);
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

  const deleteRegistration = async (id: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/registrations?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRegistrations((prev) => prev.filter((r) => r.id !== id));
        toast.success("Registration deleted");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setUpdatingId(null);
    }
  };

  // --- Edit modal helpers ---
  const openEdit = (reg: Registration) => {
    setEditingReg(reg);
    setEditForm({
      name: reg.name,
      mobile: reg.mobile,
      email: reg.email || "",
      batch: reg.batch,
      religion: reg.religion || "",
      tShirtSize: reg.tShirtSize || "",
      paymentMethod: reg.paymentMethod || "",
      transactionId: reg.transactionId || "",
      registeredBy: reg.registeredBy || "",
      guestsUnder5: reg.guestsUnder5,
      guests5AndAbove: reg.guests5AndAbove,
      guestNames: [
        ...reg.guestNames,
        ...Array(
          Math.max(
            0,
            reg.guestsUnder5 + reg.guests5AndAbove - reg.guestNames.length,
          ),
        ).fill(""),
      ],
    });
    setEditOpen(true);
  };

  const updateEditField = (field: string, value: string | number) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateGuestCount = (
    field: "guestsUnder5" | "guests5AndAbove",
    delta: number,
  ) => {
    setEditForm((prev) => {
      if (!prev) return prev;
      const next = Math.max(0, Math.min(50, prev[field] + delta));
      const updated = { ...prev, [field]: next };
      const newTotal = updated.guestsUnder5 + updated.guests5AndAbove;
      const names = [...updated.guestNames];
      while (names.length < newTotal) names.push("");
      if (names.length > newTotal) names.length = newTotal;
      return { ...updated, guestNames: names };
    });
  };

  const updateGuestName = (index: number, value: string) => {
    setEditForm((prev) => {
      if (!prev) return prev;
      const names = [...prev.guestNames];
      names[index] = value;
      return { ...prev, guestNames: names };
    });
  };

  const removeGuest = (index: number) => {
    setEditForm((prev) => {
      if (!prev) return prev;
      const totalGuests = prev.guestsUnder5 + prev.guests5AndAbove;
      if (totalGuests <= 0) return prev;

      const names = [...prev.guestNames];
      names.splice(index, 1);

      // Determine which category the guest belonged to
      const isUnder5 = index < prev.guestsUnder5;
      return {
        ...prev,
        guestsUnder5: isUnder5 ? prev.guestsUnder5 - 1 : prev.guestsUnder5,
        guests5AndAbove: isUnder5
          ? prev.guests5AndAbove
          : prev.guests5AndAbove - 1,
        guestNames: names,
      };
    });
  };

  const saveEdit = async () => {
    if (!editForm || !editingReg) return;
    if (!editForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!editForm.mobile.trim()) {
      toast.error("Mobile is required");
      return;
    }
    if (!editForm.batch) {
      toast.error("Batch is required");
      return;
    }
    if (!editForm.tShirtSize) {
      toast.error("T-Shirt size is required");
      return;
    }
    if (!editForm.paymentMethod) {
      toast.error("Payment method is required");
      return;
    }

    setEditSaving(true);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingReg.id,
          name: editForm.name,
          mobile: editForm.mobile,
          email: editForm.email || null,
          batch: editForm.batch,
          religion: editForm.religion || null,
          tShirtSize: editForm.tShirtSize,
          paymentMethod: editForm.paymentMethod,
          transactionId: editForm.transactionId || null,
          registeredBy: editForm.registeredBy || null,
          guestsUnder5: editForm.guestsUnder5,
          guests5AndAbove: editForm.guests5AndAbove,
          guestNames: editForm.guestNames,
        }),
      });

      const data = await res.json();
      if (res.ok && data.registration) {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === editingReg.id ? data.registration : r)),
        );
        toast.success("Registration updated");
        setEditOpen(false);
        setEditingReg(null);
        setEditForm(null);
      } else {
        toast.error(data.error || "Failed to update");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setEditSaving(false);
    }
  };

  // --- Confirm action handler ---
  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, reg } = confirmAction;

    if (type === "reject") {
      await updateStatus(reg.id, "rejected", rejectReason || undefined);
    } else if (type === "restore") {
      await updateStatus(reg.id, "pending");
    } else if (type === "delete") {
      await deleteRegistration(reg.id);
    } else if (
      type === "deleteGuest" &&
      confirmAction.guestIndex !== undefined
    ) {
      removeGuest(confirmAction.guestIndex);
    }

    setConfirmAction(null);
    setRejectReason("");
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

  // --- Summary counts ---
  const counts = useMemo(() => {
    const c = {
      all: registrations.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const r of registrations) {
      if (r.status === "pending") c.pending++;
      else if (r.status === "approved") c.approved++;
      else if (r.status === "rejected") c.rejected++;
    }
    return c;
  }, [registrations]);

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

  // --- Edit form computed values ---
  const editTotalGuests = editForm
    ? editForm.guestsUnder5 + editForm.guests5AndAbove
    : 0;
  const editAmount = editForm
    ? PRICE_PER_MEMBER + editForm.guests5AndAbove * PRICE_PER_GUEST_5PLUS
    : 0;

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
      {/* Header */}
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

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "all", label: "All", count: counts.all },
            { key: "pending", label: "Pending", count: counts.pending },
            { key: "approved", label: "Approved", count: counts.approved },
            { key: "rejected", label: "Rejected", count: counts.rejected },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.key}
            variant={statusFilter === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(tab.key)}
            className="gap-1.5">
            {tab.label}
            <Badge
              variant="secondary"
              className="ml-0.5 text-xs px-1.5 min-w-5 justify-center">
              {tab.count}
            </Badge>
          </Button>
        ))}
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
                          {r.status === "rejected" && r.rejectionReason && (
                            <p
                              className="text-xs text-red-400/70 mt-0.5 max-w-30 truncate"
                              title={r.rejectionReason}>
                              {r.rejectionReason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {r.createdAt
                            ? new Date(r.createdAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end flex-wrap">
                            {/* Edit */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                              onClick={() => openEdit(r)}
                              disabled={updatingId === r.id}
                              title="Edit">
                              <Edit size={15} />
                            </Button>

                            {/* Approve */}
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

                            {/* Reject (with confirmation) */}
                            {r.status !== "rejected" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                onClick={() =>
                                  setConfirmAction({ type: "reject", reg: r })
                                }
                                disabled={updatingId === r.id}
                                title="Reject">
                                <XCircle size={15} />
                              </Button>
                            )}

                            {/* Restore (for rejected) */}
                            {r.status === "rejected" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                                onClick={() =>
                                  setConfirmAction({ type: "restore", reg: r })
                                }
                                disabled={updatingId === r.id}
                                title="Restore to Pending">
                                <RotateCcw size={15} />
                              </Button>
                            )}

                            {/* Delete (with confirmation) */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-500/60 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() =>
                                setConfirmAction({ type: "delete", reg: r })
                              }
                              disabled={updatingId === r.id}
                              title="Delete">
                              <Trash2 size={15} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded guest details */}
                      {isExpanded && hasGuests && (
                        <TableRow className="bg-muted/20 hover:bg-muted/30">
                          <TableCell colSpan={16} className="py-3 px-6">
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

      {/* ========== EDIT REGISTRATION DIALOG ========== */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditOpen(false);
            setEditingReg(null);
            setEditForm(null);
          }
        }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Registration</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4">
              {/* Name & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => updateEditField("name", e.target.value)}
                    disabled={editSaving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mobile *</Label>
                  <Input
                    value={editForm.mobile}
                    onChange={(e) => updateEditField("mobile", e.target.value)}
                    disabled={editSaving}
                  />
                </div>
              </div>

              {/* Email & Batch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => updateEditField("email", e.target.value)}
                    disabled={editSaving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Batch *</Label>
                  <Select
                    value={editForm.batch}
                    onValueChange={(v) => updateEditField("batch", v)}
                    disabled={editSaving}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BATCHES.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* T-shirt & Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>T-Shirt Size *</Label>
                  <Select
                    value={editForm.tShirtSize}
                    onValueChange={(v) => updateEditField("tShirtSize", v)}
                    disabled={editSaving}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TSHIRT_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Method *</Label>
                  <Select
                    value={editForm.paymentMethod}
                    onValueChange={(v) => updateEditField("paymentMethod", v)}
                    disabled={editSaving}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Transaction ID & Registered By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Transaction ID</Label>
                  <Input
                    value={editForm.transactionId}
                    onChange={(e) =>
                      updateEditField("transactionId", e.target.value)
                    }
                    disabled={editSaving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Registered By</Label>
                  <Input
                    value={editForm.registeredBy}
                    onChange={(e) =>
                      updateEditField("registeredBy", e.target.value)
                    }
                    disabled={editSaving}
                  />
                </div>
              </div>

              {/* Religion */}
              <div className="space-y-1.5">
                <Label>Religion</Label>
                <Input
                  value={editForm.religion}
                  onChange={(e) => updateEditField("religion", e.target.value)}
                  disabled={editSaving}
                  placeholder="Optional"
                />
              </div>

              {/* Guest management */}
              <div className="border border-border/50 rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-sm">Guest Management</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Guests Under 5 (Free)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateGuestCount("guestsUnder5", -1)}
                        disabled={editSaving || editForm.guestsUnder5 <= 0}>
                        <Minus size={14} />
                      </Button>
                      <span className="w-8 text-center font-mono">
                        {editForm.guestsUnder5}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateGuestCount("guestsUnder5", 1)}
                        disabled={editSaving}>
                        <Plus size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Guests 5+ (&#x09F3;{PRICE_PER_GUEST_5PLUS} each)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateGuestCount("guests5AndAbove", -1)}
                        disabled={editSaving || editForm.guests5AndAbove <= 0}>
                        <Minus size={14} />
                      </Button>
                      <span className="w-8 text-center font-mono">
                        {editForm.guests5AndAbove}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateGuestCount("guests5AndAbove", 1)}
                        disabled={editSaving}>
                        <Plus size={14} />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Guest names */}
                {editTotalGuests > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Guest Names ({editTotalGuests})
                    </Label>
                    {editForm.guestNames.map((name, gi) => {
                      const isUnder5 = gi < editForm.guestsUnder5;
                      return (
                        <div key={gi} className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              isUnder5
                                ? "bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs shrink-0"
                                : "bg-orange-500/15 text-orange-400 border-orange-500/30 text-xs shrink-0"
                            }>
                            {isUnder5 ? "<5" : "5+"}
                          </Badge>
                          <Input
                            value={name}
                            onChange={(e) =>
                              updateGuestName(gi, e.target.value)
                            }
                            placeholder={`Guest ${gi + 1} name`}
                            className="h-8 text-sm"
                            disabled={editSaving}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500/60 hover:text-red-400 shrink-0"
                            onClick={() =>
                              setConfirmAction({
                                type: "deleteGuest",
                                reg: editingReg!,
                                guestIndex: gi,
                              })
                            }
                            disabled={editSaving}
                            title="Remove guest">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Amount summary */}
                <div className="text-sm text-muted-foreground pt-2 border-t border-border/30">
                  Total attendees:{" "}
                  <span className="font-semibold text-foreground">
                    {1 + editTotalGuests}
                  </span>{" "}
                  | Amount:{" "}
                  <span className="font-semibold text-foreground">
                    &#x09F3;{editAmount}
                  </span>
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={editSaving}>
                  Cancel
                </Button>
                <Button onClick={saveEdit} disabled={editSaving}>
                  {editSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== CONFIRMATION DIALOGS ========== */}

      {/* Reject confirmation */}
      <AlertDialog
        open={confirmAction?.type === "reject"}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null);
            setRejectReason("");
          }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Registration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject the registration for{" "}
              <strong>{confirmAction?.reg.name}</strong>? The registration data
              will be preserved and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-sm">Rejection Reason (optional)</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter a reason for rejection..."
              rows={3}
              maxLength={500}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={executeConfirmAction}>
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore confirmation */}
      <AlertDialog
        open={confirmAction?.type === "restore"}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Registration</AlertDialogTitle>
            <AlertDialogDescription>
              Restore <strong>{confirmAction?.reg.name}</strong>&apos;s
              registration back to pending status?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeConfirmAction}>
              Restore to Pending
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={confirmAction?.type === "delete"}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Registration</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{confirmAction?.reg.name}</strong>&apos;s registration and
              all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={executeConfirmAction}>
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete guest confirmation */}
      <AlertDialog
        open={confirmAction?.type === "deleteGuest"}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Guest</AlertDialogTitle>
            <AlertDialogDescription>
              Remove this guest from the registration? The guest count and
              amount will be recalculated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={executeConfirmAction}>
              Remove Guest
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminRegistrations;
