#!/usr/bin/env node
// Fails when the value of any confidential variable in the current
// environment appears in build output. CI builds with sentinel values and
// runs this over the frontend output, so a regression that inlines server
// secrets into a browser bundle is caught. Prints names and paths, never values.
//
//   node scripts/check-bundle-secrets.mjs <dir> [dir...]
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ENV_VARS } from "./lib/env-manifest.mjs";
import { isMain } from "./lib/is-main.mjs";

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else yield path;
  }
}

export async function findLeaks(dirs, env = process.env) {
  const secrets = ENV_VARS.filter((v) => v.secret && v.scope !== "web")
    .map((v) => [v.name, env[v.name]])
    .filter(([, value]) => value && value.length >= 12);
  const leaks = [];
  for (const dir of dirs)
    for await (const path of files(dir)) {
      const text = await readFile(path, "latin1");
      for (const [name, value] of secrets)
        if (text.includes(value)) leaks.push({ name, path });
    }
  return { checked: secrets.length, leaks };
}

if (isMain(import.meta.url)) {
  const dirs = process.argv.slice(2);
  const { checked, leaks } = await findLeaks(dirs);
  if (!checked) {
    console.error(
      "No confidential variables are set; nothing to check. Set sentinel values first.",
    );
    process.exitCode = 1;
  } else if (leaks.length) {
    for (const leak of leaks)
      console.error(`LEAK: value of ${leak.name} found in ${leak.path}`);
    process.exitCode = 1;
  } else
    console.log(
      `No confidential values found in ${dirs.join(", ")} (${checked} variables checked).`,
    );
}
