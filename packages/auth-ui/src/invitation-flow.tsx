import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { INVITATION_CONFIG } from "@repo/config";
import { Eye, EyeOff } from "lucide-react";

const button =
  "inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex min-h-10 items-center justify-center rounded-md border bg-background px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";
const inputBase =
  "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 read-only:cursor-not-allowed read-only:bg-muted";
const input = `mt-1.5 ${inputBase}`;

function InvitationPasswordInput({ choice }: { choice: "signup" | "signin" }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block text-sm font-medium">
      Password
      <span className="relative mt-1.5 block">
        <input
          className={`${inputBase} pr-11`}
          name="password"
          type={visible ? "text" : "password"}
          autoComplete={
            choice === "signup" ? "new-password" : "current-password"
          }
          minLength={8}
          required
        />
        <button
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-1 right-1 inline-flex w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="size-4" />
          ) : (
            <Eye aria-hidden="true" className="size-4" />
          )}
        </button>
      </span>
    </label>
  );
}

// Both frontend clients expose the same Better Auth methods.
export function InvitationFlow({
  client,
  invitationId,
}: {
  client: any;
  invitationId: string;
}) {
  const [context, setContext] = useState<{
    email: string;
    organizationName: string;
    hasAccount: boolean;
  } | null>(null);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [choice, setChoice] = useState<"signup" | "signin" | null>(null);
  const callbackURL = `${typeof window !== "undefined" ? window.location.origin : ""}/accept-invitation?invitationId=${encodeURIComponent(invitationId)}`;
  async function refresh() {
    const result = await client.getSession({
      query: { disableCookieCache: true },
      fetchOptions: { cache: "no-store" },
    });
    if (result.error)
      throw new Error(result.error.message || "Unable to check your session.");
    setSession(result.data);
    return result.data;
  }
  useEffect(() => {
    let active = true;
    (async () => {
      const result = await client.$fetch(
        `/invitation/context?id=${encodeURIComponent(invitationId)}`,
      );
      if (result.error) throw new Error(result.error.message);
      if (!active) return;
      setContext(result.data);
      setEmail(result.data.email);
      setChoice(
        result.data.hasAccount
          ? "signin"
          : INVITATION_CONFIG.directSignup
            ? "signup"
            : null,
      );
      await refresh();
    })().catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, [client, invitationId]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await action(async () => {
      const body = {
        email,
        password: String(data.get("password")),
        name: String(data.get("name") || ""),
        callbackURL,
      };
      const result =
        choice === "signin"
          ? await client.signIn.email(body)
          : await client.signUp.email(body);
      if (result.error)
        throw new Error(result.error.message || "Unable to continue.");
      await refresh();
      if (
        choice === "signup" &&
        !INVITATION_CONFIG.skipOrganizationOnboarding
      ) {
        sessionStorage.setItem("flowstack.pendingInvitation", invitationId);
        window.location.assign("/onboarding/create-organization");
      }
    });
  }
  return (
    <section className="mx-auto w-full max-w-sm text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {session
            ? "Join your team"
            : choice === "signin"
              ? "Sign in to join"
              : "Join your team"}
        </h1>
        {context && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            You’re invited to {context.organizationName}.
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {!context ? (
        <p className="mt-4 text-sm">
          {error
            ? "Ask the organization owner for a new invitation."
            : "Loading invitation…"}
        </p>
      ) : session ? (
        session.user.email.toLowerCase() !== context.email.toLowerCase() ? (
          <>
            <p className="mx-auto mt-5 max-w-sm text-sm leading-6">
              This invitation is for {context.email}. Sign out to use that
              account.
            </p>
            <button
              className={`${button} mt-4`}
              disabled={busy}
              onClick={() =>
                action(async () => {
                  await client.signOut();
                  setSession(null);
                })
              }
            >
              Sign out
            </button>
          </>
        ) : !session.user.emailVerified ? (
          <>
            <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
              Verify {context.email} using the link in your email, then continue
              here.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className={button}
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    const s = await refresh();
                    if (!s?.user.emailVerified)
                      setNotice("Your email is not verified yet.");
                  })
                }
              >
                Check verification
              </button>
              <button
                className={secondaryButton}
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    const r = await client.sendVerificationEmail({
                      email: context.email,
                      callbackURL,
                    });
                    if (r.error) throw new Error(r.error.message);
                    setNotice("Verification email requested.");
                  })
                }
              >
                Resend email
              </button>
            </div>
          </>
        ) : (
          <button
            className={`${button} mt-5`}
            disabled={busy}
            onClick={() =>
              action(async () => {
                const r = await client.organization.acceptInvitation({
                  invitationId,
                });
                if (r.error) throw new Error(r.error.message);
                sessionStorage.removeItem("flowstack.pendingInvitation");
                window.location.assign("/dashboard");
              })
            }
          >
            {busy ? "Joining…" : "Join organization"}
          </button>
        )
      ) : choice ? (
        <form onSubmit={submit} className="mx-auto mt-6 space-y-4 text-left">
          {choice === "signup" && (
            <label className="block text-sm font-medium">
              Name
              <input
                className={input}
                name="name"
                autoComplete="name"
                required
              />
            </label>
          )}
          <label className="block text-sm font-medium">
            Email
            <input
              className={input}
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              readOnly={INVITATION_CONFIG.lockEmail}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <InvitationPasswordInput choice={choice} />
          <button className={`${button} w-full`} disabled={busy}>
            {busy
              ? "Please wait…"
              : choice === "signin"
                ? "Sign in and continue"
                : "Create account and continue"}
          </button>
        </form>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className={button} onClick={() => setChoice("signup")}>
            Create account
          </button>
          <button
            className={secondaryButton}
            onClick={() => setChoice("signin")}
          >
            Sign in
          </button>
        </div>
      )}
    </section>
  );
}
