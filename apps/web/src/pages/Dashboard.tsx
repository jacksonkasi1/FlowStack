// ** import lib
import { UserButton, SignedIn, SignedOut } from '@daveyplate/better-auth-ui';
import { Navigate } from 'react-router-dom';

export default function Dashboard() {
    return (
        <>
            <SignedOut>
                <Navigate to="/auth/sign-in" replace />
            </SignedOut>

            <SignedIn>
                <div className="flex min-h-screen flex-col">
                    <header className="flex items-center justify-between border-b px-6 py-4">
                        <h1 className="text-xl font-semibold">FlowStack</h1>
                        <UserButton />
                    </header>

                    <main className="flex flex-1 items-center justify-center p-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold">Welcome to FlowStack</h2>
                            <p className="mt-2 text-gray-600">You are signed in.</p>
                        </div>
                    </main>
                </div>
            </SignedIn>
        </>
    );
}
