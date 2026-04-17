"use client";

import GoogleSignInButton from "@/components/GoogleSignInButton";
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
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const RELIGIONS = ["Islam", "Hindu", "Christian", "Buddhist", "Custom"];
const BATCHES = Array.from({ length: 11 }, (_, i) => String(2000 + i));

const PRICE_PER_MEMBER = 800;
const PRICE_PER_GUEST_UNDER5 = 0;
const PRICE_PER_GUEST_5PLUS = 500;

const Register = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    transactionId: "",
    religion: "",
    customReligion: "",
    batch: "",
    guestsUnder5: 0,
    guests5AndAbove: 0,
    guestNames: [] as string[],
  });

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

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
    PRICE_PER_MEMBER +
    formData.guestsUnder5 * PRICE_PER_GUEST_UNDER5 +
    formData.guests5AndAbove * PRICE_PER_GUEST_5PLUS;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.phone.trim()) {
      toast.error("Phone required", {
        description: "Please enter your mobile number.",
      });
      return;
    }

    if (!formData.religion) {
      toast.error("Religion required", {
        description: "Please select your religion.",
      });
      return;
    }

    if (formData.religion === "Custom" && !formData.customReligion.trim()) {
      toast.error("Custom religion required", {
        description: "Please enter your religion.",
      });
      return;
    }

    if (!formData.batch) {
      toast.error("Batch required", {
        description: "Please select your batch year.",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password too short", {
        description: "Password must be at least 6 characters.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          religion: formData.religion,
          customReligion: formData.customReligion || undefined,
          batch: formData.batch,
          transactionId: formData.transactionId || undefined,
          guestsUnder5: formData.guestsUnder5,
          guests5AndAbove: formData.guests5AndAbove,
          guestNames: formData.guestNames,
        }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        toast.success("Registration successful!", {
          description: "Your account has been created. Logging you in...",
        });
        router.push("/dashboard");
      } else {
        toast.error("Registration failed", {
          description: data.error || "Please try again later.",
        });
      }
    } catch (error) {
      setLoading(false);
      console.error("Registration error:", error);
      toast.error("Registration failed", {
        description: "An error occurred. Please try again later.",
      });
    }
  };

  // Show loading or redirect if already logged in
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md">
        <div className="glass-gold rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                required
                className="bg-background/50"
                value={formData.name}
                onChange={(e) => update("name", e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                className="bg-background/50"
                value={formData.email}
                onChange={(e) => update("email", e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Mobile Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+880 1XXX-XXXXXX"
                required
                className="bg-background/50"
                value={formData.phone}
                onChange={(e) => update("phone", e.target.value)}
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

            {/* Transaction ID */}
            <div className="space-y-1.5">
              <Label htmlFor="txnId">Transaction ID (Optional)</Label>
              <Input
                id="txnId"
                placeholder="Enter transaction ID"
                className="bg-background/50"
                value={formData.transactionId}
                onChange={(e) => update("transactionId", e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Religion */}
            <div className="space-y-1.5">
              <Label>Religion *</Label>
              <Select
                value={formData.religion}
                onValueChange={(v) => update("religion", v)}
                disabled={loading}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select Religion" />
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

            {/* Custom Religion */}
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

              {/* Guests Under 5 */}
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

              {/* Guests 5 and Above */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">5 years &amp; above</p>
                  <p className="text-xs text-muted-foreground">
                    ৳{PRICE_PER_GUEST_5PLUS} per guest
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
                <span>Estimated Cost</span>
                <span>৳{totalPrice}</span>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-background/50"
                value={formData.password}
                onChange={(e) => update("password", e.target.value)}
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full glow-gold-sm"
              disabled={loading}>
              {loading ? "Creating account..." : "Register"}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          <GoogleSignInButton
            additionalData={{
              phone: formData.phone,
              religion: formData.religion,
              customReligion: formData.customReligion || undefined,
              batch: formData.batch,
              transactionId: formData.transactionId || undefined,
              guestsUnder5: formData.guestsUnder5,
              guests5AndAbove: formData.guests5AndAbove,
              guestNames: formData.guestNames,
            }}
          />

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
