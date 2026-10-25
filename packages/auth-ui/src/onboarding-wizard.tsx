// ** import types
import type { FormEvent } from "react";

// ** import core packages
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { INVITATION_CONFIG } from "@repo/config";

// ** import components
import { AuthShell } from "./auth-shell";
import { SuccessScreen } from "./success-screen";
import { notifySessionChange } from "./session-sync";

export interface WizardStatus {
  shouldOnboard: boolean;
  currentStep: string | null;
  completedSteps: string[];
  data?: { organizationName?: string; organizationId?: string };
}
export interface OnboardingApi {
  status: () => Promise<WizardStatus>;
  submit: (endpoint: string, data: Record<string, unknown>) => Promise<unknown>;
}
const field =
  "mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
const primary =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50";

export function OnboardingWizard({
  step,
  client,
  api,
  navigate,
}: {
  step?: "createOrganization" | "inviteMembers";
  client: any;
  api: OnboardingApi;
  navigate: (path: string) => void;
}) {
  const [status, setStatus] = useState<WizardStatus | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [emails, setEmails] = useState("");
  const [done, setDone] = useState(false);
  const sent = useRef(new Set<string>());
  const finish = useCallback(() => {
    const pending = sessionStorage.getItem("flowstack.pendingInvitation");
    navigate(
      pending
        ? `/accept-invitation?invitationId=${encodeURIComponent(pending)}`
        : "/dashboard",
    );
  }, [navigate]);

  useEffect(() => {
    let active = true;
    setError("");
    void (async () => {
      const result = await api.status();
      if (
        INVITATION_CONFIG.skipOrganizationOnboarding &&
        !result.data?.organizationId
      ) {
        const pending = await client.$fetch("/invitation/pending");
        if (pending.error)
          throw new Error(
            pending.error.message || "Unable to check your invitation.",
          );
        if (pending.data?.invitationId) {
          if (active)
            navigate(
              `/accept-invitation?invitationId=${encodeURIComponent(pending.data.invitationId)}`,
            );
          return;
        }
      }
      if (!active) return;
      setStatus(result);
      setName((value) => value || result.data?.organizationName || "");
      if (!result.shouldOnboard) {
        finish();
        return;
      }
      const current = result.currentStep || "createOrganization";
      const editing =
        step === "createOrganization" &&
        current === "inviteMembers" &&
        result.completedSteps.includes("createOrganization");
      if (!step || (step !== current && !editing))
        navigate(
          current === "inviteMembers"
            ? "/onboarding/invite-members"
            : "/onboarding/create-organization",
        );
    })().catch((e) => {
      if (!active) return;
      if (e?.response?.status === 401) navigate("/auth/sign-in");
      else
        setError(
          e instanceof Error
            ? e.message
            : "Unable to load setup. Please try again.",
        );
    });
    return () => {
      active = false;
    };
  }, [api, client, step, navigate, finish, attempt]);

  const editing =
    step === "createOrganization" &&
    status?.completedSteps.includes("createOrganization");
  const isTeam = step === "inviteMembers";
  async function complete(endpoint: string, data: Record<string, unknown>) {
    try {
      await api.submit(endpoint, data);
    } catch (failure) {
      // A lost response does not mean the write failed. Reconcile before retry.
      const saved = await api.status().catch(() => null);
      const applied =
        endpoint === "update-organization"
          ? saved?.data?.organizationName === data.organizationName
          : isTeam
            ? saved && !saved.shouldOnboard
            : saved?.completedSteps.includes("createOrganization");
      if (!applied) throw failure;
    }
    await notifySessionChange(client);
    if (isTeam) setDone(true);
    else navigate("/onboarding/invite-members");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!isTeam) {
        await complete(
          editing ? "update-organization" : "step/create-organization",
          { organizationName: name.trim() },
        );
      } else {
        const recipients = [
          ...new Set(
            emails
              .split(",")
              .map((email) => email.trim().toLowerCase())
              .filter(Boolean),
          ),
        ];
        if (
          recipients.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        )
          throw new Error("Enter valid email addresses separated by commas.");
        for (const email of recipients) {
          if (sent.current.has(email)) continue;
          const result = await client.organization.inviteMember({
            email,
            role: "member",
          });
          if (result.error)
            throw new Error(
              result.error.message || `Unable to invite ${email}.`,
            );
          sent.current.add(email);
        }
        await complete("step/invite-members", { emails: recipients });
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function skip() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await complete("skip-step/invite-members", {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to continue.");
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <SuccessScreen
        title="Your workspace is ready"
        message="You're all set. Let's get started."
        onContinue={finish}
      />
    );
  return (
    <AuthShell stage={isTeam ? "team" : "workspace"}>
      <div className="mb-8">
        <div className="flex justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span>Step {isTeam ? "03" : "02"} / 03</span>
          <span>{isTeam ? "Team" : "Workspace"}</span>
        </div>
        <div
          role="progressbar"
          aria-label="Account setup"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={isTeam ? 3 : 2}
          className="mt-3 h-1 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={`h-full bg-primary transition-[width] duration-300 motion-reduce:transition-none ${isTeam ? "w-full" : "w-2/3"}`}
          />
        </div>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">
        {isTeam
          ? "Better together"
          : editing
            ? "Edit your workspace"
            : "Create your workspace"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {isTeam
          ? "Invite a few teammates, or save this for later."
          : "Choose a name your team will recognize. You can change it later."}
      </p>
      {error && (
        <div
          role="alert"
          className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
          {!status && (
            <button
              type="button"
              className="mt-3 block underline"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </button>
          )}
        </div>
      )}
      {!status ? (
        <p role="status" className="mt-8 text-sm text-muted-foreground">
          Opening your workspace setup…
        </p>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label
            className="block text-sm font-medium"
            htmlFor={isTeam ? "team-emails" : "organizationName"}
          >
            {isTeam ? "Team member emails" : "Organization Name"}
          </label>
          {isTeam ? (
            <>
              <textarea
                id="team-emails"
                className={`${field} min-h-24 py-3`}
                placeholder="alex@example.com, sam@example.com"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                Separate email addresses with commas. Your teammates will
                receive an invitation.
              </p>
            </>
          ) : (
            <input
              id="organizationName"
              name="organizationName"
              className={field}
              placeholder="Enter your organization name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={100}
              required
              disabled={busy}
              autoFocus
            />
          )}
          <button type="submit" className={primary} disabled={busy}>
            {busy && (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            )}
            {busy
              ? "Saving…"
              : isTeam
                ? "Send Invitations"
                : editing
                  ? "Save and continue"
                  : "Create Organization"}
            {!busy && <ArrowRight aria-hidden="true" className="size-4" />}
          </button>
          {isTeam && (
            <>
              <button
                type="button"
                onClick={skip}
                disabled={busy}
                className="min-h-11 w-full rounded-md border px-4 text-sm disabled:opacity-50"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={() => navigate("/onboarding/create-organization")}
                disabled={busy}
                className="inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Edit workspace
              </button>
            </>
          )}
        </form>
      )}
    </AuthShell>
  );
}
