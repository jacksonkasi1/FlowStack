// ** import lib
import { createFileRoute } from '@tanstack/react-router';
import { AuthView } from '@daveyplate/better-auth-ui';

export const Route = createFileRoute('/reset-password')({
    component: ResetPassword,
});

function ResetPassword() {
    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <AuthView view="RESET_PASSWORD" redirectTo="/auth/sign-in" />
        </main>
    );
}
