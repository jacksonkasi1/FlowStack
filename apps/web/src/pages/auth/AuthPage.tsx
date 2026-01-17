// ** import lib
import { useParams } from 'react-router-dom';
import { AuthView } from '@daveyplate/better-auth-ui';

export default function AuthPage() {
    const { pathname } = useParams();

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <AuthView pathname={pathname} />
        </main>
    );
}
