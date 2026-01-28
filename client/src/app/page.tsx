import Squares from "@/components/landing/Squares";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import Methodology from "@/components/landing/Methodology";
import Tooling from "@/components/landing/Tooling";
import Transparency from "@/components/landing/Transparency";
import Feedback from "@/components/landing/Feedback";
import IDEIllustration from "@/components/landing/IDEIllustration";
import TerminalIllustration from "@/components/landing/TerminalIllustration";
import { siteContent } from "./content";

export default function Home() {
  return (
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
      <Hero
        headline={siteContent.hero.headline}
        subheadline={siteContent.hero.subheadline}
        cta={siteContent.hero.cta}
        secondaryCta={siteContent.hero.secondaryCta}
        subtext={siteContent.hero.subtext}
      />
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-[-10%] h-96 bg-gradient-to-b from-primary-500/15 via-transparent to-transparent blur-3xl" />
        <Methodology
          id="guided-projects"
          title={siteContent.guidedProjects.title}
          body={siteContent.guidedProjects.body}
          bullets={siteContent.guidedProjects.bullets}
          tracksTitle={siteContent.guidedProjects.tracksTitle}
          tracks={siteContent.guidedProjects.tracks}
          illustration={<IDEIllustration />}
          cta={{ label: "Try Guided Projects", href: "/projects" }}
        />
        <Tooling
          id="playgrounds"
          title={siteContent.playgrounds.title}
          body={siteContent.playgrounds.body}
          features={siteContent.playgrounds.features}
          illustration={<TerminalIllustration />}
          cta={{ label: "Explore Playgrounds", href: "/playground" }}
        />
        <Transparency
          id="access"
          title={siteContent.access.title}
          body={siteContent.access.body}
          tiers={siteContent.access.tiers}
          footerCta={siteContent.access.footerCta}
        />
        <Feedback
          title={siteContent.feedback.title}
          body={siteContent.feedback.subtitle}
          options={siteContent.feedback.options}
        />
      </div>
      <Footer
        tagline={siteContent.footer.tagline}
        socials={siteContent.footer.socials}
        copyright={siteContent.footer.copyright}
        builtBy={siteContent.footer.builtBy}
      />
    </main>
  );
}
