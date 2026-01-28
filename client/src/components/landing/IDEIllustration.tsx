import { CheckCircle2, Terminal, Zap, Box, RefreshCw, Code2, Rocket } from "lucide-react"


export default function IDEIllustration() {
  return (
             <div className="mt-16 rounded-xl border border-border bg-secondary/30 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-secondary/50 border-b border-border">
              <Rocket className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-mono">Project Progress</span>
            </div>
            <div className="p-6 space-y-3">
              <ProgressItem status="complete" label="Checkpoint 01" description="Setup project structure" />
              <ProgressItem status="complete" label="Checkpoint 02" description="Database schema design" />
              <ProgressItem status="active" label="Checkpoint 03" description="Auth middleware implementation" />
              <ProgressItem status="locked" label="Checkpoint 04" description="API routes & validation" />
              <ProgressItem status="locked" label="Checkpoint 05" description="Frontend integration" />
            </div>
          </div>
  );
}


function ProgressItem({ status, label, description }: { status: "complete" | "active" | "locked"; label: string; description: string }) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
      status === "complete" ? "bg-emerald-500/10 border border-emerald-500/20" :
      status === "active" ? "bg-amber-500/10 border border-amber-500/20" :
      "bg-secondary/50 border border-border opacity-50"
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        status === "complete" ? "bg-emerald-500" :
        status === "active" ? "bg-amber-500" :
        "bg-muted"
      }`}>
        {status === "complete" ? (
          <CheckCircle2 className="w-4 h-4 text-background" />
        ) : status === "active" ? (
          <Rocket className="w-4 h-4 text-background" />
        ) : (
          <div className="w-2 h-2 rounded-full border-2 border-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <span className={`text-xs font-mono shrink-0 ${
        status === "complete" ? "text-emerald-400" :
        status === "active" ? "text-amber-400" :
        "text-muted-foreground"
      }`}>
        {status === "complete" ? "PASSED" : status === "active" ? "IN PROGRESS" : "LOCKED"}
      </span>
    </div>
  )
}
