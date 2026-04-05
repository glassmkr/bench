# @glassmkr/bench-netdata

MCP server for Netdata monitoring. Gives AI agents structured access to CPU, memory, disk, network, alarms, and any chart from any Netdata instance.

Part of [The Bench](https://github.com/glassmkr/bench) by [Glassmkr](https://glassmkr.com).

## Install

```bash
npx @glassmkr/bench-netdata
```

## Configuration

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `NETDATA_URL` | Yes | Base URL of Netdata instance | -- |
| `NETDATA_API_KEY` | No | API key for Netdata Cloud or protected instances | -- |
| `NETDATA_TIMEOUT_MS` | No | Request timeout in milliseconds | 5000 |

## MCP Config

Add to your MCP client (Claude Code, Cursor, etc.):

```json
{
  "mcpServers": {
    "netdata": {
      "command": "npx",
      "args": ["@glassmkr/bench-netdata"],
      "env": {
        "NETDATA_URL": "http://your-server:19999"
      }
    }
  }
}
```

## Tools (10, all read-only)

### get_server_overview

High-level server snapshot: hostname, OS, uptime, CPU count, total RAM, Netdata version.

### get_cpu_usage

Current CPU utilization breakdown (user, system, iowait, idle) and load averages.

- `period_seconds` (optional, default 60): Time period to average over.

### get_memory_usage

Current RAM and swap usage in MB with percentage.

### get_disk_usage

Disk space for all mounted filesystems.

- `mount_point` (optional): Filter to a specific mount point.

### get_disk_io

Disk I/O rates (reads/writes per second).

- `device` (optional): Filter to a specific device.
- `period_seconds` (optional, default 60): Time period to average over.

### get_network_traffic

Network interface traffic (received/sent).

- `interface` (optional): Filter to a specific interface.
- `period_seconds` (optional, default 60): Time period to average over.

### get_chart_data

Raw time-series data from any Netdata chart. The power tool.

- `chart` (required): Chart ID, e.g. `system.cpu`, `disk_space._`, `net.eth0`.
- `after` (optional): Start time as negative seconds ago or unix timestamp.
- `before` (optional): End time as negative seconds ago or unix timestamp.
- `points` (optional, default 60): Number of data points.

### list_charts

Lists all available charts on this Netdata instance.

- `filter` (optional): Substring filter on chart name.

### get_alarms

Current alarm status (active warnings and criticals).

- `status` (optional): Filter by `warning`, `critical`, or `all` (default).

### get_alarm_log

Recent alarm transitions (alarm history).

- `last_n` (optional, default 20): Number of recent transitions.

## Examples

Ask your agent:

- "What's the CPU usage on my server?"
- "Are there any active alarms?"
- "Show me the last hour of system.cpu chart data"
- "List all charts related to disk"

## Netdata API Reference

This tool wraps Netdata's `/api/v1/` REST endpoints. See the [Netdata API docs](https://learn.netdata.cloud/api) for details on chart IDs and data formats.

## License

[MIT](../../LICENSE)
