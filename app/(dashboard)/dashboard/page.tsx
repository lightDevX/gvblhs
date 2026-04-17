"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  BookOpen,
  Briefcase,
  CheckCircle,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  tshirtSize: string;
  role: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user) {
      loadProfile();
    }
  }, [user, loading]);

  const loadProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setProfileLoading(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}>
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">
            Welcome, {user.name}!
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your reunion ticket and profile.
          </p>
        </div>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}>
        <Card className="border-border/50 overflow-hidden">
          <CardHeader className="bg-linear-to-r from-gold/10 to-transparent">
            <CardTitle className="font-display flex items-center gap-2">
              <User className="w-5 h-5 text-gold" />
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Name
                  </p>
                  <p className="text-lg font-semibold">{profile?.name}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Email
                  </p>
                  <p className="text-lg font-semibold">{profile?.email}</p>
                </div>
              </div>

              {/* Phone */}
              {profile?.phone && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Phone
                    </p>
                    <p className="text-lg font-semibold">{profile.phone}</p>
                  </div>
                </div>
              )}

              {/* T-Shirt Size */}
              {profile?.tshirtSize && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      T-Shirt Size
                    </p>
                    <p className="text-lg font-semibold">
                      {profile.tshirtSize}
                    </p>
                  </div>
                </div>
              )}

              {/* Role */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Role
                  </p>
                  <p className="text-lg font-semibold capitalize">
                    {profile?.role}
                  </p>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Member Since
                  </p>
                  <p className="text-lg font-semibold">
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Check back soon for more features!</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
