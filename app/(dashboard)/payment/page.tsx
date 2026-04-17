"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle,
  Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const paymentMethods = [
  {
    id: "mfs",
    label: "MFS",
    icon: Smartphone,
    description: "Mobile Financial Services (bKash, Nagad, Rocket, etc.)",
    placeholder: "Enter MFS transaction ID",
  },
  {
    id: "bank",
    label: "Bank Transfer",
    icon: Building2,
    description: "Direct bank transfer to our account",
    placeholder: "Enter bank transaction/reference ID",
  },
  {
    id: "manual",
    label: "Manual Payment",
    icon: CheckCircle,
    description: "Arrange payment manually with organizers",
    placeholder: "Optional: Add any notes here",
  },
];

const PaymentPage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Calculate ticket price based on new guest model
  const getTicketPrice = () => {
    if (!user) return 800;

    const guestsUnder5 = (user as any).guestsUnder5 || 0;
    const guests5AndAbove = (user as any).guests5AndAbove || 0;

    // Batch member: ৳800, guests under 5: free, guests 5+: ৳500 each
    return 800 + guestsUnder5 * 0 + guests5AndAbove * 500;
  };

  const ticketPrice = getTicketPrice();

  const handleSubmitPayment = async () => {
    if (!user) {
      toast.error("Please login to continue");
      router.push("/login");
      return;
    }

    if (!selectedMethod) {
      toast.error("Please select a payment method");
      return;
    }

    // Transaction ID is required for MFS and Bank, optional for Manual
    if (selectedMethod !== "manual" && !transactionId.trim()) {
      toast.error("Please enter your transaction ID");
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: selectedMethod,
          transactionId: transactionId.trim() || null,
          amount: ticketPrice,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast.success("Payment submitted successfully!", {
          description:
            "Admin will review your payment within 24-48 hours. You can check the status in My Ticket page.",
        });
      } else {
        toast.error(data.error || "Payment submission failed");
      }
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="font-heading text-xl font-semibold mb-2">
          Authentication Required
        </h2>
        <p className="text-muted-foreground mb-4">
          Please login to make a payment
        </p>
        <Button onClick={() => router.push("/login")}>Login Now</Button>
      </div>
    );
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto">
        <div className="glass-gold rounded-2xl p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-2">
            <CheckCircle size={32} className="text-primary" />
          </div>
          <h2 className="font-heading text-2xl font-bold">
            Payment Submitted!
          </h2>
          <p className="text-muted-foreground">
            Your payment is pending admin approval. Once approved, you can
            generate your ticket from the{" "}
            <span className="font-semibold">My Ticket</span> page.
          </p>
          <div className="space-y-2">
            <Button
              className="glow-gold-sm w-full"
              onClick={() => router.push("/ticket")}>
              Go to My Ticket <ArrowRight size={16} className="ml-2" />
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold mb-2">Make Payment</h1>
        <p className="text-muted-foreground">
          Choose your preferred payment method and enter the transaction ID.
        </p>
      </div>

      {/* Payment method selection */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Select Payment Method</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => {
                setSelectedMethod(method.id);
                setTransactionId("");
              }}
              className={`glass rounded-xl p-5 text-left transition-all duration-300 ${
                selectedMethod === method.id
                  ? "glass-gold ring-1 ring-primary/40 glow-gold-sm"
                  : "hover:bg-secondary/60"
              }`}>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedMethod === method.id
                      ? "bg-primary/20"
                      : "bg-secondary"
                  }`}>
                  <method.icon
                    size={20}
                    className={
                      selectedMethod === method.id
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                  />
                </div>
                <h3 className="font-semibold text-sm">{method.label}</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {method.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Transaction ID input */}
      {selectedMethod && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-3">
          <div className="glass-gold rounded-xl p-6 space-y-4">
            {selectedMethod !== "manual" && (
              <div className="space-y-2">
                <Label htmlFor="txn" className="font-semibold">
                  Transaction ID / Reference Number
                </Label>
                <Input
                  id="txn"
                  placeholder={
                    paymentMethods.find((m) => m.id === selectedMethod)
                      ?.placeholder
                  }
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="bg-background/50"
                  disabled={processing}
                />
                <p className="text-xs text-muted-foreground">
                  {selectedMethod === "bank"
                    ? "Enter your bank transaction reference or confirmation number."
                    : "Enter your MFS transaction ID from your mobile banking app."}
                </p>
              </div>
            )}

            {selectedMethod === "manual" && (
              <div className="space-y-2">
                <Label htmlFor="notes" className="font-semibold">
                  Notes (Optional)
                </Label>
                <Input
                  id="notes"
                  placeholder="Add any additional information (optional)"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="bg-background/50"
                  disabled={processing}
                />
                <p className="text-xs text-muted-foreground">
                  For manual payment, an organizer will contact you to arrange
                  payment collection.
                </p>
              </div>
            )}

            <div className="bg-primary/5 rounded-lg p-3">
              <p className="text-sm font-medium mb-1">Payment Details:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Batch Member: ৳800</li>
                {(user as any).guestsUnder5 > 0 && (
                  <li>
                    • Guests Under 5: {(user as any).guestsUnder5} × ৳0 (Free)
                  </li>
                )}
                {(user as any).guests5AndAbove > 0 && (
                  <li>• Guests 5+: {(user as any).guests5AndAbove} × ৳500</li>
                )}
                <li className="font-semibold text-foreground">
                  • Total Amount: ৳{ticketPrice}
                </li>
                <li>
                  •{" "}
                  {selectedMethod === "manual"
                    ? "Payment method: Manual arrangement"
                    : "Processing Time: 24-48 hours"}
                </li>
                <li>• You'll receive a confirmation email once approved</li>
              </ul>
            </div>

            <Button
              className="w-full glow-gold-sm"
              onClick={handleSubmitPayment}
              disabled={
                processing ||
                (selectedMethod !== "manual" && !transactionId.trim())
              }>
              {processing ? "Submitting..." : "Submit Payment"}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Help section */}
      <div className="glass rounded-xl p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Need help?{" "}
          <button
            onClick={() => router.push("/contact")}
            className="text-primary hover:underline font-medium">
            Contact Support
          </button>
        </p>
      </div>
    </motion.div>
  );
};

export default PaymentPage;
