// ** import types
import type { ReactNode } from 'react';

// ** import lib
import { AuthUIProvider } from '@daveyplate/better-auth-ui';
import { useRouter, Link } from '@tanstack/react-router';

// ** import utils
import { authClient } from '@/lib/auth-client';

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
    const router = useRouter();

    const navigateWrapper = (href: string) => {
        router.navigate({ to: href });
    };

    return (
        <AuthUIProvider
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            authClient={authClient as any}
            navigate={navigateWrapper}
            Link={LinkWrapper}
        >
            {children}
        </AuthUIProvider>
    );
}

