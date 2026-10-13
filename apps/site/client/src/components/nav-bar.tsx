import { Link } from "wouter";
import { ExternalLink } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

export function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <BrandMark size={26} />
            <span className="font-heading text-[17px] font-semibold tracking-[-0.01em]">RWA&middot;ID</span>
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <a href="https://dashboard.rwa-id.com" target="_blank" rel="noopener noreferrer">
              <Button
                variant="ghost"
                size="sm"
                data-testid="link-dashboard-nav"
              >
                Platform Dashboard
                <ExternalLink className="ml-1.5 h-3 w-3" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
