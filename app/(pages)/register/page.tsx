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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const RELIGIONS = ["Islam", "Hindu", "Christian", "Buddhist", "Custom"];
const BATCHES = Array.from({ length: 11 }, (_, i) => String(2000 + i));

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
    category: "student" as "student" | "guest",
    batch: "",
  });

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

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

    if (formData.category === "student" && !formData.batch) {
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
      // Call register API with all form data
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          religion: formData.religion,
          customReligion: formData.customReligion,
          category: formData.category,
          batch: formData.batch,
          transactionId: formData.transactionId,
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
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

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => update("category", v)}
                disabled={loading}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student (Batch-based)</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Batch (only for students) */}
            {formData.category === "student" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-1.5">
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
              </motion.div>
            )}

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
              customReligion: formData.customReligion,
              category: formData.category,
              batch: formData.batch,
              transactionId: formData.transactionId,
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
