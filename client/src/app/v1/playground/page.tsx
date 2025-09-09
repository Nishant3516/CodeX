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
import { PLAYGROUND_OPTIONS } from "@/constants/playground";
import { MaxLabsModal } from "@/components/editor/MaxLabsModal";

export default function PlaygroundPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [showMaxLabsModal, setShowMaxLabsModal] = useState(false);
  async function startLab(language: string, id: string) {
    setLoading(id);
    try {
    const words = [
      "ram",
      "vibhishan",
      "laxman",
      "hanuman",
      "krishna",
      "arjuna",
      "bhima",
      "yudhishthira",
      "draupadi",
      "sita",
      "ravana",
      "bharata",
      "shatrughna",
      "kumbhakarna",
      "valmiki",
      "vyasa",
      "drona",
      "karna",
      "pandavas",
      "kouravas",
    ];
    const numWords = Math.floor(Math.random() * 3) + 2; // 2 to 4 words
    const selectedWords = [];
    for (let i = 0; i < numWords; i++) {
      selectedWords.push(words[Math.floor(Math.random() * words.length)]);
    }
    const labId = selectedWords.join("-");
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
        window.location.href = `/v1/project/${language}/${labId}`;
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col items-center p-4 sm:p-8 font-poppins relative overflow-hidden">
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
            className="flex flex-col items-center text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative mb-6"
            >
              <motion.img
                src="/logos/white.svg"
                alt="DevsArena Logo"
                width={80}
                height={80}
                className="mb-4"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              />
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl"
              />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl sm:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 mb-4"
            >
              DevsArena Playground
            </motion.h1>
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

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-16 text-center"
          >
            <div className="flex items-center justify-center gap-6 text-gray-400 text-sm">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                <span>Cloud-powered</span>
              </motion.div>
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Instant setup</span>
              </motion.div>
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Code className="w-4 h-4" />
                <span>Secure environment</span>
              </motion.div>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Copyright &copy; 2025 DevsArena. All rights reserved.
            </p>
          </motion.footer>
        </div>
      </div>

            {/* Maximum Labs Exceeded Modal */}
      <MaxLabsModal
        isOpen={showMaxLabsModal}
        onClose={() => {
          setShowMaxLabsModal(false);
          window.location.href = '/v1/playground';
        }}
      />
    </>
  );
}
