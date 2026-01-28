import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Methodology({
  id = "guided-projects",
  title,
  body,
  bullets,
  tracksTitle,
  tracks,
  illustration,
  cta,
}: {
  id?: string;
  title: string;
  body: string;
  bullets: { icon: string; label: string; description: string }[];
  tracksTitle: string;
  tracks: { label: string; status: string }[];
  illustration?: React.ReactNode;
  cta?: { label: string; href: string };
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold text-white">{title}</h2>
          <p className="mt-4 text-gray-300 max-w-xl">{body}</p>

          <div className="mt-8 grid gap-4">
            {bullets.map((b, idx) => {
              const accentColors = [
                "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
                "from-primary-500/20 to-primary-500/5 border-primary-500/30",
                "from-blue-500/20 to-blue-500/5 border-blue-500/30",
              ];
              return (
                <Card
                  key={b.label}
                  className={`relative overflow-hidden transition-all duration-300 hover:border-white/30 hover:shadow-lg hover:-translate-y-0.5 bg-gradient-to-br ${accentColors[idx]}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
                  <CardHeader className="pb-3 relative">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl" role="img" aria-label={b.label}>{b.icon}</span>
                      <CardTitle className="text-base">{b.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-300 relative">
                    {b.description}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {cta && (
            <div className="mt-8">
              <Link
                href={cta.href}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
              >
                {cta.label}
                <span aria-hidden>→</span>
              </Link>
            </div>
          )}
        </div>

        <div>{illustration}</div>
      </div>
    </section>
  );
}
