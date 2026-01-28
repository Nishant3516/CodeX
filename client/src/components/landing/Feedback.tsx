import Link from "next/link";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Feedback({
  id = "feedback",
  title,
  body,
  options,
}: {
  id?: string;
  title: string;
  body: string;
  options: {
    type: "feedback" | "contribute";
    icon: string;
    title: string;
    description: string;
    cta: { label: string; href: string };
  }[];
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          {title}
        </h2>
        <p className="mt-4 text-gray-300 max-w-2xl mx-auto">{body}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {options.map((option) => {
          const accentColors =
            option.type === "feedback"
              ? "from-blue-500/20 to-blue-500/5 border-blue-500/30 hover:border-blue-400/50"
              : "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 hover:border-emerald-400/50";

          return (
            <Card
              key={option.type}
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-gradient-to-br ${accentColors}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
              <CardHeader className="relative pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl" role="img" aria-label={option.title}>
                    {option.icon}
                  </span>
                  <CardTitle className="text-xl">{option.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <p className="text-sm text-gray-300">{option.description}</p>
                <Button
                  asChild
                  variant={option.type === "feedback" ? "default" : "secondary"}
                  className="w-full rounded-xl gap-2"
                >
                  <Link href={option.cta.href}>
                    {option.cta.label}
                    <ArrowForwardIcon fontSize="small" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
