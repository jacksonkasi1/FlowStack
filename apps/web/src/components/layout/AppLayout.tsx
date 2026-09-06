import { OrganizationMenu } from "@repo/auth-ui";
import { isOrganizationMode } from "@repo/config";
// ** import types
import type { ReactNode } from "react";

// ** import lib
import { UserButton } from "@daveyplate/better-auth-ui";
import { Link } from "react-router-dom";

// ** import components
import { ModeToggle } from "@/components/ui/mode-toggle";
import { EmailVerificationBanner } from "@repo/auth-ui/guards/react-router";
import { authClient } from "@/lib/auth-client";
import { EMAIL_VERIFICATION_CONFIG } from "@/config/email-verification";

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
          {isOrganizationMode() && (
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
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/account/settings"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Profile
          </Link>
          <OrganizationMenu client={authClient} />
          <ModeToggle />
          <UserButton size="icon" />
        </div>
      </header>

      <EmailVerificationBanner
        mode={EMAIL_VERIFICATION_CONFIG.mode}
        message={EMAIL_VERIFICATION_CONFIG.bannerMessage}
        authClient={authClient}
      />

      <main className="flex-1">{children}</main>
    </div>
  );
}
