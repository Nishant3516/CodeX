"use client";
import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  Clock,
  Sparkles,
  Globe,
  Code,
} from "lucide-react";
import Link from "next/link";
import { PLAYGROUND_OPTIONS } from "@/constants/playground";
import { MaxLabsModal } from "@/components/editor/MaxLabsModal";
import { generateRandomLabId } from "@/utils/labIdGenerator";
import Squares from "@/components/landing/Squares";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { siteContent } from "@/app/content";

export default function PlaygroundPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [showMaxLabsModal, setShowMaxLabsModal] = useState(false);
  async function startLab(language: string, id: string) {
    setLoading(id);
    try {
    const labId = generateRandomLabId();
    if(language == "vanilla-js"){
      setTimeout(()=>{
        window.location.href = `/playground/js/${labId}`;
      }, 1000);
      return
    }
      const res = await fetch("/api/project/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, labId }),
      });

      if(res.status === 429) {

        setLoading(null);
        setShowMaxLabsModal(true);
        return;
      }


      if (!res.ok) throw new Error("Failed to start lab instance");

      const data = await res.json();
      if (!labId) throw new Error("No labId returned from server");

      // Redirect to the project page
      setTimeout(() => {
        window.location.href = `/playground/${language}/${labId}`;
      }, 1000);
    } catch (e) {
      console.error(e);
      alert("Failed to start lab. Please try again.");
      setLoading(null);
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };

  return (
    <>
      <main className="relative min-h-screen text-white">
        <Squares
          className="pointer-events-none"
          direction="diagonal"
          speed={0.35}
          borderColor="rgba(255,255,255,0.08)"
          hoverFillColor="rgba(124,58,237,0.12)"
          squareSize={34}
        />
        <Navbar />
        <div className="relative z-10 min-h-screen  text-white flex flex-col items-center p-4 sm:p-8 pt-24 font-poppins overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 w-full max-w-6xl mx-auto">
          <motion.header
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center m-12"
          >

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-gray-400 max-w-2xl leading-relaxed"
            >
              Choose a template to instantly launch a secure, cloud-based
              development environment.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-2 mt-4 text-purple-400"
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium">
                Powered by cutting-edge cloud technology
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-3"
            >
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
              >
                Try Guided Projects
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/playground"
                className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-5 py-2.5 text-sm font-semibold text-purple-200 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-400/60 hover:bg-purple-500/20"
              >
                Explore Playgrounds
              </Link>
            </motion.div>
          </motion.header>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 w-full justify-items-center"
          >
            {PLAYGROUND_OPTIONS.map((opt) => (
              <motion.div
                key={opt.id}
                variants={itemVariants}
                whileHover={{
                  y: opt.isLive ? -8 : 0,
                  scale: opt.isLive ? 1.02 : 1,
                  transition: { type: "spring", stiffness: 300, damping: 20 },
                }}
                className={`relative bg-gray-800/50 border rounded-xl shadow-lg transition-all duration-300 backdrop-blur-sm overflow-hidden ${
                  opt.isLive
                    ? `${opt.color} hover:shadow-purple-500/25 cursor-pointer`
                    : "border-gray-600/50 cursor-not-allowed opacity-75"
                }`}
              >
                {/* Live indicator */}
                {opt.isLive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 w-3 h-3 bg-green-400 rounded-full shadow-lg"
                    title="Available now"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-full h-full bg-green-400 rounded-full"
                    />
                  </motion.div>
                )}

                {/* Coming Soon badge */}
                {!opt.isLive && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-4 right-4 px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full font-medium"
                  >
                    Soon
                  </motion.div>
                )}

                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-start gap-4">
                    <motion.div
                      className={`p-3 rounded-lg ${opt.isLive ? "bg-gray-900" : "bg-gray-700"}`}
                      whileHover={opt.isLive ? { rotate: 5 } : {}}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      {opt.icon}
                    </motion.div>
                    <div className="flex-1">
                      <h3
                        className={`text-xl font-bold ${opt.isLive ? "text-gray-100" : "text-gray-400"}`}
                      >
                        {opt.label}
                      </h3>
                      <p
                        className={`text-gray-400 mt-1 flex-grow ${!opt.isLive ? "text-gray-500" : ""}`}
                      >
                        {opt.info}
                      </p>
                      {opt.isLive && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-1 mt-2 text-green-400 text-sm font-medium"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Ready to launch</span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-700/50 flex justify-end">
                    {opt.isLive ? (
                      <motion.button
                        disabled={!!loading}
                        onClick={() => startLab(opt.language, opt.id)}
                        whileHover={{ scale: loading ? 1 : 1.05 }}
                        whileTap={{ scale: loading ? 1 : 0.95 }}
                        className={`px-6 py-2 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors duration-300 text-sm ${
                          loading && loading !== opt.id
                            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                            : "bg-purple-600 text-white hover:bg-purple-700"
                        }`}
                      >
                        <AnimatePresence mode="wait">
                          {loading === opt.id ? (
                            <motion.div
                              key="loading"
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="flex items-center gap-2"
                            >
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Starting...</span>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="start"
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <span>Start Lab</span>
                              <ArrowRight className="w-5 h-5" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-6 py-2 font-semibold rounded-lg flex items-center justify-center gap-2 bg-gray-600 text-gray-400 cursor-not-allowed text-sm"
                      >
                        <Clock className="w-5 h-5" />
                        <span>Coming Soon</span>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          </div>
        </div>
        <Footer
          tagline={siteContent.footer.tagline}
          socials={siteContent.footer.socials}
          copyright={siteContent.footer.copyright}
          builtBy={siteContent.footer.builtBy}
        />
      </main>

            {/* Maximum Labs Exceeded Modal */}
      <MaxLabsModal
        isOpen={showMaxLabsModal}
        onClose={() => {
          setShowMaxLabsModal(false);
          window.location.href = '/playground';
        }}
      />
    </>
  );
}
