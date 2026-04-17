"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Download,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Ticket {
  id: string;
  ticketId: string;
  paymentStatus: string;
  paymentMethod: string;
  amount: number;
  createdAt: string;
}

interface Profile {
  name: string;
  email: string;
  phone: string | null;
  religion?: string | null;
  category: "student" | "guest";
  batch: string | null;
  tshirtSize?: string | null;
}

const TicketPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      fetchTicketData();
    }
  }, [user, authLoading, router]);

  const fetchTicketData = async () => {
    try {
      // Fetch approved ticket
      const ticketRes = await fetch("/api/tickets?status=paid");
      const ticketsData = await ticketRes.json();

      const approvedTicket = ticketsData.find(
        (t: any) => t.paymentStatus === "paid",
      );

      if (!approvedTicket) {
        toast.error("No approved ticket found");
        router.push("/dashboard");
        return;
      }

      setTicket(approvedTicket);

      // Fetch user profile
      const profileRes = await fetch("/api/profile");
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }
    } catch (error) {
      console.error("Error fetching ticket data:", error);
      toast.error("Failed to load ticket data");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const exportAs = async (format: "png" | "pdf") => {
    if (!ticketRef.current || !ticket) {
      toast.error("Unable to generate ticket");
      return;
    }

    const toastId = toast.loading(`Generating ${format.toUpperCase()}...`);

    try {
      // Convert QR SVG to PNG data URL (html2canvas can't reliably render SVG)
      let qrPngUrl = "";
      const qrSvg = ticketRef.current.querySelector("svg");
      if (qrSvg) {
        const svgData = new XMLSerializer().serializeToString(qrSvg);
        const svgBlob = new Blob([svgData], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        });
        const c = document.createElement("canvas");
        c.width = 260;
        c.height = 260;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ede8dd";
          ctx.fillRect(0, 0, 260, 260);
          ctx.drawImage(img, 0, 0, 260, 260);
          qrPngUrl = c.toDataURL("image/png");
        }
        URL.revokeObjectURL(url);
      }

      const catLabel =
        profile?.category === "guest"
          ? "Guest"
          : `Student – Batch ${profile?.batch || "N/A"}`;
      const bgDark = "#0b1120";
      const bgCard = "#111827";
      const gold = "#c9952b";
      const textMain = "#ede8dd";
      const textMuted = "#7b839a";
      const catBg =
        profile?.category === "guest"
          ? "rgba(220,80,100,0.2)"
          : "rgba(201,149,43,0.2)";
      const catColor = profile?.category === "guest" ? "#e08090" : "#dbb96a";
      const catBorder =
        profile?.category === "guest"
          ? "rgba(220,80,100,0.3)"
          : "rgba(201,149,43,0.3)";

      // Build standalone HTML with only hex/rgba — no hsl(), no lab(), no Tailwind
      const html = `<!DOCTYPE html><html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:${bgDark};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.t{width:480px;border-radius:16px;overflow:hidden;border:1px solid rgba(201,149,43,0.25);background:linear-gradient(135deg,${bgDark},${bgCard})}
.hd{padding:24px;text-align:center;background:linear-gradient(135deg,rgba(201,149,43,0.15),rgba(201,149,43,0.05));border-bottom:1px solid rgba(201,149,43,0.15)}
.badge{display:inline-block;padding:6px 16px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;background:${catBg};color:${catColor};border:1px solid ${catBorder};margin-bottom:12px}
.title{font-size:24px;font-weight:700;color:${gold};font-family:Georgia,serif}
.tear{position:relative;height:2px;border-top:2px dashed rgba(201,149,43,0.2)}
.tear-dot{position:absolute;top:-8px;width:16px;height:16px;border-radius:50%;background:${bgDark}}
.tear-l{left:-8px}.tear-r{right:-8px}
.body{padding:24px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.f{display:flex;gap:8px;align-items:flex-start}
.fi{color:${gold};flex-shrink:0;margin-top:2px;font-size:14px;width:14px;height:14px}
.fl{font-size:11px;color:${textMuted}}
.fv{font-size:13px;font-weight:600;color:${textMain};margin-top:2px;word-break:break-word}
.tid{text-align:center;margin-top:20px}
.tid-l{font-size:11px;color:${textMuted}}
.tid-v{font-size:18px;font-family:"Courier New",monospace;font-weight:700;color:${gold};margin-top:4px;letter-spacing:2px}
.qr{display:flex;justify-content:center;padding:16px 0}
.qrb{padding:12px;border-radius:12px;background:#ede8dd}
.qrb img{display:block;width:130px;height:130px;image-rendering:pixelated}
.foot{text-align:center;font-size:11px;color:${textMuted};padding-bottom:8px}
</style></head><body><div class="t">
<div class="hd"><div class="badge">${catLabel}</div><div class="title">Grand Reunion 2026</div></div>
<div class="tear"><div class="tear-dot tear-l"></div><div class="tear-dot tear-r"></div></div>
<div class="body">
<div class="grid">
<div class="f"><svg class="fi" viewBox="0 0 24 24" fill="none" stroke="${gold}" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><div><div class="fl">Attendee</div><div class="fv">${profile?.name || "Guest"}</div></div></div>
<div class="f"><svg class="fi" viewBox="0 0 24 24" fill="none" stroke="${gold}" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg><div><div class="fl">Email</div><div class="fv" style="font-size:11px">${profile?.email || ""}</div></div></div>
<div class="f"><svg class="fi" viewBox="0 0 24 24" fill="none" stroke="${gold}" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg><div><div class="fl">Mobile</div><div class="fv">${profile?.phone || "—"}</div></div></div>
<div class="f"><svg class="fi" viewBox="0 0 24 24" fill="none" stroke="${gold}" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg><div><div class="fl">Religion</div><div class="fv">${profile?.religion || "—"}</div></div></div>
<div class="f"><svg class="fi" viewBox="0 0 24 24" fill="none" stroke="${gold}" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><div><div class="fl">Date</div><div class="fv">Dec 20, 2026</div></div></div>
<div class="f"><svg class="fi" viewBox="0 0 24 24" fill="none" stroke="${gold}" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><div><div class="fl">Venue</div><div class="fv">Goonvari B. L. High School, Fulchari, Gaibandha</div></div></div>
</div>
<div class="tid"><div class="tid-l">Ticket ID</div><div class="tid-v">${ticket.ticketId}</div></div>
<div class="qr"><div class="qrb">${qrPngUrl ? `<img src="${qrPngUrl}"/>` : ""}</div></div>
<div class="foot">Present this QR code at the entrance for check-in</div>
</div></div></body></html>`;

      // Render in hidden iframe — zero Tailwind, zero lab()
      const iframe = document.createElement("iframe");
      iframe.style.cssText =
        "position:fixed;left:-10000px;top:-10000px;width:520px;height:960px;border:none";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) throw new Error("Could not access iframe");
      doc.open();
      doc.write(html);
      doc.close();

      await new Promise((r) => setTimeout(r, 800));

      const el = doc.querySelector(".t") as HTMLElement;
      if (!el) throw new Error("Ticket not found");

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: bgDark,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 15000,
      });

      document.body.removeChild(iframe);

      const imgData = canvas.toDataURL("image/png", 0.95);
      const filename = `ticket-${ticket.ticketId}`;

      if (format === "png") {
        const link = document.createElement("a");
        link.download = `${filename}.png`;
        link.href = imgData;
        link.click();
        toast.dismiss(toastId);
        toast.success("Ticket downloaded as PNG");
      } else {
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });
        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        const m = 5;
        const iw = pw - 2 * m;
        const ih = (canvas.height * iw) / canvas.width;
        if (ih > ph) {
          const s = ph / ih;
          pdf.addImage(imgData, "PNG", m, m, iw * s, ph - 2 * m);
        } else {
          pdf.addImage(imgData, "PNG", m, m, iw, ih);
        }
        pdf.save(`${filename}.pdf`);
        toast.dismiss(toastId);
        toast.success("Ticket downloaded as PDF");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.dismiss(toastId);
      toast.error("Failed to generate ticket image");
    }
  };

  const categoryLabel =
    profile?.category === "guest"
      ? "Guest"
      : `Student – Batch ${profile?.batch || "N/A"}`;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !ticket) {
    return null;
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-background">
      <div className="container mx-auto max-w-lg">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="font-heading text-2xl font-bold text-gradient-gold">
            Reunion 2026
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <ArrowLeft size={14} /> Dashboard
          </Link>
        </div>

        {/* Ticket card — this div is captured for export */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}>
          <div
            ref={ticketRef}
            className="rounded-2xl overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, hsl(222 47% 11%), hsl(222 40% 16%))",
              border: "1px solid hsl(38 90% 55% / 0.25)",
            }}>
            {/* Badge / Header */}
            <div
              className="p-6 text-center"
              style={{
                background:
                  "linear-gradient(135deg, hsl(38 90% 55% / 0.15), hsl(38 90% 55% / 0.05))",
                borderBottom: "1px solid hsl(38 90% 55% / 0.15)",
              }}>
              <span
                className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3"
                style={{
                  background:
                    profile?.category === "guest"
                      ? "hsl(350 70% 60% / 0.2)"
                      : "hsl(38 90% 55% / 0.2)",
                  color:
                    profile?.category === "guest"
                      ? "hsl(350 70% 70%)"
                      : "hsl(38 90% 65%)",
                  border: `1px solid ${profile?.category === "guest" ? "hsl(350 70% 60% / 0.3)" : "hsl(38 90% 55% / 0.3)"}`,
                }}>
                {categoryLabel}
              </span>
              <h1
                className="text-2xl font-bold"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  background:
                    "linear-gradient(135deg, hsl(38 90% 55%), hsl(40 85% 70%))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                Grand Reunion 2026
              </h1>
            </div>

            {/* Tear line */}
            <div className="relative">
              <div
                className="absolute left-0 top-0 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: "hsl(222 47% 6%)" }}
              />
              <div
                className="absolute right-0 top-0 w-4 h-4 translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: "hsl(222 47% 6%)" }}
              />
              <div style={{ borderTop: "2px dashed hsl(38 90% 55% / 0.2)" }} />
            </div>

            {/* Details */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <User
                    size={14}
                    style={{ color: "hsl(38 90% 55%)", marginTop: 2 }}
                  />
                  <div>
                    <p style={{ color: "hsl(220 15% 55%)", fontSize: 11 }}>
                      Attendee
                    </p>
                    <p
                      className="font-semibold"
                      style={{ color: "hsl(40 33% 92%)" }}>
                      {profile?.name || "Guest"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail
                    size={14}
                    style={{ color: "hsl(38 90% 55%)", marginTop: 2 }}
                  />
                  <div>
                    <p style={{ color: "hsl(220 15% 55%)", fontSize: 11 }}>
                      Email
                    </p>
                    <p
                      className="font-semibold text-xs"
                      style={{ color: "hsl(40 33% 92%)" }}>
                      {profile?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone
                    size={14}
                    style={{ color: "hsl(38 90% 55%)", marginTop: 2 }}
                  />
                  <div>
                    <p style={{ color: "hsl(220 15% 55%)", fontSize: 11 }}>
                      Mobile
                    </p>
                    <p
                      className="font-semibold"
                      style={{ color: "hsl(40 33% 92%)" }}>
                      {profile?.phone || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <BookOpen
                    size={14}
                    style={{ color: "hsl(38 90% 55%)", marginTop: 2 }}
                  />
                  <div>
                    <p style={{ color: "hsl(220 15% 55%)", fontSize: 11 }}>
                      Religion
                    </p>
                    <p
                      className="font-semibold"
                      style={{ color: "hsl(40 33% 92%)" }}>
                      {profile?.religion || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar
                    size={14}
                    style={{ color: "hsl(38 90% 55%)", marginTop: 2 }}
                  />
                  <div>
                    <p style={{ color: "hsl(220 15% 55%)", fontSize: 11 }}>
                      Date
                    </p>
                    <p
                      className="font-semibold"
                      style={{ color: "hsl(40 33% 92%)" }}>
                      Dec 20, 2026
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin
                    size={14}
                    style={{ color: "hsl(38 90% 55%)", marginTop: 2 }}
                  />
                  <div>
                    <p style={{ color: "hsl(220 15% 55%)", fontSize: 11 }}>
                      Venue
                    </p>
                    <p
                      className="font-semibold"
                      style={{ color: "hsl(40 33% 92%)" }}>
                      Goonvari B. L. High School, Fulchari, Gaibandha
                    </p>
                  </div>
                </div>
              </div>

              {/* Ticket ID */}
              <div className="text-center">
                <p style={{ color: "hsl(220 15% 55%)", fontSize: 11 }}>
                  Ticket ID
                </p>
                <p
                  className="font-mono text-lg font-bold"
                  style={{ color: "hsl(38 90% 55%)" }}>
                  {ticket?.ticketId}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center py-2">
                <div
                  className="p-3 rounded-xl"
                  style={{ background: "hsl(40 33% 92%)" }}>
                  <QRCodeSVG
                    value={`${process.env.NEXT_PUBLIC_APP_URL || "https://gvblhs-reunion.vercel.app"}/verify/${ticket?.ticketId}`}
                    size={130}
                    bgColor="#ede8dd"
                    fgColor="#0b1120"
                  />
                </div>
              </div>

              <p
                className="text-center text-xs"
                style={{ color: "hsl(220 15% 55%)" }}>
                Present this QR code at the entrance for check-in
              </p>
            </div>
          </div>
        </motion.div>

        {/* Export buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => exportAs("png")}>
            <Download size={16} className="mr-2" /> Download PNG
          </Button>
          <Button
            className="flex-1 glow-gold-sm"
            onClick={() => exportAs("pdf")}>
            <Download size={16} className="mr-2" /> Download PDF
          </Button>
        </div>

        {/* Share instructions */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Save your ticket or take a screenshot. You'll need this for entry.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TicketPage;
