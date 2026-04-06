import { execFile } from "child_process";
import { toolError, type ToolError } from "@glassmkr/bench-shared";

export interface IpmiConfig {
  host: string;
  user: string;
  pass: string;
  iface: string;
  timeoutMs: number;
}

export class IpmiClient {
  private config: IpmiConfig;

  constructor(config: IpmiConfig) {
    this.config = config;
  }

  async exec(subcommand: string, args: string[] = []): Promise<string> {
    const cmdArgs = [
      "-I", this.config.iface,
      "-H", this.config.host,
      "-U", this.config.user,
      "-P", this.config.pass,
      subcommand,
      ...args,
    ];

    return new Promise((resolve, reject) => {
      const proc = execFile("ipmitool", cmdArgs, {
        timeout: this.config.timeoutMs,
        maxBuffer: 1024 * 1024,
      }, (error, stdout, stderr) => {
        if (error) {
          if (error.killed) {
            reject(toolError("TIMEOUT", `ipmitool timed out after ${this.config.timeoutMs}ms`, {
              suggestion: "The BMC may be unresponsive. Check network connectivity.",
              retryable: true,
            }));
            return;
          }
          const msg = stderr.trim() || error.message;
          if (msg.includes("Unable to establish") || msg.includes("Error in open session") || msg.includes("RAKP")) {
            reject(toolError("AUTH_FAILED", `IPMI authentication failed for ${this.config.host}`, {
              suggestion: "Check IPMI_USER and IPMI_PASS credentials.",
              retryable: false,
            }));
            return;
          }
          if (msg.includes("Address lookup") || msg.includes("connect")) {
            reject(toolError("CONNECTION_REFUSED", `Cannot reach BMC at ${this.config.host}`, {
              suggestion: "Check IPMI_HOST and network connectivity to the BMC.",
              retryable: true,
            }));
            return;
          }
          reject(toolError("IPMI_ERROR", `ipmitool error: ${msg}`, { retryable: false }));
          return;
        }
        resolve(stdout);
      });
    });
  }

  get host(): string {
    return this.config.host;
  }
}

// Parsers for common ipmitool output formats

export function parseSensorReadings(raw: string): SensorReading[] {
  const lines = raw.trim().split("\n").filter((l) => l.includes("|"));
  return lines.map((line) => {
    const parts = line.split("|").map((s) => s.trim());
    const value = parseFloat(parts[1] ?? "");
    return {
      name: parts[0] ?? "unknown",
      value: isNaN(value) ? null : value,
      unit: parts[2] ?? "",
      status: parts[3] ?? "unknown",
      lower_critical: parseThreshold(parts[5]),
      lower_non_critical: parseThreshold(parts[6]),
      upper_non_critical: parseThreshold(parts[7]),
      upper_critical: parseThreshold(parts[8]),
    };
  });
}

function parseThreshold(val: string | undefined): number | null {
  if (!val || val === "na") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

export interface SensorReading {
  name: string;
  value: number | null;
  unit: string;
  status: string;
  lower_critical: number | null;
  lower_non_critical: number | null;
  upper_non_critical: number | null;
  upper_critical: number | null;
}

export function parseSelEntries(raw: string): SelEntry[] {
  const lines = raw.trim().split("\n").filter((l) => l.includes("|"));
  return lines.map((line) => {
    const parts = line.split("|").map((s) => s.trim());
    return {
      id: parts[0] ?? "",
      timestamp: parts[1] ?? "",
      sensor: parts[2] ?? "",
      event_type: parts[3] ?? "",
      description: parts[4] ?? "",
    };
  });
}

export interface SelEntry {
  id: string;
  timestamp: string;
  sensor: string;
  event_type: string;
  description: string;
}

export function parseKeyValueOutput(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.trim().split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}
