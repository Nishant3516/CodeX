import {
  Code,
  Rocket,
  Server,
  ArrowRight,
  FileCode, // Icon for Vanilla JS
  Loader2, // For loading spinner
  Palette,
  Zap,
  Globe
} from "lucide-react";

// Constants provided by the user
export type PlaygroundOption = {
  id: string;
  label: string;
  language: string;
  info?: string;
  icon: React.ReactNode;
  isLive: boolean;
  color: string;
  mainFile: string;
  initCommand?: string;
  startCommands?: string[];
};

export const PLAYGROUND_OPTIONS: PlaygroundOption[] = [
  {
    id: "react",
    label: "React (Vite)",
    language: "react",
    isLive: true,
    info: "⚡ Lightning-fast development with Vite + React. Perfect for modern web apps with hot reload.",
    icon: <Zap className="w-8 h-8 text-purple-400" />,
    color: "border-purple-500/50 hover:border-purple-500",
    mainFile: "App.jsx",
    initCommand: "npm install",
    startCommands: ["npm run dev"],
  },
  {
    id: "node-express",
    isLive: true,
    label: "Express.js App",
    language: "node-express",
    info: "🚀 Full-stack Node.js with Express. Build REST APIs and web applications with ease.",
    icon: <Server className="w-8 h-8 text-red-400" />,
    color: "border-red-500/50 hover:border-red-500",
    mainFile: "index.js",
    initCommand: "npm install",
    startCommands: ["npm run dev"],
  },
  {
    id: "node",
    label: "Node.js App",
    language: "node",
    isLive: true,
    info: "📦 Pure Node.js environment. Perfect for backend services and command-line tools.",
    icon: <Rocket className="w-8 h-8 text-purple-400" />,
    color: "border-purple-500/50 hover:border-purple-500",
    mainFile: "index.js",
    startCommands: ["node index.js"],
  },
  {
    id: "vanilla-js",
    isLive: true,
    label: "HTML / CSS / JS (Vanilla)",
    language: "vanilla-js",
    info: "🎨 Classic web development. HTML, CSS, and JavaScript - the foundation of the web.",
    icon: <Palette className="w-8 h-8 text-red-400" />,
    color: "border-red-500/50 hover:border-red-500",
    mainFile: "index.html",
  },
];

export const BACKEND_URL = process.env.BACKEND_API_URL;
