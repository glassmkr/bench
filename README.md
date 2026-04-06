# The Bench

Infrastructure tools for AI agents. Each one does one thing well.

Open-source MCP servers for Netdata, IPMI, Proxmox, and more. Built by [Glassmkr](https://glassmkr.com).

Named after the glassblower's workbench: the station where every tool hangs within arm's reach, organized by purpose, each one forged for a specific job.

## Available Tools

| Tool | Connects to | Status | Install |
|------|------------|--------|---------|
| [bench-netdata](packages/netdata/) | Netdata monitoring | Stable | `npx @glassmkr/bench-netdata` |
| [bench-ipmi](packages/ipmi/) | IPMI/BMC hardware management | Stable | `npx @glassmkr/bench-ipmi` |
| [bench-proxmox](packages/proxmox/) | Proxmox VE | Stable | `npx @glassmkr/bench-proxmox` |

## Quick Start

```bash
npx @glassmkr/bench-netdata
```

Or add to your MCP client config (Claude Code, Cursor, etc.):

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

Then ask your agent:

- "What's the CPU usage on my server?"
- "Are there any active alarms?"
- "Show me disk usage across all mounts"
- "What's the network traffic on eth0 over the last hour?"

## How It Works

Every tool follows these patterns:

- **Read tools** execute freely. No confirmation needed.
- **Write tools** return a confirmation request before executing. The agent must explicitly confirm.
- **Structured errors** with context and suggestions, not stack traces.
- **Environment-based auth.** No credentials in tool schemas or MCP messages.
- **stderr logging.** Never stdout (that's the MCP JSON-RPC channel).

## Development

```bash
npm install
npm run build
npm test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)

---

[bench.glassmkr.com](https://bench.glassmkr.com) | [glassmkr.com](https://glassmkr.com) | [@glassmkr_](https://x.com/glassmkr_)
