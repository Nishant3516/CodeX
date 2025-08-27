"use client"
import React, { useState } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { 
    ArrowRight,
    Loader2 
} from 'lucide-react'
import { PLAYGROUND_OPTIONS } from '@/constants/playground';



export default function PlaygroundPage() {
    const [loading, setLoading] = useState<string | null>(null);

    async function startLab(language: string, id: string) {
        setLoading(id);
        try {
            const res = await fetch('/api/project/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language })
            });

            if (!res.ok) throw new Error('Failed to start lab instance');

            const data = await res.json();
            const labId = data?.labId;
            if (!labId) throw new Error('No labId returned from server');

            // Redirect to the project page
            window.location.href = `/v1/project/${language}/${labId}`;
        } catch (e) {
            console.error(e);
            alert('Failed to start lab. Please try again.');
            setLoading(null);
        }
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100
            }
        }
    };

    return (
        <>
            {/* Font import for better typography */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700;800&display=swap');
                .font-poppins {
                    font-family: 'Poppins', sans-serif;
                }
            `}</style>
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-8 font-inter">
                <motion.header 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center text-center mb-10"
                >
                    <img src="/logos/white.svg" alt="DevsArena Logo" width={80} height={80} className="mb-4" />
                    <h1 className="text-4xl sm:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-red-500">
                        DevsArena Playground
                    </h1>
                    <p className="mt-3 text-lg text-gray-400 max-w-2xl">
                        Choose a template to instantly launch a secure, cloud-based development environment.
                    </p>
                </motion.header>

                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 w-full max-w-4xl"
                >
                    {PLAYGROUND_OPTIONS.map(opt => (
                        <motion.div 
                            key={opt.id}
                            variants={itemVariants}
                            className={`bg-gray-800/50 border ${opt.color} rounded-xl shadow-lg transition-all duration-300 backdrop-blur-sm overflow-hidden cursor-pointer`}
                        >
                            <div className="p-6 flex flex-col h-full">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-gray-900 rounded-lg">
                                        {opt.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-100">{opt.label}</h3>
                                        <p className="text-gray-400 mt-1 flex-grow">{opt.info}</p>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-gray-700/50 flex justify-end">
                                    <motion.button
                                        disabled={!!loading}
                                        onClick={() => startLab(opt.language, opt.id)}
                                        whileHover={{ scale: loading ? 1 : 1.05 }}
                                        whileTap={{ scale: loading ? 1 : 0.95 }}
                                        className={`px-6 py-2 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors duration-300 text-sm ${
                                            loading && loading !== opt.id
                                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                : 'bg-purple-600 text-white hover:bg-purple-700'
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
                                                    className="flex items-center gap-2"
                                                >
                                                    <span>Start Lab</span>
                                                    <ArrowRight className="w-5 h-5" />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </>
    )
}
