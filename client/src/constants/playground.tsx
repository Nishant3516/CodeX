import { 
    Code, 
    Rocket, 
    Server, 
    ArrowRight,
    FileCode, // Icon for Vanilla JS
    Loader2 // For loading spinner
} from 'lucide-react'

// Constants provided by the user
export type PlaygroundOption = {
  id: string
  label: string
  language: string
  info?: string
  icon: React.ReactNode
  color: string
  mainFile:string
}

export const PLAYGROUND_OPTIONS: PlaygroundOption[] = [
    {
        id: 'react',
        label: 'React (Vite)',
        language: 'react',
        info: 'Vite + React app (you can run `npm run dev` from the PTY)',
        icon: <Code className="w-8 h-8 text-purple-400" />,
        color: 'border-purple-500/50 hover:border-purple-500',
        mainFile: "App.jsx"
    },
    {
        id: 'node-express',
        label: 'Express.js App',
        language: 'node-express',
        info: 'Node + Express web app',
        icon: <Server className="w-8 h-8 text-red-400" />,
        color: 'border-red-500/50 hover:border-red-500',
        mainFile:"index.js"
    },
    {
        id: 'node',
        label: 'Node.js App',
        language: 'node',
        info: 'Plain Node.js project',
        icon: <Rocket className="w-8 h-8 text-purple-400" />,
        color: 'border-purple-500/50 hover:border-purple-500',
        mainFile:"index.js"
    },
    {
        id: 'vanilla-js',
        label: 'HTML / CSS / JS (Vanilla)',
        language: 'vanilla-js',
        info: 'Simple static site (HTML/CSS/JS)',
        icon: <FileCode className="w-8 h-8 text-red-400" />,
        color: 'border-red-500/50 hover:border-red-500',
        "mainFile":"index.html"
    },
]

export const BACKEND_URL = process.env.BACKEND_API_URL