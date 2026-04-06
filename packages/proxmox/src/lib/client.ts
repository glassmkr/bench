import { toolError, timeoutError, type ToolError } from "@glassmkr/bench-shared";
import { createLogger } from "@glassmkr/bench-shared";

const log = createLogger("bench-proxmox");

export interface ResourceEntry {
  type: "qemu" | "lxc" | "node" | "storage";
  id: string;
  name: string;
  node: string;
  status: string;
  cpu?: number;
  mem?: number;
  maxmem?: number;
  disk?: number;
  maxdisk?: number;
  vmid?: number;
  uptime?: number;
  tags?: string;
  [key: string]: unknown;
}

export interface TaskResult {
  status: "running" | "stopped";
  exitstatus?: string;
  type: string;
  starttime: number;
  endtime?: number;
  node: string;
  user: string;
}

export class ProxmoxClient {
  private baseUrl: string;
  private tokenId: string;
  private tokenSecret: string;
  private timeoutMs: number;

  // Resource cache with 5s TTL
  private resourceCache: { data: ResourceEntry[]; expires: number } | null = null;

  constructor(
    baseUrl: string,
    tokenId: string,
    tokenSecret: string,
    opts?: { verifySsl?: boolean; timeoutMs?: number }
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.tokenId = tokenId;
    this.tokenSecret = tokenSecret;
    this.timeoutMs = opts?.timeoutMs ?? 10000;

    if (opts?.verifySsl !== true) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      log.warn("SSL verification disabled (Proxmox typically uses self-signed certs).");
    }
  }

  private async request<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}/api2/json${path}`;
    const headers: Record<string, string> = {
      Authorization: `PVEAPIToken=${this.tokenId}=${this.tokenSecret}`,
    };

    const fetchOpts: RequestInit = { method, headers };

    if (body && (method === "POST" || method === "PUT")) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      fetchOpts.body = new URLSearchParams(
        Object.entries(body).reduce<Record<string, string>>((acc, [k, v]) => {
          if (v !== undefined && v !== null) acc[k] = String(v);
          return acc;
        }, {})
      ).toString();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    fetchOpts.signal = controller.signal;

    try {
      const response = await fetch(url, fetchOpts);

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        if (response.status === 401 || response.status === 403) {
          throw toolError("AUTH_FAILED", `Proxmox authentication failed (HTTP ${response.status})`, {
            suggestion: "Check PROXMOX_TOKEN_ID and PROXMOX_TOKEN_SECRET.",
            retryable: false,
          });
        }
        throw toolError("API_ERROR", `Proxmox API returned HTTP ${response.status}: ${text.slice(0, 200)}`, {
          suggestion: "Check the Proxmox URL and API token permissions.",
          retryable: response.status >= 500,
        });
      }

      const json = await response.json() as { data: T };
      return json.data;
    } catch (err) {
      if (err && typeof err === "object" && "error" in err && (err as ToolError).error === true) {
        throw err;
      }
      if (err instanceof DOMException && err.name === "AbortError") {
        throw timeoutError(this.baseUrl, this.timeoutMs);
      }
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
        throw toolError("CONNECTION_REFUSED", `Cannot reach Proxmox at ${this.baseUrl}`, {
          suggestion: "Check PROXMOX_URL and ensure port 8006 is accessible.",
          retryable: true,
        });
      }
      throw toolError("REQUEST_FAILED", `Request to Proxmox failed: ${message}`, { retryable: true });
    } finally {
      clearTimeout(timeout);
    }
  }

  async get<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
    let fullPath = path;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      if (qs) fullPath += `?${qs}`;
    }
    return this.request<T>("GET", fullPath);
  }

  async post<T = unknown>(path: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>("POST", path, data);
  }

  async del<T = unknown>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  // Cached resource listing (5s TTL)
  async getResources(type?: string): Promise<ResourceEntry[]> {
    const now = Date.now();
    if (this.resourceCache && this.resourceCache.expires > now) {
      const cached = this.resourceCache.data;
      if (type && type !== "all") {
        const pveType = type === "vm" ? undefined : type;
        return cached.filter((r) => {
          if (type === "vm") return r.type === "qemu" || r.type === "lxc";
          return r.type === pveType;
        });
      }
      return cached;
    }

    const resources = await this.get<ResourceEntry[]>("/cluster/resources");
    this.resourceCache = { data: resources, expires: now + 5000 };

    if (type && type !== "all") {
      if (type === "vm") return resources.filter((r) => r.type === "qemu" || r.type === "lxc");
      return resources.filter((r) => r.type === type);
    }
    return resources;
  }

  // Find which node a VM/container lives on
  async resolveVmid(vmid: number): Promise<{ node: string; type: "qemu" | "lxc"; name: string }> {
    const resources = await this.getResources();
    const entry = resources.find((r) => r.vmid === vmid && (r.type === "qemu" || r.type === "lxc"));
    if (!entry) {
      throw toolError("NOT_FOUND", `VM/container ${vmid} not found in cluster`, {
        suggestion: "Check the VMID. Use list_vms or list_containers to see available IDs.",
        retryable: false,
      });
    }
    return { node: entry.node, type: entry.type as "qemu" | "lxc", name: entry.name ?? String(vmid) };
  }

  // Wait for task completion (poll with backoff)
  async waitForTask(node: string, upid: string, maxWaitMs = 30000): Promise<TaskResult> {
    const start = Date.now();
    let delay = 500;

    while (Date.now() - start < maxWaitMs) {
      const status = await this.get<TaskResult>(`/nodes/${node}/tasks/${encodeURIComponent(upid)}/status`);
      if (status.status === "stopped") return status;
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 1.5, 3000);
    }

    return { status: "running", type: "unknown", starttime: 0, node, user: "" };
  }
}
