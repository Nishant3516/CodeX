import Image from "next/image";
import Link from "next/link";
import GitHubIcon from "@mui/icons-material/GitHub";

import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-30">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/35 to-transparent" />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="relative flex items-center gap-3">
          <Image
            src="/logos/white.svg"
            alt="DevsArena"
            width={140}
            height={32}
            priority
            className="h-7 w-auto"
          />
        </Link>

        <div className="relative flex items-center gap-2">
          <Button asChild size="sm" className="h-10 rounded-xl px-4 gap-2">
            <Link href="#">
              <GitHubIcon fontSize="small" />
              Join via GitHub
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
