// ** import core packages
import { useEffect, useState } from "react";
import { Check, Layers } from "lucide-react";
import { BRAND_CONFIG } from "@repo/config";

export function SuccessScreen({
  title,
  message,
  onContinue,
}: {
  title: string;
  message: string;
  onContinue?: () => void;
}) {
  useEffect(() => {
    if (!onContinue) return;
    const timer = window.setTimeout(
      onContinue,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 300
        : 1400,
    );
    return () => window.clearTimeout(timer);
  }, [onContinue]);
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <section role="status" className="flex max-w-md flex-col items-center">
        <div className="flex size-24 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-500">
          <Check className="size-12" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-muted-foreground">{message}</p>
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="mt-6 rounded-md px-4 py-2 text-sm underline underline-offset-4"
          >
            Continue now
          </button>
        )}
      </section>
    </main>
  );
}

/** One brief overlay per document; ordinary navigation never remounts it. */
export function StartupSplash() {
  // Server and first client render must match, including verification URLs.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (/verify-email|email-verified/.test(window.location.pathname)) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 450);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <div
      role="status"
      aria-label="Opening workspace"
      className="fixed inset-0 z-[100] grid place-items-center bg-background"
    >
      <div className="flex flex-col items-center gap-4">
        <Layers className="size-10" aria-hidden="true" />
        <span className="text-lg font-semibold">{BRAND_CONFIG.name}</span>
        <span className="h-1 w-28 overflow-hidden rounded-full bg-muted">
          <span className="block h-full w-full origin-left bg-primary motion-safe:animate-pulse" />
        </span>
      </div>
    </div>
  );
}
