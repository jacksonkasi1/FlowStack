// ** import core packages
import { useState } from 'react';

// ** import lib
import { createFileRoute, useRouter } from '@tanstack/react-router';

// ** import utils
import { authClient } from '@/lib/auth-client';

export const Route = createFileRoute('/reset-password')({
    component: ResetPassword,
});

function ResetPassword() {
    const router = useRouter();
    const search = Route.useSearch() as { token?: string };
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const token = search.token;

    const handleGoToSignIn = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.navigate({ to: '/auth/sign-in' as any, replace: true });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            setStatus('error');
            setErrorMessage('Invalid reset link. No token provided.');
            return;
        }

        if (password.length < 8) {
            setStatus('error');
            setErrorMessage('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setStatus('error');
            setErrorMessage('Passwords do not match.');
            return;
        }

        setStatus('loading');
        setErrorMessage('');

        try {
            const response = await authClient.resetPassword({
                newPassword: password,
                token,
            });

            if (response.error) {
                setStatus('error');
                setErrorMessage(
                    response.error.message || 'Failed to reset password. The link may have expired.'
                );
            } else {
                setStatus('success');
                // Redirect to sign in after 2 seconds
                setTimeout(() => {
                    handleGoToSignIn();
                }, 2000);
            }
        } catch (error) {
            setStatus('error');
            setErrorMessage(
                'An error occurred while resetting your password. Please try again.'
            );
            console.error('Password reset error:', error);
        }
    };

    if (!token) {
        return (
            <main className="flex min-h-screen items-center justify-center p-4">
                <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-lg">
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
                        <h1 className="text-2xl font-semibold text-red-600">Invalid Link</h1>
                        <p className="text-muted-foreground">
                            This password reset link is invalid.
                        </p>
                        <button
                            onClick={handleGoToSignIn}
                            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            Go to Sign In
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-lg">
                {status === 'success' ? (
                    <div className="space-y-4 text-center">
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
                        <h1 className="text-2xl font-semibold text-green-600">Password Reset!</h1>
                        <p className="text-muted-foreground">
                            Your password has been successfully reset. Redirecting to sign in...
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-semibold">Reset Your Password</h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Enter your new password below
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium">
                                    New Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="Enter your new password"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="confirmPassword"
                                    className="block text-sm font-medium"
                                >
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="Confirm your new password"
                                />
                            </div>
                        </div>

                        {status === 'error' && (
                            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                                {errorMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                            {status === 'loading' ? 'Resetting Password...' : 'Reset Password'}
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={handleGoToSignIn}
                                className="text-sm text-muted-foreground hover:text-primary"
                            >
                                Back to Sign In
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </main>
    );
}
