"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  CheckCircle,
  Clock,
  CreditCard,
  Loader2,
  Ticket,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Ticket {
  id: string;
  userId: string;
  ticketId: string;
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "rejected";
  transactionId: string | null;
  amount: number;
  ticketGenerated?: boolean;
  ticketGeneratedAt?: string;
  approvedAt?: string;
  user: {
    name: string;
    email: string;
  };
  createdAt: string;
}

const AdminTicketApprovals = () => {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "paid" | "rejected" | "all">(
    "pending",
  );
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        filter === "all"
          ? "/api/admin/tickets"
          : `/api/admin/tickets?status=${filter}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      } else {
        toast.error("Failed to fetch tickets");
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      if (authLoading) return;

      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Check if current user is admin
      if (currentUser.role !== "admin") {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await fetchTickets();
    };

    checkAdminAndFetch();
  }, [currentUser, authLoading, fetchTickets]);

  const handleAction = async (
    ticketId: string,
    status: "paid" | "rejected",
  ) => {
    setActionLoading(ticketId);

    try {
      const response = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          status,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          status === "paid" ? "Ticket Approved!" : "Ticket Rejected",
        );
        await fetchTickets();
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Ticket className="h-12 w-12 mb-4 opacity-40" />
        <h2 className="font-heading text-xl font-semibold text-foreground mb-1">
          Access Denied
        </h2>
        <p>You need admin privileges to manage ticket approvals.</p>
      </div>
    );
  }

  const statusBadge = (status: string, ticketGenerated?: boolean) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="border-yellow-500/50 text-yellow-500">
            <Clock size={12} className="mr-1" />
            Pending
          </Badge>
        );
      case "paid":
        return ticketGenerated ? (
          <Badge
            variant="outline"
            className="border-purple-500/50 text-purple-500">
            <Ticket size={12} className="mr-1" />
            Generated
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-green-500/50 text-green-500">
            <CheckCircle size={12} className="mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="border-destructive/50 text-destructive">
            <XCircle size={12} className="mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStats = () => {
    const pending = tickets.filter((t) => t.paymentStatus === "pending").length;
    const approved = tickets.filter((t) => t.paymentStatus === "paid").length;
    const rejected = tickets.filter(
      (t) => t.paymentStatus === "rejected",
    ).length;
    const total = tickets.length;
    return { pending, approved, rejected, total };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold mb-2">
          Ticket Approvals
        </h1>
        <p className="text-muted-foreground">
          Review and approve pending payment submissions.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Tickets</p>
        </div>
        <div className="glass rounded-xl p-4 border-yellow-500/20">
          <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="glass rounded-xl p-4 border-green-500/20">
          <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </div>
        <div className="glass rounded-xl p-4 border-red-500/20">
          <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
          <p className="text-xs text-muted-foreground">Rejected</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["pending", "paid", "rejected", "all"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? "glow-gold-sm" : ""}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && (
              <span className="ml-2 text-xs">
                ({stats[f as keyof typeof stats]})
              </span>
            )}
          </Button>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-muted-foreground">
          <Ticket className="h-12 w-12 mx-auto mb-3 opacity-40" />
          No {filter === "all" ? "" : filter} tickets found.
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`glass rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all
                ${ticket.paymentStatus === "pending" ? "border-l-4 border-l-yellow-500" : ""}
              `}>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">
                    {ticket.user?.name || "Unknown"}
                  </span>
                  {statusBadge(ticket.paymentStatus, ticket.ticketGenerated)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {ticket.user?.email}
                </p>
                <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Ticket size={12} /> Ticket:{" "}
                    <span className="font-mono text-primary">
                      {ticket.ticketId}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <CreditCard size={12} /> Method:{" "}
                    {ticket.paymentMethod?.toUpperCase()}
                  </span>
                  {ticket.transactionId && (
                    <span>
                      TxnID:{" "}
                      <span className="font-mono">{ticket.transactionId}</span>
                    </span>
                  )}
                  <span>Amount: ${ticket.amount}</span>
                  <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {ticket.paymentStatus === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="glow-gold-sm"
                    disabled={actionLoading === ticket.id}
                    onClick={() => handleAction(ticket.id, "paid")}>
                    {actionLoading === ticket.id ? (
                      <Loader2 size={14} className="animate-spin mr-1" />
                    ) : (
                      <CheckCircle size={14} className="mr-1" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actionLoading === ticket.id}
                    onClick={() => handleAction(ticket.id, "rejected")}>
                    <XCircle size={14} className="mr-1" /> Reject
                  </Button>
                </div>
              )}

              {ticket.paymentStatus === "paid" && (
                <div className="shrink-0">
                  <Badge className="bg-green-500/10 text-green-500">
                    Approved by Admin
                  </Badge>
                </div>
              )}

              {ticket.paymentStatus === "rejected" && (
                <div className="shrink-0">
                  <Badge variant="destructive" className="bg-red-500/10">
                    Rejected
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTicketApprovals;
