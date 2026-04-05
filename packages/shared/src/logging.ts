// All logging MUST go to stderr. stdout is the MCP JSON-RPC channel.
// Using console.log in an MCP server will corrupt the protocol stream.

export function createLogger(prefix: string) {
  return {
    info: (msg: string, ...args: unknown[]) =>
      console.error(`[${prefix}] ${msg}`, ...args),
    warn: (msg: string, ...args: unknown[]) =>
      console.error(`[${prefix}] WARN: ${msg}`, ...args),
    error: (msg: string, ...args: unknown[]) =>
      console.error(`[${prefix}] ERROR: ${msg}`, ...args),
  };
}
