type Level = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

const LEVELS: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};
// Field names whose values are never written to logs.
const SENSITIVE =
  /pass(word)?|secret|token|authorization|cookie|api[-_]?key|credential|session|database_url/i;

const env: Record<string, string | undefined> =
  typeof process !== "undefined" && process.env ? process.env : {};

function minimumLevel(): number {
  const configured = env.LOG_LEVEL as Level | undefined;
  if (configured && configured in LEVELS) return LEVELS[configured];
  return env.NODE_ENV === "development" ? LEVELS.debug : LEVELS.info;
}

/** Structured JSON in production (Cloud Logging parses it); readable text elsewhere. */
function useJson(): boolean {
  return env.LOG_FORMAT
    ? env.LOG_FORMAT === "json"
    : env.NODE_ENV === "production";
}

export function redact(fields: LogFields): LogFields {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      SENSITIVE.test(key)
        ? "[redacted]"
        : value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            !(value instanceof Error)
          ? redact(value as LogFields)
          : value instanceof Error
            ? { name: value.name, message: value.message }
            : value,
    ]),
  );
}

function write(level: Level, msg: string, fields?: LogFields) {
  if (LEVELS[level] < minimumLevel()) return;
  const sink =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : level === "debug"
          ? console.debug
          : console.log;
  const safe = fields ? redact(fields) : undefined;
  if (useJson()) {
    // `severity` and `message` are the field names Google Cloud Logging expects.
    sink(
      JSON.stringify({
        severity: level.toUpperCase(),
        message: msg,
        time: new Date().toISOString(),
        ...safe,
      }),
    );
    return;
  }
  const suffix =
    safe && Object.keys(safe).length ? ` ${JSON.stringify(safe)}` : "";
  sink(`[${level.toUpperCase()}] ${msg}${suffix}`);
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => write("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => write("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => write("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => write("error", msg, fields),
};
