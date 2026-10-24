#!/usr/bin/env node
// Pure helpers used by deploy.sh to read `gcloud run ... --format=json`
// output. Kept in JavaScript so revision selection is unit tested.
//
//   gcloud run services describe ... --format=json | node scripts/cloud-run.mjs serving
//   gcloud run services describe ... --format=json | node scripts/cloud-run.mjs tag-url <tag>
//   gcloud run services describe ... --format=json | node scripts/cloud-run.mjs failed
//   gcloud run revisions list ... --format=json | node scripts/cloud-run.mjs rollback-target <current> [failed,...]
import { isMain } from "./lib/is-main.mjs";

const isReady = (revision) =>
  (revision.status?.conditions || []).some(
    (c) => c.type === "Ready" && c.status === "True",
  );

const created = (revision) =>
  Date.parse(revision.metadata?.creationTimestamp || 0);

/** Revision currently receiving the most traffic, or null. */
export function servingRevision(service) {
  const entries = (service?.status?.traffic || []).filter((t) => t.percent > 0);
  entries.sort((a, b) => b.percent - a.percent);
  return entries[0]?.revisionName || null;
}

/** URL of a traffic tag (e.g. the candidate revision before it gets traffic). */
export function tagUrl(service, tag) {
  return (
    (service?.status?.traffic || []).find((t) => t.tag === tag)?.url || null
  );
}

/** Revisions marked as failed (traffic tag `failed-*`) by deploy.sh. */
export function failedRevisions(service) {
  return (service?.status?.traffic || [])
    .filter((t) => t.tag?.startsWith("failed-"))
    .map((t) => t.revisionName);
}

/**
 * Picks the revision to roll back to: the newest Ready revision created by
 * the FlowStack deploy script (it carries the flowstack-release label) that is
 * older than the currently serving revision and never failed verification.
 * Returns null when there is none.
 */
export function rollbackTarget(revisions, current, failed = []) {
  const excluded = new Set([current, ...failed]);
  const byName = new Map(revisions.map((r) => [r.metadata?.name, r]));
  const currentRevision = byName.get(current);
  const before = currentRevision ? created(currentRevision) : Infinity;
  return (
    revisions
      .filter((r) => !excluded.has(r.metadata?.name))
      .filter((r) => r.metadata?.labels?.["flowstack-release"])
      .filter(isReady)
      .filter((r) => created(r) < before)
      .sort((a, b) => created(b) - created(a))[0]?.metadata?.name || null
  );
}

/** Cloud Run labels/tags: lowercase letters, digits and hyphens. */
export function sanitizeLabel(value, max = 40) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
}

async function readStdin() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text.trim() ? JSON.parse(text) : null;
}

async function main([command, arg, extra]) {
  if (command === "sanitize") {
    process.stdout.write(sanitizeLabel(arg));
    return;
  }
  const input = await readStdin();
  const handlers = {
    serving: () => servingRevision(input),
    "tag-url": () => tagUrl(input, arg),
    "rollback-target": () =>
      rollbackTarget(
        input || [],
        arg,
        (extra || "").split(",").filter(Boolean),
      ),
    failed: () => failedRevisions(input).join(","),
  };
  if (!handlers[command]) throw new Error(`Unknown command: ${command}`);
  const output = handlers[command]();
  if (output) process.stdout.write(output);
  else process.exitCode = 3;
}

if (isMain(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
