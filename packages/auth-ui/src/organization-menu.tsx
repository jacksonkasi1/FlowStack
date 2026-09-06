import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { isOrganizationMode, MULTI_ORGANIZATION_CONFIG } from "@repo/config";

export function OrganizationMenu({ client }: { client: any }) {
  const [open, setOpen] = useState(false);
  const [organizations, setOrganizations] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const enabled = isOrganizationMode() && MULTI_ORGANIZATION_CONFIG.enabled;
  useEffect(() => {
    if (enabled && open)
      client.organization.list().then((r: any) => {
        if (r.error) setError(r.error.message);
        else setOrganizations(r.data || []);
      });
  }, [client, enabled, open]);
  if (!enabled) return null;
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") || "").trim();
    setBusy(true);
    setError("");
    try {
      const slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        crypto.randomUUID().slice(0, 8);
      const r = await client.organization.create({ name, slug });
      if (r.error) throw new Error(r.error.message);
      const active = await client.organization.setActive({
        organizationId: r.data.id,
      });
      if (active.error) throw new Error(active.error.message);
      window.location.assign("/dashboard");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to create organization.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="relative">
      <button
        type="button"
        className="text-sm"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Organizations
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-64 rounded-md border bg-background p-4 shadow-sm">
          {error && (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <ul className="space-y-2">
            {organizations.map((org) => (
              <li key={org.id}>
                <button
                  disabled={busy}
                  className="text-sm"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const r = await client.organization.setActive({
                        organizationId: org.id,
                      });
                      if (r.error) throw new Error(r.error.message);
                      window.location.assign("/dashboard");
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Unable to switch organization.",
                      );
                      setBusy(false);
                    }
                  }}
                >
                  {org.name}
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={create} className="mt-4 space-y-2">
            <label className="text-sm">
              New organization
              <input
                name="name"
                minLength={2}
                maxLength={100}
                required
                className="mt-1 w-full rounded-md border bg-background px-2 py-1"
              />
            </label>
            <button
              disabled={busy}
              className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
            >
              {busy ? "Creating…" : "Create organization"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
