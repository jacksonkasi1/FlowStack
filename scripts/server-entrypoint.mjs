import { loadRuntimeSecrets } from "./lib/infisical-runtime.mjs";

try {
  await loadRuntimeSecrets();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

// Dynamic import is essential: auth, DB and monitoring read env on import.
await import("../dist/index.js");
