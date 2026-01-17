// ** import types
import type { ReactNode } from "react";

// ** import lib
import { UserButton } from "@daveyplate/better-auth-ui";
import { Link } from "react-router-dom";

// ** import components
import { ModeToggle } from "@/components/ui/mode-toggle";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link to="/dashboard">
          <h1 className="text-xl font-semibold hover:opacity-80 transition-opacity">
            FlowStack
          </h1>
        </Link>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserButton size="icon" />
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
