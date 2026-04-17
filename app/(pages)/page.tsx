"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Calendar, MapPin, PartyPopper, Users } from "lucide-react";
import Link from "next/link";

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative gradient-navy text-gold-light overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 25% 25%, hsl(45 70% 55% / 0.2) 0%, transparent 50%), radial-gradient(circle at 75% 75%, hsl(45 70% 55% / 0.15) 0%, transparent 50%)",
            }}
          />
        </div>

        <div className="container mx-auto px-4 py-24 md:py-36 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto">
            <div className="inline-block mb-6 px-6 py-2 rounded-full border-2 border-gold text-gold font-sans text-sm font-bold tracking-widest uppercase bg-gold/10">
              ✨ School Reunion 2026 ✨
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-2 leading-tight text-white drop-shadow-lg">
              Goonvari B. L.
            </h1>
            <h2 className="text-4xl md:text-6xl font-display font-bold mb-8 leading-tight text-white drop-shadow-lg">
              <span className="text-gold">High School</span>
            </h2>
            <p className="text-xl md:text-2xl font-body text-gold font-bold mb-3">
              Fulchari, Gaibandha
            </p>
            <p className="text-lg font-body text-white/95 mb-10 max-w-xl mx-auto leading-relaxed">
              Reconnect with old friends, relive cherished memories, and
              celebrate the bonds that shaped our journey. Join us for an
              unforgettable reunion.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-linear-to-r from-[#614385] to-[#516395] text-navy hover:from-gold hover:to-gold font-display text-lg font-bold px-10 py-7 shadow-lg hover:shadow-xl transition-all glow-gold">
                  🎫 Register Now
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="lg"
                  className="border-2 border-gold text-gold hover:bg-gold hover:text-navy font-display text-lg font-bold px-10 py-7 bg-transparent transition-all">
                  Contact Us
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-background to-transparent" />
      </section>

      {/* Event Details */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
              Event <span className="text-gold">Details</span>
            </h2>
            <div className="w-32 h-1.5 bg-gold mx-auto rounded-full shadow-lg" />
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Calendar,
                title: "Date & Time",
                desc: "Coming Soon",
                sub: "Full day celebration",
              },
              {
                icon: MapPin,
                title: "Venue",
                desc: "Goonvari B. L. High School",
                sub: "Fulchari, Gaibandha",
              },
              {
                icon: Users,
                title: "Who Can Join",
                desc: "Batch 2000–2010 & Guests",
                sub: "All alumni welcome",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="bg-navy/60 border-2 border-gold/40 rounded-2xl p-10 text-center hover:border-gold hover:shadow-2xl hover:shadow-gold/30 transition-all duration-300 group cursor-pointer backdrop-blur-sm">
                <div className="w-16 h-16 rounded-full bg-gold/15 flex items-center justify-center mx-auto mb-6 group-hover:bg-gold/25 group-hover:shadow-lg group-hover:shadow-gold/50 transition-all">
                  <item.icon
                    className="text-gold group-hover:scale-125 transition-transform"
                    size={32}
                  />
                </div>
                <h3 className="font-display text-2xl font-bold text-white mb-3">
                  {item.title}
                </h3>
                <p className="font-body text-lg text-gold font-semibold mb-1">
                  {item.desc}
                </p>
                <p className="font-sans text-sm text-white/70">{item.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 gradient-navy relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 50%, hsl(45 70% 55% / 0.3) 0%, transparent 70%)",
            }}
          />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}>
            <PartyPopper
              className="text-gold mx-auto mb-8 drop-shadow-lg"
              size={56}
            />
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
              Reserve Your <span className="text-gold">Spot Now</span>
            </h2>
            <p className="text-white/90 font-body text-lg mb-10 max-w-lg mx-auto leading-relaxed">
              Register today to secure your place at the reunion. Spaces are
              limited — don&apos;t miss out!
            </p>
            <Link href="/register">
              <Button
                size="lg"
                className="bg-linear-to-r from-[#614385] to-[#516395] text-navy hover:from-gold hover:to-gold font-display text-lg font-bold px-12 py-8 shadow-xl hover:shadow-2xl hover:shadow-gold/50 transition-all glow-gold">
                🎉 Register Now
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy border-t-2 border-gold py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="font-display text-gold text-xl mb-2 font-bold">
            Goonvari B. L. High School
          </p>
          <p className="font-sans text-white/70 text-sm mb-1">
            Fulchari, Gaibandha — Reunion 2026
          </p>
          <p className="font-sans text-white/50 text-xs mt-4">
            Made with ❤️ for our beloved school
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
