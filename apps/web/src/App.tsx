// ** import lib
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@daveyplate/better-auth-ui';

// ** import pages
import AuthPage from '@/pages/auth/AuthPage';
import Dashboard from '@/pages/Dashboard';

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <>
            <SignedIn>
              <Navigate to="/dashboard" replace />
            </SignedIn>
            <SignedOut>
              <Navigate to="/auth/sign-in" replace />
            </SignedOut>
          </>
        }
      />
      <Route path="/auth/:pathname" element={<AuthPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}
