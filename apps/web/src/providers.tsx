// ** import types
import type { ReactNode } from "react";

// ** import lib
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { useNavigate, Link } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// ** import utils
import { authClient } from "@/lib/auth-client";

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

  return (
    <AuthUIProvider
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authClient={authClient as any}
      navigate={navigate}
      Link={LinkWrapper}
      social={{
        providers: ["google"],
      }}
      magicLink={true}
      account={{
        fields: ["image", "name"],
      }}
      avatar={{
        upload: uploadAvatar,
        delete: deleteAvatar,
      }}
    >
      {children}
      <Toaster />
    </AuthUIProvider>
  );
}
