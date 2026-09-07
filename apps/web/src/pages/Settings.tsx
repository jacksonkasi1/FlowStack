// ** import lib
import {
  UpdateAvatarCard,
  UpdateNameCard,
  ChangeEmailCard,
  ChangePasswordCard,
  SessionsCard,
  DeleteAccountCard,
} from "@daveyplate/better-auth-ui";

// ** import components
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@repo/auth-ui/guards/react-router";

// ** import shared config
import { minimalCardStyles } from "@repo/config";

export default function Settings() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-lg py-8 px-4">
          <h1 className="text-xl font-semibold mb-6">Settings</h1>

          <div className="space-y-6">
            <section>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Profile
              </h2>
              <div className="flex flex-col gap-3">
                <UpdateAvatarCard classNames={minimalCardStyles.card} />
                <UpdateNameCard classNames={minimalCardStyles.card} />
                <ChangeEmailCard classNames={minimalCardStyles.card} />
              </div>
            </section>

            <section>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Security
              </h2>
              <div className="flex flex-col gap-3">
                <ChangePasswordCard classNames={minimalCardStyles.card} />
                <SessionsCard
                  className="shadow-none border-border/40"
                  classNames={{
                    cell: "shadow-none border-border/40",
                  }}
                />
                <DeleteAccountCard classNames={minimalCardStyles.card} />
              </div>
            </section>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
