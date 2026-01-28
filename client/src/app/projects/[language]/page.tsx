"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  Calendar,
  Clock,
  BookOpen,
  X,
  ArrowLeft,
  Play
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { generateRandomLabId } from "@/utils/labIdGenerator";
import Squares from "@/components/landing/Squares";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { siteContent } from "@/app/content";

interface QuestMeta {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  category: {
    id: string;
    category: string;
  };
  techStack: Array<{
    id: string;
    name: string;
  }>;
  topics: Array<{
    id: string;
    name: string;
  }>;
  difficulty: {
    id: string;
    level: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface StartQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  quest: QuestMeta | null;
  language: string;
  onStartQuest: (labId: string) => void;
  isStarting: boolean;
}

function StartQuestModal({ isOpen, onClose, quest, language, onStartQuest, isStarting }: StartQuestModalProps) {
  const [labId, setLabId] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLabId(generateRandomLabId());
    }
  }, [isOpen]);

  const handleStart = () => {
    if (labId.trim()) {
      onStartQuest(labId.trim());
    }
  };

  if (!quest) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Start Quest</h3>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <h4 className="font-semibold text-white mb-2">{quest.name}</h4>
                  <p className="text-gray-400 text-sm">{quest.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded-full">
                      {quest.difficulty.level}
                    </span>
                    <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-full">
                      {language}
                    </span>
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Lab ID
                  </label>
                  <input
                    type="text"
                    value={labId}
                    onChange={(e) => setLabId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter a unique lab ID"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can customize this ID or keep the generated one
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStart}
                    disabled={!labId.trim() || isStarting}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Start Quest
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function ExperimentalProjectsByLanguagePage() {
  const params = useParams();
  const language = params?.language as string;
  
  const [projects, setProjects] = useState<QuestMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<QuestMeta | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [isStartingQuest, setIsStartingQuest] = useState(false);
  const [complexityFilter, setComplexityFilter] = useState<"all" | "easy" | "medium" | "hard">("all");

  useEffect(() => {
    if (language) {
      fetchProjects();
    }
  }, [language]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/experimental/projects/${language}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      
      if (data.success && data.projects) {
        setProjects(data.projects);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const normalizeDifficulty = (level?: string) => {
    const normalized = (level || "").toLowerCase();
    if (normalized.includes("beginner")) return "easy" as const;
    if (normalized.includes("intermediate")) return "medium" as const;
    if (normalized.includes("advanced")) return "hard" as const;
    return "medium" as const;
  };

  const filteredProjects = projects.filter((project) => {
    if (complexityFilter === "all") return true;
    return normalizeDifficulty(project.difficulty?.level) === complexityFilter;
  });

  const handleStartQuest = async (labId: string) => {
    if (!selectedQuest) return;

    if(language == "vanilla-js"){
      setTimeout(()=>{
        window.location.href = `/project/js/${selectedQuest.slug}/${labId}`;
      }, 1000)
      return 
    }
    
    try {
      setIsStartingQuest(true);
      
      const response = await fetch('/api/v1/start/quest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: language,
          projectSlug: selectedQuest.slug,
          labId: labId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start quest');
      }

      const data = await response.json();
      
      if (data.success) {
        // Redirect to the experimental project IDE with tabs UI
        window.location.href = `/project/${language}/${selectedQuest.slug}/${labId}`;
      } else {
        throw new Error(data.error || 'Failed to start quest');
      }
    } catch (err) {
      console.error('Error starting quest:', err);
      alert(err instanceof Error ? err.message : 'Failed to start quest');
    } finally {
      setIsStartingQuest(false);
    }
  };

  const openStartModal = (quest: QuestMeta) => {
    setSelectedQuest(quest);
    setShowStartModal(true);
  };

  const closeStartModal = () => {
    setShowStartModal(false);
    setSelectedQuest(null);
    setIsStartingQuest(false);
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
          <p className="text-gray-400">Loading {language} projects...</p>
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
          <h2 className="text-xl font-bold text-red-400">Error Loading Projects</h2>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={fetchProjects}
            className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

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
        <div className="relative mt-12 z-10 min-h-screen  text-white flex flex-col items-center p-4 sm:p-8 pt-24 font-poppins overflow-hidden">
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
            {/* Back navigation */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="self-start mb-6"
            >
              <Link 
                href="/projects"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Languages</span>
              </Link>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl sm:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#a78bfa] via-[#7c3aed] to-[#5b21b6] mb-4 capitalize"
            >
              {language} Projects
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-gray-400 max-w-2xl leading-relaxed"
            >
              Hands-on coding projects to sharpen your {language} skills. Choose a project and start coding immediately.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-2 mt-4 text-purple-400"
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium">
                {filteredProjects.length} of {projects.length} project{projects.length !== 1 ? 's' : ''} available
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6 w-full max-w-4xl"
            >
              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-gray-300 shadow-sm backdrop-blur-sm md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Filter by complexity to find the right challenge.</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Complexity
                  </label>
                  <div className="relative">
                    <select
                      value={complexityFilter}
                      onChange={(e) => setComplexityFilter(e.target.value as "all" | "easy" | "medium" | "hard")}
                      className="appearance-none rounded-full border border-white/10 bg-gray-900/70 px-4 py-2 pr-8 text-sm text-white shadow-sm transition focus:border-purple-400/60 focus:outline-none"
                    >
                      <option value="all">All levels</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      ▼
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.header>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 w-full"
          >
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                variants={itemVariants}
                whileHover={{
                  y: -8,
                  scale: 1.02,
                  transition: { type: "spring", stiffness: 300, damping: 20 },
                }}
                className="relative bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-lg transition-all duration-300 backdrop-blur-sm overflow-hidden cursor-pointer hover:border-purple-500/50"
              >
                <div className="p-6 flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-100 leading-tight">
                        {project.name}
                      </h3>
                      {(() => {
                        const difficulty = normalizeDifficulty(project.difficulty?.level);
                        const badgeStyles =
                          difficulty === "easy"
                            ? "bg-green-600/20 text-green-400"
                            : difficulty === "medium"
                            ? "bg-yellow-600/20 text-yellow-400"
                            : "bg-red-600/20 text-red-400";
                        return (
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${badgeStyles}`}>
                            {project.difficulty.level}
                          </span>
                        );
                      })()}
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                      {project.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.topics.slice(0, 3).map((topic) => (
                        <span
                          key={topic.id}
                          className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-full"
                        >
                          {topic.name}
                        </span>
                      ))}
                      {project.topics.length > 3 && (
                        <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded-full">
                          +{project.topics.length - 3}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-500 mb-4">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-700/50 flex justify-end">
                    <motion.button
                      whileHover={{ x: 5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openStartModal(project)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-sm font-medium"
                    >
                      <span>Start Quest</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {filteredProjects.length === 0 && !loading && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                No Projects Match
              </h3>
              <p className="text-gray-500">
                Try a different complexity to see more projects.
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

      <StartQuestModal
        isOpen={showStartModal}
        onClose={closeStartModal}
        quest={selectedQuest}
        language={language}
        onStartQuest={handleStartQuest}
        isStarting={isStartingQuest}
      />
    </>
  );
}