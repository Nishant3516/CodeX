export type SiteContent = {
  hero: {
    headline: {
        type:string;
        text: Array<string> | string
    };
    subheadline: string;
    cta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    subtext: string;
  };
  guidedProjects: {
    title: string;
    body: string;
    bullets: { icon: string; label: string; description: string }[];
    tracksTitle: string;
    tracks: { label: string; status: string }[];
  };
  playgrounds: {
    title: string;
    body: string;
    features: { icon: string; label: string; description: string }[];
  };
  access: {
    title: string;
    body: string;
    tiers: { name: string; features: string[]; highlight?: boolean }[];
    note: string;
    footerCta: { label: string; href: string };
  };
  feedback: {
    title: string;
    subtitle: string;
    options: {
      type: 'feedback' | 'contribute';
      title: string;
      description: string;
      cta: { label: string; href: string };
      icon: string;
    }[];
  };
  footer: {
    tagline: string;
    socials: { platform: string; url: string; icon: string }[];
    copyright: string;
    builtBy: string;
  };
};

export const siteContent: SiteContent = {
  hero: {
    headline: {
      type: "two-liner",
      text: ["Build Complex Software.", "One Checkpoint at a Time."]
    },
    subheadline:
      "Stop copying code from 10-hour videos. We provide the architecture and a roadmap broken into testable milestones. You write the code, debug the errors, and learn by making it work.",
    cta: { label: "Get Started", href: "/api/auth/github" },
    secondaryCta: { label: "See Guided Projects", href: "#guided-projects" },
    subtext: "No credit card required.",
  },
  guidedProjects: {
    title: "Code. Break. Debug. Deploy",
    body:
      "We built a custom test runner to drive your progress. You don't learn by consuming content; you learn by fixing failing builds and verifying your solution—one checkpoint at a time.",
    bullets: [
      {
        icon: "🗺️",
        label: "The Roadmap",
        description:
          "Tackle professional-grade specs (like 'Build a Trello Clone') broken down into logical milestones.",
      },
      {
        icon: "⚡",
        label: "The Engine",
        description:
          "Our in-house validation system checks your logic in real-time.",
      },
      {
        icon: "✅",
        label: "The Outcome",
        description:
          "You don't just write code; you prove it works.",
      },
    ],
    tracksTitle: "🚀 Available Tracks",
    tracks: [
      { label: "React JS", status: "Live" },
      { label: "Vanilla JS", status: "Live" },
      { label: "Node & Express", status: "Coming Soon" },
    ],
  },
  playgrounds: {
    title: "Instant Cloud Sandboxes.",
    body:
      "Launch fresh React, Node, or JS environments in seconds. No configuration, no version conflicts—just pure coding flow.",
    features: [
      {
        icon: "⚡",
        label: "Instant Spin-Up",
        description: "Fresh sandbox ready in seconds—no downloads, no config.",
      },
      {
        icon: "🔧",
        label: "Full Terminal Access",
        description:
          "Install packages, run scripts, and debug with complete shell access.",
      },
      {
        icon: "💾",
        label: "Auto-Persist State",
        description:
          "Your code, dependencies, and files stay exactly as you left them.",
      },
    ],
  },
  access: {
    title: "Built by Devs, For Devs.",
    body:
      "We're in Public Beta, building the ultimate developer experience. Join us and get free access to everything while we perfect the platform together.",
    tiers: [
      {
        name: "Public Beta Access",
        highlight: true,
        features: [
          "8 Active Playgrounds (2 per language)",
          "10 Guided Project Labs",
          "Full terminal & package manager access",
          "Auto-save & persistent environments",
          "Real-time test validation",
        ],
      },
    ],
    note:
      "💬 Building something massive? Need higher limits? Drop us a message—we're happy to support serious builders pushing the platform.",
    footerCta: { label: "Join via GitHub", href: "/api/auth/github" },
  },
  feedback: {
    title: "Help Us Build Better",
    subtitle: "Your input shapes the platform. Whether you want to share feedback or contribute code, we'd love to hear from you.",
    options: [
      {
        type: 'feedback',
        icon: "💬",
        title: "Share Feedback",
        description: "Found a bug? Have a feature idea? Let us know what would make your experience better.",
        cta: { label: "Send Feedback", href: "mailto:kommerakrishnachaitanya@gmail.com?subject=Feedback" },
      },
      {
        type: 'contribute',
        icon: "🛠️",
        title: "Contribute to DevsArena",
        description: "Help us build the platform. Contribute to our open-source codebase or submit guided project ideas.",
        cta: { label: "View on GitHub", href: "https://github.com/KrishnaChaitanya45/codex" },
      },
    ],
  },
  footer: {
    tagline: "Learn by building. One checkpoint at a time.",
    socials: [
      { platform: "GitHub", url: "https://github.com/KrishnaChaitanya45", icon: "github" },
      { platform: "Twitter", url: "https://x.com/KrishnaWyvern", icon: "twitter" },
    ],
    copyright: "© 2026 DevsArena. Built with 💜 by Krishna.",
    builtBy: "Krishna",
  },
};
