import Link from "next/link";
import GitHubIcon from "@mui/icons-material/GitHub";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Hero({
  headline,
  subheadline,
  cta,
  secondaryCta,
  subtext,
}: {
  headline: {type:string; text:Array<string> | string};
  subheadline: string;
  cta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  subtext: string;
}) {
  return (
    <section id="hero" className="relative mx-auto max-w-6xl px-6 pt-32 pb-20">
      <div className="grid items-center lg:grid-rows-2">
        <div className="flex flex-col items-center">
          <Badge variant="success" className="gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            Public Beta • Built for Developers
          </Badge>

          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-center">
            {headline.type == "two-liner" ? (
              <>
                <span className="block bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  {headline.text[0]}
                </span>
                <span className="block bg-gradient-to-r from-[#a78bfa] via-[#7c3aed] to-[#5b21b6] bg-clip-text text-transparent">
                  {headline.text[1]}
                </span>
              </>
            ) : (
              <span className="bg-gradient-to-br from-white via-white to-white/70 bg-clip-text text-transparent">
                {headline.text}
              </span>
            )}
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-2xl text-center">
            {subheadline}
          </p>

          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-2xl px-6 shadow-lg shadow-primary-500/25">
                <Link href={cta.href}>
                  <GitHubIcon fontSize="small" />
                  {cta.label}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-2xl border-white/20 bg-white/5 px-6 hover:bg-white/10">
                <Link href={secondaryCta.href}>
                  {secondaryCta.label}
                  <ArrowForwardIcon fontSize="small" />
                </Link>
              </Button>
            </div>
            <p className="text-sm text-gray-400">{subtext}</p>
          </div>
        </div>

        <div className="relative mt-12 lg:mt-0">
          <div className="pointer-events-none absolute -inset-10 rounded-[2.5rem] bg-gradient-to-tr from-primary-500/20 via-primary-400/10 to-transparent blur-3xl" />
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden shadow-2xl backdrop-blur-sm">
            {/* Editor Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-secondary/50 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                  <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                </div>
                <span className="text-xs text-muted-foreground ml-3 font-mono">checkpoint-03/auth-middleware.ts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono">2 tests passing</span>
              </div>
            </div>
            {/* Editor Content */}
            <div className="p-6 font-mono text-sm overflow-x-auto">
              <pre className="text-muted-foreground leading-relaxed">
                <code>
                  <span className="text-cyan-400">import</span> {`{ `}<span className="text-amber-400">NextRequest</span>{`, `}<span className="text-amber-400">NextResponse</span>{` }`} <span className="text-cyan-400">from</span> <span className="text-emerald-400">{`'next/server'`}</span>{`\n`}
                  <span className="text-cyan-400">import</span> {`{ `}<span className="text-amber-400">verifyToken</span>{` }`} <span className="text-cyan-400">from</span> <span className="text-emerald-400">{`'./lib/auth'`}</span>{`\n\n`}
                  <span className="text-cyan-400">export async function</span> <span className="text-amber-400">middleware</span>{`(req: `}<span className="text-cyan-400">NextRequest</span>{`) {\n`}
                  {`  `}<span className="text-cyan-400">const</span> token = req.cookies.<span className="text-amber-400">get</span>{`(`}<span className="text-emerald-400">{`'session'`}</span>{`)\n`}
                  {`  \n`}
                  {`  `}<span className="text-cyan-400">if</span> {`(!token) {\n`}
                  {`    `}<span className="text-cyan-400">return</span> NextResponse.<span className="text-amber-400">redirect</span>{`(`}<span className="text-emerald-400">{`'/login'`}</span>{`)\n`}
                  {`  }\n`}
                  {`}`}
                </code>
              </pre>
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
