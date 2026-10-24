#!/usr/bin/env node
// Minimal stateful stand-in for the gcloud CLI, used by tests/deploy.test.ts.
// State lives in $FAKE_GCLOUD_STATE (JSON). Every call is appended to
// $FAKE_GCLOUD_LOG. Revision health is served by the test's HTTP server at
// $FAKE_HEALTH_BASE/<revision>/health/ready.
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const statePath = process.env.FAKE_GCLOUD_STATE;
const state = JSON.parse(readFileSync(statePath, "utf8"));
appendFileSync(process.env.FAKE_GCLOUD_LOG, args.join(" ") + "\n");
const save = () => writeFileSync(statePath, JSON.stringify(state, null, 2));
const flag = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const cmd = args
  .filter((a) => !a.startsWith("-"))
  .slice(0, 3)
  .join(" ");
const base = process.env.FAKE_HEALTH_BASE;

function serviceJson() {
  return {
    status: {
      url: `${base}/service`,
      latestCreatedRevisionName: state.revisions.at(-1)?.metadata.name,
      traffic: state.traffic.map((t) => ({
        ...t,
        url: t.tag ? `${base}/${t.revisionName}` : undefined,
      })),
    },
  };
}

if (cmd.startsWith("auth list"))
  console.log("deployer@example.iam.gserviceaccount.com");
else if (cmd.startsWith("config get-value")) console.log("test-project");
else if (cmd.startsWith("auth print-identity-token"))
  console.log("fake-identity-token");
else if (cmd.startsWith("artifacts repositories describe")) process.exit(0);
else if (cmd.startsWith("builds submit")) process.exit(0);
else if (cmd.startsWith("secrets list"))
  for (const id of state.secrets || [])
    console.log(`projects/test-project/secrets/${id}`);
else if (cmd.startsWith("run services describe")) {
  if (!state.exists) process.exit(1);
  if (
    args.some((a) =>
      a.startsWith("--format=value(status.latestCreatedRevisionName)"),
    )
  )
    console.log(serviceJson().status.latestCreatedRevisionName);
  else console.log(JSON.stringify(serviceJson()));
} else if (cmd.startsWith("run revisions list")) {
  console.log(JSON.stringify(state.revisions));
} else if (cmd.startsWith("run deploy")) {
  const n = state.revisions.length + 1;
  const name = `svc-${String(n).padStart(5, "0")}`;
  const labels = Object.fromEntries(
    (flag("labels") || "")
      .split(",")
      .filter(Boolean)
      .map((p) => p.split("=")),
  );
  state.revisions.push({
    metadata: {
      name,
      creationTimestamp: new Date(Date.UTC(2026, 0, 1, 0, n)).toISOString(),
      labels,
    },
    status: { conditions: [{ type: "Ready", status: "True" }] },
  });
  if (args.includes("--no-traffic"))
    state.traffic.push({ revisionName: name, percent: 0, tag: flag("tag") });
  else state.traffic = [{ revisionName: name, percent: 100 }];
  state.exists = true;
  save();
} else if (cmd.startsWith("run services update-traffic")) {
  const to = flag("to-revisions");
  if (to) {
    const [rev] = to.split("=");
    state.traffic = [
      { revisionName: rev, percent: 100 },
      ...state.traffic
        .filter((t) => t.tag && t.revisionName !== rev)
        .map((t) => ({ ...t, percent: 0 })),
    ];
  }
  const removed = flag("remove-tags");
  if (removed) state.traffic = state.traffic.filter((t) => t.tag !== removed);
  save();
} else {
  console.error(`fake gcloud: unsupported command: ${args.join(" ")}`);
  process.exit(2);
}
