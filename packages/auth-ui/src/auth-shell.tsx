// ** import types
import type { ReactNode } from "react";

// ** import core packages
import { Check, Layers } from "lucide-react";
import { BRAND_CONFIG, isOrganizationMode } from "@repo/config";

export type AuthStage =
  "sign-in" | "sign-up" | "workspace" | "team" | "invitation" | "reset";

const workspaceSteps = [
  {
    title: "Create your account",
    description: "Your own place to get started.",
  },
  {
    title: "Set up your workspace",
    description: "Give your team a shared home.",
  },
  {
    title: "Invite your team",
    description: "Bring people together, when you're ready.",
  },
];
const invitationSteps = [
  {
    title: "Use your invited email",
    description: "Your invitation is linked to this address.",
  },
  {
    title: "Join your workspace",
    description: "Your team has already taken care of setup.",
  },
  {
    title: "Make yourself at home",
    description: "Get started with the access your team provides.",
  },
];

export const authViewClassNames = {
  base: "w-full max-w-none border-0 bg-transparent p-0 shadow-none",
  header: "px-0 text-left",
  content: "gap-5 p-0",
  footer: "px-0",
  form: { input: "h-11", primaryButton: "h-11 w-full font-medium" },
};

export function AuthShell({
  children,
  stage = "sign-in",
  organizationName,
}: {
  children: ReactNode;
  stage?: AuthStage;
  organizationName?: string;
}) {
  const organization = isOrganizationMode();
  const invitation = stage === "invitation";
  const active = stage === "team" ? 2 : stage === "workspace" ? 1 : 0;
  const steps = invitation
    ? invitationSteps
    : organization
      ? workspaceSteps
      : [
          {
            title: "Create your account",
            description: "A few details and you're ready.",
          },
          {
            title: "Get started",
            description: "Everything you need, in one place.",
          },
        ];
  const heading = invitation
    ? organizationName
      ? `You're invited to ${organizationName}.`
      : "Good work starts together."
    : stage === "sign-in"
      ? "Welcome back to your workspace."
      : stage === "reset"
        ? "A fresh start, securely."
        : "Make room for your next idea.";
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:h-screen lg:grid-cols-[42%_1fr] lg:overflow-hidden">
      <aside className="relative isolate overflow-hidden bg-slate-950 text-white lg:flex lg:flex-col lg:justify-between">
        <img
          src={BRAND_CONFIG.authImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-slate-950 via-slate-950/60 to-slate-950/20" />
        <a
          href="/"
          className="flex w-fit items-center gap-2.5 px-6 py-6 text-lg font-semibold tracking-tight lg:m-10 lg:p-0"
        >
          <Layers className="size-6" aria-hidden="true" />
          {BRAND_CONFIG.name}
        </a>
        <div className="hidden px-10 py-12 lg:block xl:px-14">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-300">
            {invitation ? "Your team is ready" : BRAND_CONFIG.tagline}
          </p>
          <h2 className="mt-5 max-w-md text-4xl font-semibold leading-tight tracking-tight text-balance xl:text-5xl">
            {heading}
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-slate-300">
            {invitation
              ? "Use your invited email to join. No need to create another workspace."
              : "A simple place to organize your work, connect with your team, and move forward."}
          </p>
          <ol aria-label="Getting started" className="mt-10 space-y-6">
            {steps.map((item, index) => {
              const done =
                !invitation &&
                stage !== "sign-in" &&
                stage !== "reset" &&
                index < active;
              const selected = !invitation && index === active;
              return (
                <li
                  key={item.title}
                  aria-current={selected ? "step" : undefined}
                  className="flex gap-4"
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-md border text-xs transition-colors motion-reduce:transition-none ${done ? "border-white bg-white text-slate-950" : selected ? "border-white/70 bg-white/10" : "border-white/20 text-slate-400"}`}
                  >
                    {done ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-400">
                      {item.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="hidden px-10 pb-8 text-xs text-slate-400 lg:block">
          A workspace that grows with you.
        </p>
      </aside>
      <main className="flex min-h-[calc(100svh-80px)] items-center justify-center px-6 py-12 lg:min-h-0 lg:overflow-y-auto lg:px-12 xl:px-20">
        <div className="my-auto w-full max-w-md [&_[data-slot=card-title]]:text-3xl [&_[data-slot=card-title]]:tracking-tight [&_.relative>button]:top-1/2 [&_.relative>button]:-translate-y-1/2">
          {children}
        </div>
      </main>
    </div>
  );
}
