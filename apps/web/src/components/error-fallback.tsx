// Shown by the root error boundary. The error itself is reported to Sentry
// (when configured) and never rendered, so internal details stay private.
export function ErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground text-sm">
        The error has been recorded. Try again, or reload the page.
      </p>
      <button
        type="button"
        className="rounded-md border px-4 py-2 text-sm"
        onClick={resetError}
      >
        Try again
      </button>
    </div>
  );
}
