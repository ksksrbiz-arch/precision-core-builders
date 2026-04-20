/**
 * HeroSection Component
 * Cinematic, full-bleed hero with "Quiet Luxury" aesthetic
 * for the Precision Core Builders landing page.
 */

import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export interface HeroSectionProps {
  onConsultationClick?: () => void;
  onPortfolioClick?: () => void;
}

export function HeroSection({
  onConsultationClick,
  onPortfolioClick,
}: HeroSectionProps) {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background Gradient Overlay */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background:
            "linear-gradient(135deg, #2D2D2D 0%, #1A1A1A 50%, #3D3D3D 100%)",
        }}
      />

      {/* Decorative Construction Image or Pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 35px,
              #8B7355 35px,
              #8B7355 70px
            )
          `,
        }}
      />

      {/* Subtle Grid Pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(
              0deg,
              transparent 24%,
              #A9A9A9 25%,
              #A9A9A9 26%,
              transparent 27%,
              transparent 74%,
              #A9A9A9 75%,
              #A9A9A9 76%,
              transparent 77%,
              transparent
            ),
            linear-gradient(
              90deg,
              transparent 24%,
              #A9A9A9 25%,
              #A9A9A9 26%,
              transparent 27%,
              transparent 74%,
              #A9A9A9 75%,
              #A9A9A9 76%,
              transparent 77%,
              transparent
            )
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content Container */}
      <div className="relative h-full flex flex-col items-center justify-center px-4 sm:px-6 md:px-8">
        {/* CCB Badge - Top Right */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute top-8 right-4 sm:top-12 sm:right-8"
        >
          <Badge
            variant="outline"
            className="bg-white/10 border-amber-900/50 text-amber-50 px-4 py-2 text-sm font-mono"
          >
            CCB #246527
          </Badge>
        </motion.div>

        {/* Main Content - Centered */}
        <motion.div
          className="text-center max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          {/* Headline */}
          <motion.h1
            className="font-serif text-4xl sm:text-5xl md:text-7xl font-light tracking-tight mb-4 text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Precision Construction.
            <br />
            <span className="text-amber-600">Core Values.</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            className="text-lg sm:text-xl md:text-2xl text-amber-50/80 mb-8 font-light max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Digital Foreman: Enterprise construction management for builders who
            demand excellence. Real-time field reports, smart scheduling, and
            transparent client communication.
          </motion.p>

          {/* Key Features Teaser */}
          <motion.div
            className="flex flex-wrap justify-center gap-3 mb-12"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            {["Voice Reports", "Smart Scheduling", "Budget Control"].map(
              feature => (
                <span
                  key={feature}
                  className="text-sm px-4 py-2 bg-white/10 rounded-full text-amber-50 border border-amber-900/30 backdrop-blur-sm"
                >
                  {feature}
                </span>
              )
            )}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <Button
              size="lg"
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-6 text-lg font-semibold rounded-lg transition-all"
              onClick={onConsultationClick}
            >
              Schedule Consultation
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-amber-900/50 text-amber-50 hover:bg-white/10 px-8 py-6 text-lg font-semibold rounded-lg transition-all"
              onClick={onPortfolioClick}
            >
              View Portfolio
            </Button>
          </motion.div>

          {/* Trust Indicator */}
          <motion.p
            className="text-sm text-amber-50/60 mt-8 font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            20+ years of precision. 100+ completed projects.
          </motion.p>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-amber-50/60 text-xs font-mono">SCROLL</span>
          <svg
            className="w-5 h-5 text-amber-50/60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </motion.div>
      </div>

      {/* Bottom Fade to Next Section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, #F5F1ED)",
        }}
      />
    </div>
  );
}
