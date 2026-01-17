// ** import core packages
import { useEffect, useState } from 'react';

// ** import lib
import { createFileRoute, useRouter } from '@tanstack/react-router';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

export const Route = createFileRoute('/verify-email')({
    component: VerifyEmail,
});

function VerifyEmail() {
    const router = useRouter();
    const search = Route.useSearch() as { token?: string };
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');

    useEffect(() => {
        const verifyEmail = async () => {
            const token = search.token;

            if (!token) {
                setStatus('error');
                setErrorMessage('Invalid verification link. No token provided.');
                return;
            }

            try {
                // Call better-auth verify endpoint with the token
                const response = await fetch(
                    `${baseURL}/api/auth/verify-email?token=${token}&callbackURL=/dashboard`,
                    {
                        method: 'GET',
                        credentials: 'include',
                    }
                );

                if (response.ok) {
                    setStatus('success');
                    // Redirect to dashboard after 2 seconds
                    setTimeout(() => {
                        router.navigate({ to: '/dashboard', replace: true });
                    }, 2000);
                } else {
                    const data = await response.json();
                    setStatus('error');
                    setErrorMessage(
                        data.message || 'Failed to verify email. The link may have expired.'
                    );
                }
            } catch (error) {
                setStatus('error');
                setErrorMessage('An error occurred while verifying your email. Please try again.');
                console.error('Email verification error:', error);
            }
        };

        verifyEmail();
    }, [search.token, router]);

    const handleGoToSignIn = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.navigate({ to: '/auth/sign-in' as any, replace: true });
    };

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-lg">
                {status === 'loading' && (
                    <div className="space-y-4">
                        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <h1 className="text-2xl font-semibold">Verifying your email...</h1>
                        <p className="text-muted-foreground">
                            Please wait while we verify your email address.
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                            <svg
                                className="h-6 w-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-semibold text-green-600">Email Verified!</h1>
                        <p className="text-muted-foreground">
                            Your email has been successfully verified. Redirecting to dashboard...
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                            <svg
                                className="h-6 w-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-semibold text-red-600">Verification Failed</h1>
                        <p className="text-muted-foreground">{errorMessage}</p>
                        <button
                            onClick={handleGoToSignIn}
                            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            Go to Sign In
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
