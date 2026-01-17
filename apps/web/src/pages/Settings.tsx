// ** import lib
import {
  UpdateAvatarCard,
  UpdateNameCard,
  ChangeEmailCard,
  ChangePasswordCard,
  SessionsCard,
  DeleteAccountCard,
} from "@daveyplate/better-auth-ui";

/**
 * Minimal settings page using consolidated components
 * - Hidden descriptions/instructions via classNames
 * - Reduced gaps and padding
 * - Clean, minimal layout
 */
export default function Settings() {
  // Minimal card styling to hide descriptions and reduce visual noise
  const minimalCardStyles = {
    cards: "gap-3",
    card: {
      base: "shadow-none border-border/40 gap-3",
      // header: "pb-0",
      title: "text-base",
      // description: "hidden", // Hide header descriptions
      content: "py-3",
      footer: "py-3",
      // instructions: "hidden", // Hide footer instructions
    },
  };

  return (
    <main className="mx-auto max-w-lg py-8 px-4">
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
    </main>
  );
}
