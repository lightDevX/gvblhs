"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { CheckCircle, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

const RELIGIONS = ["Islam", "Hindu", "Christian", "Buddhist", "Custom"];
const BATCHES = Array.from({ length: 11 }, (_, i) => String(2000 + i));
const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const PAYMENT_METHODS = [{ value: "manual", label: "Manual Payment" }];

const PRICE_PER_MEMBER = 800;
const PRICE_PER_GUEST_5PLUS = 500;

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    batch: "",
    religion: "",
    customReligion: "",
    tShirtSize: "",
    paymentMethod: "",
    guestsUnder5: 0,
    guests5AndAbove: 0,
    guestNames: [] as string[],
  });

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const updateCount = (
    field: "guestsUnder5" | "guests5AndAbove",
    delta: number,
  ) => {
    setFormData((prev) => {
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
    setFormData((prev) => {
      const names = [...prev.guestNames];
      names[index] = value;
      return { ...prev, guestNames: names };
    });
  };

  const totalGuests = formData.guestsUnder5 + formData.guests5AndAbove;
  const totalAttendees = 1 + totalGuests;
  const totalPrice =
    PRICE_PER_MEMBER + formData.guests5AndAbove * PRICE_PER_GUEST_5PLUS;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!formData.mobile.trim()) {
      toast.error("Mobile number is required");
      return;
    }
    if (!formData.batch) {
      toast.error("Batch year is required");
      return;
    }
    if (!formData.tShirtSize) {
      toast.error("T-Shirt size is required");
      return;
    }
    if (!formData.paymentMethod) {
      toast.error("Payment method is required");
      return;
    }
    if (formData.religion === "Custom" && !formData.customReligion.trim()) {
      toast.error("Please enter your religion");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          mobile: formData.mobile,
          email: formData.email || undefined,
          batch: formData.batch,
          religion: formData.religion || undefined,
          customReligion: formData.customReligion || undefined,
          tShirtSize: formData.tShirtSize,
          paymentMethod: formData.paymentMethod,
          guestsUnder5: formData.guestsUnder5,
          guests5AndAbove: formData.guests5AndAbove,
          guestNames: formData.guestNames,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast.success("Registration successful!");
      } else {
        toast.error(data.error || "Registration failed");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md">
          <div className="glass-gold rounded-2xl p-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-2">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-display font-bold">
              Registration Successful!
            </h2>
            <p className="text-muted-foreground">
              Your registration has been submitted. An admin will review your
              payment and confirm your registration.
            </p>
            <p className="text-sm text-muted-foreground">
              Total: &#x09F3;{totalPrice} | Attendees: {totalAttendees}
            </p>
            <Link href="/">
              <Button variant="outline" className="mt-4">
                Back to Home
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl">
        <div className="glass-gold rounded-2xl p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-display font-bold">
              Register for Reunion
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Fill in your details to reserve your spot
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                required
                className="bg-background/50"
                value={formData.name}
                onChange={(e) => update("name", e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Mobile */}
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobile Number *</Label>
              <Input
                id="mobile"
                type="tel"
                placeholder="+880 1XXX-XXXXXX"
                required
                className="bg-background/50"
                value={formData.mobile}
                onChange={(e) => update("mobile", e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Email (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="bg-background/50"
                value={formData.email}
                onChange={(e) => update("email", e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Batch */}
            <div className="space-y-1.5">
              <Label>Batch Year *</Label>
              <Select
                value={formData.batch}
                onValueChange={(v) => update("batch", v)}
                disabled={loading}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select Batch" />
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

            {/* T-Shirt Size */}
            <div className="space-y-1.5">
              <Label>T-Shirt Size *</Label>
              <Select
                value={formData.tShirtSize}
                onValueChange={(v) => update("tShirtSize", v)}
                disabled={loading}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select Size" />
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

            {/* Religion */}
            <div className="space-y-1.5">
              <Label>Religion</Label>
              <Select
                value={formData.religion}
                onValueChange={(v) => update("religion", v)}
                disabled={loading}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select Religion (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  {RELIGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.religion === "Custom" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-1.5">
                <Label htmlFor="customReligion">Enter Your Religion *</Label>
                <Input
                  id="customReligion"
                  placeholder="Your religion"
                  required
                  className="bg-background/50"
                  value={formData.customReligion}
                  onChange={(e) => update("customReligion", e.target.value)}
                  disabled={loading}
                />
              </motion.div>
            )}

            {/* Guest Counts */}
            <div className="space-y-3">
              <Label className="text-base">Guests (Optional)</Label>
              <p className="text-xs text-muted-foreground -mt-1">
                How many guests are you bringing along?
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Under 5 years</p>
                  <p className="text-xs text-muted-foreground">Free entry</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateCount("guestsUnder5", -1)}
                    disabled={loading || formData.guestsUnder5 === 0}>
                    <Minus size={14} />
                  </Button>
                  <span className="w-8 text-center font-semibold tabular-nums">
                    {formData.guestsUnder5}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateCount("guestsUnder5", 1)}
                    disabled={loading}>
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">5 years &amp; above</p>
                  <p className="text-xs text-muted-foreground">
                    &#x09F3;{PRICE_PER_GUEST_5PLUS} per guest
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateCount("guests5AndAbove", -1)}
                    disabled={loading || formData.guests5AndAbove === 0}>
                    <Minus size={14} />
                  </Button>
                  <span className="w-8 text-center font-semibold tabular-nums">
                    {formData.guests5AndAbove}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateCount("guests5AndAbove", 1)}
                    disabled={loading}>
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Guest Names */}
            {totalGuests > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2">
                <Label className="text-base">Guest Names</Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  Enter the name of each guest
                </p>
                {formData.guestNames.map((gName, i) => (
                  <div key={i} className="space-y-1">
                    <Label
                      htmlFor={`guest-${i}`}
                      className="text-xs text-muted-foreground">
                      {i < formData.guestsUnder5
                        ? `Guest ${i + 1} (Under 5)`
                        : `Guest ${i + 1} (5+ years)`}
                    </Label>
                    <Input
                      id={`guest-${i}`}
                      placeholder={`Guest ${i + 1} name`}
                      className="bg-background/50"
                      value={gName}
                      onChange={(e) => updateGuestName(i, e.target.value)}
                      disabled={loading}
                    />
                  </div>
                ))}
              </motion.div>
            )}

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label>Payment Method *</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(v) => update("paymentMethod", v)}
                disabled={loading}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Batch Member</span>
                <span>1</span>
              </div>
              {formData.guestsUnder5 > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guests Under 5</span>
                  <span>{formData.guestsUnder5}</span>
                </div>
              )}
              {formData.guests5AndAbove > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guests 5+</span>
                  <span>{formData.guests5AndAbove}</span>
                </div>
              )}
              {totalGuests > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Guests</span>
                  <span>{totalGuests}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-border/50 pt-1 mt-1">
                <span>Total Attendees</span>
                <span>{totalAttendees}</span>
              </div>
              <div className="flex justify-between font-semibold text-primary">
                <span>Total Cost</span>
                <span>&#x09F3;{totalPrice}</span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full glow-gold-sm"
              disabled={loading}>
              {loading ? "Submitting..." : "Register"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link href="/" className="text-primary hover:underline font-medium">
              Back to Home
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
