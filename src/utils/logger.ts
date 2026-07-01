const PREFIX = "[Ghostwriter]";

const write = (method: "log" | "warn" | "error", args: unknown[]): void => {
  if (!import.meta.env.DEV) {
    return;
  }

  console[method](PREFIX, ...args);
};

export const logger = {
  log: (...args: unknown[]) => write("log", args),
  warn: (...args: unknown[]) => write("warn", args),
  error: (...args: unknown[]) => write("error", args),
};
