// ** import lib
import {
    ChangeEmailCard,
    ChangePasswordCard,
    DeleteAccountCard,
    SessionsCard,
    UpdateAvatarCard,
    UpdateNameCard,
} from "@daveyplate/better-auth-ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/account/settings")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <main className="container mx-auto max-w-5xl p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Account Settings</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your profile, security preferences, and connected accounts
                </p>
            </div>

            <div className="space-y-8">
                {/* Account Settings Section */}
                <section>
                    <h2 className="mb-4 text-xl font-semibold">Profile</h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        <UpdateAvatarCard />
                        <UpdateNameCard />
                    </div>
                    <div className="mt-6">
                        <ChangeEmailCard />
                    </div>
                </section>

                {/* Security Settings Section */}
                <section>
                    <h2 className="mb-4 text-xl font-semibold">Security</h2>
                    <div className="space-y-6">
                        <ChangePasswordCard />
                        <SessionsCard />
                        {/* Commented out - Shows duplicate Google since user is already signed in via Google */}
                        {/* <ProvidersCard /> */}
                    </div>
                </section>

                {/* Danger Zone */}
                <section>
                    <h2 className="mb-4 text-xl font-semibold text-destructive">
                        Danger Zone
                    </h2>
                    <DeleteAccountCard />
                </section>
            </div>
        </main>
    );
}
