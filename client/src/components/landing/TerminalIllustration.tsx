import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const lines: Array<{ text: string; tone?: "muted" | "ok" | "warn" | "err" }> = [
  { text: "$ create playground react --name trello-clone", tone: "muted" },
  { text: "Creating sandbox...", tone: "muted" },
  { text: "✓ Node 20 • pnpm • Vite", tone: "ok" },
  { text: "✓ Installing dependencies", tone: "ok" },
  { text: "$ pnpm test", tone: "muted" },
  { text: "FAIL checkpoint_2 • 1 failing test", tone: "err" },
  { text: "Hint: handle empty lists and return 200", tone: "warn" },
  { text: "$ pnpm test", tone: "muted" },
  { text: "PASS checkpoint_2 • all tests green", tone: "ok" },
];

function toneClass(t?: string) {
  switch (t) {
    case "ok":
      return "text-emerald-200";
    case "warn":
      return "text-yellow-200";
    case "err":
      return "text-red-200";
    default:
      return "text-gray-300";
  }
}

export default function TerminalIllustration() {
  return (
    <Card className="overflow-hidden bg-black/40">
      <CardHeader className="border-b border-white/10 bg-black/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Playground</CardTitle>
          <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-300">
            sandbox-01
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="rounded-2xl border border-white/10 bg-black/50 p-4 font-mono text-xs leading-5">
          {lines.map((l, i) => (
            <div key={i} className={toneClass(l.tone)}>
              {l.text}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] font-medium text-gray-200">Instant</div>
            <div className="mt-1 text-xs text-gray-400">New env in seconds.</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] font-medium text-gray-200">Terminal</div>
            <div className="mt-1 text-xs text-gray-400">Run scripts & tools.</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] font-medium text-gray-200">Persistent</div>
            <div className="mt-1 text-xs text-gray-400">State stays put.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
