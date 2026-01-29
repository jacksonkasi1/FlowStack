// ** import types
import type { ReactNode } from "react";

// ** import lib
import { UserButton } from "@daveyplate/better-auth-ui";
import { Link } from "react-router-dom";

// ** import components
import { ModeToggle } from "@/components/ui/mode-toggle";
import { EmailVerificationBanner } from "@repo/auth-ui/guards/react-router";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-6">
          <Link to="/dashboard">
            <h1 className="text-xl font-semibold hover:opacity-80 transition-opacity">
              FlowStack
            </h1>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/organization/members"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Team
            </Link>
            <Link
              to="/organization/settings"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Organization
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/account/settings"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Profile
          </Link>
          <ModeToggle />
          <UserButton size="icon" />
        </div>
      </header>

      <EmailVerificationBanner />

      <main className="flex-1">{children}</main>
    </div>
  );
}

