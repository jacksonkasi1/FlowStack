export const logger = {
  debug: (msg: string) => {
    if (process.env.NODE_ENV === "development") console.debug(`[DEBUG] ${msg}`);
  },
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};
