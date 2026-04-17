"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user && user.role === "admin") {
      loadMessages();
    }
  }, [user, loading]);

  const loadMessages = async () => {
    try {
      const response = await fetch("/api/admin/messages");
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        toast.error("Failed to load messages");
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("An error occurred");
    } finally {
      setMessagesLoading(false);
    }
  };

  if (loading || messagesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-display font-bold mb-2">Messages</h1>
        <p className="text-muted-foreground text-lg">
          Manage contact form submissions
        </p>
      </div>

      {/* Messages List */}
      {messages.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No messages yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {messages.map((msg) => (
            <Card
              key={msg.id}
              className="border-border/50 hover:border-border/75 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{msg.subject}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      From: {msg.name} ({msg.email})
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80 whitespace-pre-wrap">
                  {msg.message}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
