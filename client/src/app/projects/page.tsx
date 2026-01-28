"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Code, Loader2, Sparkles, Globe } from "lucide-react";
import Link from "next/link";
import Squares from "@/components/landing/Squares";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { siteContent } from "@/app/content";

interface Language {
  name: string;
  icon: string;
  description: string;
  color: string;
}

// Language configuration with icons and colors
const LANGUAGE_CONFIG: Record<string, Omit<Language, 'name'>> = {
  react: {
    icon: "⚛️",
    description: "Build interactive user interfaces with React",
    color: "border-blue-500/20 hover:border-blue-500/50"
  },

  javascript: {
    icon: "🟨",
    description: "Vanilla JavaScript, includes projects for ( HTML, CSS and JS )",
    color: "border-yellow-400/20 hover:border-yellow-400/50"
  },
  
  node: {
    icon: "🟢",
    description: "JavaScript runtime for server-side development",
    color: "border-green-600/20 hover:border-green-600/50"
  },

};

export default function ExperimentalProjectsPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/experimental/projects');
      
      if (!response.ok) {
        throw new Error('Failed to fetch languages');
      }
      
      const data = await response.json();
      
      if (data.success && data.languages) {
        // Map API response to Language objects with configuration
        const mappedLanguages: Language[] = data.languages
          .filter((langName: string) => langName.toLowerCase() !== 'html' && langName.toLowerCase() !== 'css')
          .map((langName: string) => {
            const name = langName.toLowerCase() === 'javascript' ? 'Vanilla JS' : langName;
            return {
              name,
              ...LANGUAGE_CONFIG[name.toLowerCase()] || {
          icon: "💻",
          description: `Projects using ${name}`,
          color: "border-gray-500/20 hover:border-gray-500/50"
              }
            };
          });
        
        setLanguages(mappedLanguages);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching languages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load languages');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen  text-white flex items-center justify-center">
        <Squares
        className="pointer-events-none"
        direction="diagonal"
        speed={0.35}
        borderColor="rgba(255,255,255,0.08)"
        hoverFillColor="rgba(124,58,237,0.12)"
        squareSize={34}
      />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          <p className="text-gray-400">Loading available languages...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center max-w-md"
        >
          <div className="text-red-400 text-6xl">⚠️</div>
          <h2 className="text-xl font-bold text-red-400">Error Loading Languages</h2>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={fetchLanguages}
            className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
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
      <div className="relative z-10 min-h-screen text-white flex flex-col items-center p-4 sm:p-8 pt-24 font-poppins overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        {/* Content */}
        <div className="relative mt-24 z-10 w-full max-w-6xl mx-auto">
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
            Explore hands-on coding projects across different programming languages and frameworks.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2 mt-4 text-purple-400"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium">
              Choose your technology and start building
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
              Browse Guided Projects
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/playground"
              className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-5 py-2.5 text-sm font-semibold text-purple-200 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-400/60 hover:bg-purple-500/20"
            >
              Explore Playgrounds
              <Globe className="w-4 h-4" />
            </Link>
          </motion.div>
        </motion.header>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
        >
          {languages.map((language) => (
            <motion.div
              key={language.name}
              variants={itemVariants}
              whileHover={{
                y: -8,
                scale: 1.02,
                transition: { type: "spring", stiffness: 300, damping: 20 },
              }}
              className={`relative bg-gray-800/50 border rounded-xl shadow-lg transition-all duration-300 backdrop-blur-sm overflow-hidden cursor-pointer ${language.color}`}
            >
              <Link href={`/projects/${language.name.toLowerCase() == 'vanilla js' ? 'vanilla-js' : language.name.toLowerCase()}`}>
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-start gap-4">
                    <motion.div
                      className="p-3 rounded-lg bg-gray-900"
                      whileHover={{ rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <span className="text-2xl">{language.icon}</span>
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-100 capitalize">
                        {language.name}
                      </h3>
                      <p className="text-gray-400 mt-1 flex-grow">
                        {language.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-700/50 flex justify-end">
                    <motion.button
                      whileHover={{ x: 5 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-sm font-medium"
                    >
                      <span>View Projects</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {languages.length === 0 && !loading && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Code className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              No Languages Available
            </h3>
            <p className="text-gray-500">
              Check back later for available programming languages and frameworks.
            </p>
          </motion.div>
        )}
        </div>
      </div>
      <Footer
        tagline={siteContent.footer.tagline}
        socials={siteContent.footer.socials}
        copyright={siteContent.footer.copyright}
        builtBy={siteContent.footer.builtBy}
      />
    </main>
  );
}