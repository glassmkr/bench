import { toolError, timeoutError, type ToolError } from "@glassmkr/bench-shared";

export interface NetdataInfo {
  hostname: string;
  os_name: string;
  os_version: string;
  kernel_name: string;
  architecture: string;
  cores_total: number;
  total_disk_space: number;
  ram_total: number;
  netdata_version: string;
  uptime: number;
  [key: string]: unknown;
}

export interface ChartData {
  labels: string[];
  data: number[][];
}

export interface ChartInfo {
  id: string;
  name: string;
  type: string;
  family: string;
  title: string;
  units: string;
  context: string;
}

export interface Alarm {
  id: number;
  name: string;
  chart: string;
  status: string;
  value: number;
  units: string;
  last_status_change: number;
  info: string;
}

export interface AlarmLogEntry {
  id: number;
  name: string;
  chart: string;
  old_status: string;
  new_status: string;
  value: number;
  timestamp: number;
  info: string;
}

export class NetdataClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeoutMs: number;

  constructor(baseUrl: string, apiKey?: string, timeoutMs = 5000) {
    // Strip trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  private async request<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw toolError(
          "API_ERROR",
          `Netdata returned HTTP ${response.status}: ${response.statusText}`,
          { suggestion: "Check that the Netdata URL is correct and the instance is running.", retryable: response.status >= 500 }
        );
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err && typeof err === "object" && "error" in err && (err as ToolError).error === true) {
        throw err;
      }
      if (err instanceof DOMException && err.name === "AbortError") {
        throw timeoutError(this.baseUrl, this.timeoutMs);
      }
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
        const urlObj = new URL(this.baseUrl);
        throw toolError("CONNECTION_REFUSED", `Cannot reach Netdata at ${urlObj.host}`, {
          suggestion: "Check if Netdata is running: systemctl status netdata",
          retryable: true,
        });
      }
      throw toolError("REQUEST_FAILED", `Request to Netdata failed: ${message}`, { retryable: true });
    } finally {
      clearTimeout(timeout);
    }
  }

  async getInfo(): Promise<NetdataInfo> {
    return this.request<NetdataInfo>("/api/v1/info");
  }

  async getChartData(chart: string, opts?: {
    after?: number;
    before?: number;
    points?: number;
    format?: "json" | "csv";
    dimensions?: string;
  }): Promise<ChartData> {
    const params: Record<string, string | number | undefined> = {
      chart,
      after: opts?.after,
      before: opts?.before,
      points: opts?.points,
      format: opts?.format ?? "json",
      dimensions: opts?.dimensions,
      options: "jsonwrap",
    };

    const raw = await this.request<{ result: { labels: string[]; data: number[][] } }>("/api/v1/data", params);
    return {
      labels: raw.result.labels,
      data: raw.result.data,
    };
  }

  async getCharts(filter?: string): Promise<ChartInfo[]> {
    const raw = await this.request<{ charts: Record<string, ChartInfo> }>("/api/v1/charts");
    let charts = Object.values(raw.charts);
    if (filter) {
      const lower = filter.toLowerCase();
      charts = charts.filter(
        (c) =>
          c.id.toLowerCase().includes(lower) ||
          c.name.toLowerCase().includes(lower) ||
          c.title.toLowerCase().includes(lower)
      );
    }
    return charts.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      family: c.family,
      title: c.title,
      units: c.units,
      context: c.context,
    }));
  }

  async getAlarms(status?: "warning" | "critical" | "all"): Promise<Alarm[]> {
    const raw = await this.request<{ alarms: Record<string, Alarm> }>("/api/v1/alarms");
    let alarms = Object.values(raw.alarms);
    if (status && status !== "all") {
      alarms = alarms.filter((a) => a.status.toLowerCase() === status);
    }
    return alarms.map((a) => ({
      id: a.id,
      name: a.name,
      chart: a.chart,
      status: a.status,
      value: a.value,
      units: a.units,
      last_status_change: a.last_status_change,
      info: a.info,
    }));
  }

  async getAlarmLog(lastN = 20): Promise<AlarmLogEntry[]> {
    const raw = await this.request<AlarmLogEntry[]>("/api/v1/alarm_log", { last: lastN });
    return raw.map((e) => ({
      id: e.id,
      name: e.name,
      chart: e.chart,
      old_status: e.old_status,
      new_status: e.new_status,
      value: e.value,
      timestamp: e.timestamp,
      info: e.info,
    }));
  }
}
