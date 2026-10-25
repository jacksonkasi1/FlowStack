import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * True when the module is the entry point. Compares real paths so symlinked
 * checkouts (and macOS /var -> /private/var) still run instead of silently
 * doing nothing.
 */
export function isMain(metaUrl) {
  if (!process.argv[1]) return false;
  try {
    return (
      realpathSync(process.argv[1]) === realpathSync(fileURLToPath(metaUrl))
    );
  } catch {
    return false;
  }
}
