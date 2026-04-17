"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  CheckCircle,
  Clock,
  Mail,
  Reply,
  ShieldAlert,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: "unread" | "read" | "replied";
  createdAt: string;
}

const AdminMessages = () => {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
      await fetchMessages();
    };

    checkAdminAndFetch();
  }, [user, authLoading]);

  const fetchMessages = async () => {
    try {
      const response = await fetch("/api/admin/messages");
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        toast.error("Failed to fetch messages");
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    setActionLoading(messageId);
    try {
      const response = await fetch(`/api/admin/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "read" }),
      });

      if (response.ok) {
        setMessages(
          messages.map((msg) =>
            msg.id === messageId ? { ...msg, status: "read" } : msg,
          ),
        );
        toast.success("Message marked as read");
      } else {
        toast.error("Failed to update message");
      }
    } catch (error) {
      console.error("Error updating message:", error);
      toast.error("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    setActionLoading(messageId);
    try {
      const response = await fetch(`/api/admin/messages/${messageId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessages(messages.filter((msg) => msg.id !== messageId));
        toast.success("Message deleted successfully");
      } else {
        toast.error("Failed to delete message");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unread":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/30">
            Unread
          </Badge>
        );
      case "read":
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">
            Read
          </Badge>
        );
      case "replied":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
            Replied
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
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

  const unreadCount = messages.filter((m) => m.status === "unread").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">
          Contact Messages
        </h2>
        <p className="text-muted-foreground mt-1">
          {messages.length} message{messages.length !== 1 ? "s" : ""} received
          {unreadCount > 0 && ` (${unreadCount} unread)`}
        </p>
      </div>

      {messages.length === 0 ? (
        <Card className="glass border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Mail className="h-10 w-10 mb-3 opacity-40" />
            <p>No messages yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <Card
              key={msg.id}
              className={`glass border-border/50 transition-all ${
                msg.status === "unread" ? "border-l-4 border-l-primary" : ""
              }`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg font-semibold truncate">
                        {msg.subject || "(No subject)"}
                      </CardTitle>
                      {getStatusBadge(msg.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" /> {msg.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" /> {msg.email}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </Badge>
                    {msg.status === "unread" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => markAsRead(msg.id)}
                        disabled={actionLoading === msg.id}
                        className="h-8 w-8">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMessage(msg.id)}
                      disabled={actionLoading === msg.id}
                      className="h-8 w-8 text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                  {msg.message}
                </p>
                {msg.status === "unread" && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        (window.location.href = `mailto:${msg.email}?subject=Re: ${msg.subject || "Your message"}`)
                      }>
                      <Reply className="h-3.5 w-3.5 mr-1.5" />
                      Reply via Email
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminMessages;
