// ** import types
import type { ReactNode } from "react";

// ** import lib
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { useNavigate, Link } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

// ** import utils
import { authClient } from "@/lib/auth-client";
import { SessionSync, StartupSplash, notifySessionChange } from "@repo/auth-ui";
import { AUTH_LOCALIZATION } from "@repo/config";

// ** import config
import { APP_URLS } from "@/config/urls";
import { getOrganizationProviderConfig } from "@/config/organization";
import { isOrganizationMode, TEMPLATE_FEATURES } from "@repo/config";

// ** import rest-api
import { deleteAvatar, uploadAvatar } from "@/rest-api/storage";

interface LinkWrapperProps {
  href: string;
  className?: string;
  children: ReactNode;
}

function LinkWrapper({ href, className, children }: LinkWrapperProps) {
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const navigate = useNavigate();

  // Get organization provider config (simplified - only name field for signup)
  const orgConfig = getOrganizationProviderConfig();

  return (
    <ThemeProvider defaultTheme="light" storageKey="flowstack-ui-theme">
      <AuthUIProvider
        authClient={authClient as any}
        localization={AUTH_LOCALIZATION}
        onSessionChange={() => notifySessionChange(authClient)}
        baseURL={APP_URLS.frontend}
        redirectTo="/dashboard"
        navigate={navigate}
        Link={LinkWrapper}
        social={
          TEMPLATE_FEATURES.googleAuth ? { providers: ["google"] } : undefined
        }
        magicLink={TEMPLATE_FEATURES.email}
        account={{
          fields: ["image", "name"],
        }}
        avatar={
          TEMPLATE_FEATURES.storage
            ? { upload: uploadAvatar, delete: deleteAvatar }
            : undefined
        }
        additionalFields={orgConfig.additionalFields}
        signUp={orgConfig.signUp}
        organization={isOrganizationMode() ? orgConfig.organization : undefined}
      >
        <SessionSync client={authClient} />
        <StartupSplash />
        {children}
        <Toaster />
      </AuthUIProvider>
    </ThemeProvider>
  );
}
