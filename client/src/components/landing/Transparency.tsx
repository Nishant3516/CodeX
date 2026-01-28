import Link from "next/link";
import GitHubIcon from "@mui/icons-material/GitHub";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Transparency({
  id = "access",
  title,
  body,
  tiers,
  footerCta,
}: {
  id?: string;
  title: string;
  body: string;
  tiers: { name: string; features: string[]; highlight?: boolean }[];
  footerCta: { label: string; href: string };
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold text-white">{title}</h2>
          <p className="mt-4 text-gray-300 max-w-xl">{body}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-2xl px-6">
              <Link href={footerCta.href}>
                <GitHubIcon fontSize="small" />
                {footerCta.label}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-2xl border-white/15 bg-white/5 px-6">
              <Link href="mailto:team@devsarena.in">Talk to us</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative overflow-hidden backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                tier.highlight
                  ? "border-primary-500/50 bg-gradient-to-br from-primary-500/10 via-transparent to-purple-500/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {tier.highlight && (
                <div className="absolute top-0 right-0 m-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/20 px-3 py-1 text-xs font-medium text-primary-300 backdrop-blur-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500"></span>
                    </span>
                    Featured
                  </span>
                </div>
              )}
              <CardHeader className="relative">
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  {tier.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 relative">
                {tier.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 text-emerald-400">✓</span>
                    <span className="text-sm text-gray-300">{feature}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
