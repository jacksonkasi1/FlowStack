// ** import types
import type { ReactNode } from "react";

// ** import lib
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { useNavigate, Link } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

// ** import utils
import { authClient } from "@/lib/auth-client";

// ** import config
import { APP_URLS } from "@/config/urls";
import {
  getOrganizationProviderConfig,
  createLogoUploadHandler,
  createLogoDeleteHandler,
} from "@/config/organization";

// ** import rest-api
import { deleteAvatar, uploadAvatar } from "@/rest-api/storage";
import { getUploadUrl } from "@/rest-api/storage/get-upload-url";
import { deleteFile } from "@/rest-api/storage/delete-file";

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

  const logoUploadHandler = createLogoUploadHandler(getUploadUrl);
  const logoDeleteHandler = createLogoDeleteHandler(deleteFile);

  return (
    <ThemeProvider defaultTheme="light" storageKey="flowstack-ui-theme">
      <AuthUIProvider
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        authClient={authClient as any}
        baseURL={APP_URLS.frontend}
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
        {...getOrganizationProviderConfig({
          logoUpload: logoUploadHandler,
          logoDelete: logoDeleteHandler,
        })}
      >
        {children}
        <Toaster />
      </AuthUIProvider>
    </ThemeProvider>
  );
}
