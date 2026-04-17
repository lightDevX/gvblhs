"use client";

import { ProfileForm } from "@/components/profile/ProfileForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ProfilePage = () => {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
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
      {/* Header with Back Button */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
            <User className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display">My Profile</h1>
            <p className="text-muted-foreground text-sm">
              Manage your account information
            </p>
          </div>
        </div>
      </div>

      {/* Profile Information Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}>
        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="font-display">
              Update Your Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm
              onSuccess={() => {
                // Optional: Show additional feedback or navigate
              }}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="p-6 rounded-lg bg-muted/50 border border-border">
        <h3 className="font-semibold text-sm text-foreground mb-3">
          Profile Information
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            ✓ Keep your email updated to receive important event notifications
          </li>
          <li>✓ Add your phone number for better communication</li>
          <li>✓ Select your t-shirt size for the event merchandise</li>
          <li>✓ All changes are saved automatically</li>
        </ul>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
