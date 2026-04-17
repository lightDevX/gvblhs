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
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const AGE_GROUPS = ["18-25", "26-35", "36-45", "46-55", "56-65", "66+"];

interface ProfileFormProps {
  onSuccess?: () => void;
}

export const ProfileForm = ({ onSuccess }: ProfileFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    tshirtSize: "",
  });

  // Load profile data on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = await response.json();
          setFormData({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            age: data.age ? String(data.age) : "",
            tshirtSize: data.tshirtSize || "",
          });
        } else {
          console.error("Failed to load profile");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Invalid email format");
      return;
    }

    if (formData.phone.trim()) {
      const phoneRegex = /^[\d\s\-+()]{10,}$/;
      if (!phoneRegex.test(formData.phone)) {
        toast.error("Invalid phone number format");
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          age: user?.category === "guest" ? formData.age : null,
          tshirtSize:
            user?.category === "guest" ? null : formData.tshirtSize || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Profile updated successfully!");
        onSuccess?.();
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("An error occurred while updating your profile");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading your profile...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          placeholder="John Doe"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="bg-background/50"
          required
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          className="bg-background/50"
          required
        />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+880 1234 567890"
          value={formData.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          className="bg-background/50"
        />
        <p className="text-xs text-muted-foreground">
          Optional. Must be at least 10 digits if provided.
        </p>
      </div>

      {/* Age Group (only for guests) */}
      {user?.category === "guest" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-2">
          <Label htmlFor="ageGroup">Age Group</Label>
          <Select
            value={formData.age}
            onValueChange={(value) => handleChange("age", value)}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="Select Age Group" />
            </SelectTrigger>
            <SelectContent>
              {AGE_GROUPS.map((ageGroup) => (
                <SelectItem key={ageGroup} value={ageGroup}>
                  {ageGroup}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Optional</p>
        </motion.div>
      )}

      {/* T-Shirt Size */}
      {user?.category !== "guest" && (
        <div className="space-y-2">
          <Label htmlFor="tshirtSize">T-Shirt Size</Label>
          <Select
            value={formData.tshirtSize}
            onValueChange={(value) => handleChange("tshirtSize", value)}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="Select a size..." />
            </SelectTrigger>
            <SelectContent>
              {TSHIRT_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Optional</p>
        </div>
      )}

      {user?.category === "guest" && (
        <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 p-2 rounded">
          T-shirt selection is not available for guests.
        </p>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-gold text-navy hover:bg-gold-dark font-semibold">
        {loading ? "Updating..." : "Update Profile"}
      </Button>
    </form>
  );
};
