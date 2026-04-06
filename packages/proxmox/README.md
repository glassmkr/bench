# @glassmkr/bench-proxmox

The first MCP server for Proxmox VE. Query and manage VMs, containers, nodes, storage, and snapshots from any MCP-compatible AI agent. No need to specify node names - everything is resolved automatically.

Part of [The Bench](https://github.com/glassmkr/bench) by [Glassmkr](https://glassmkr.com).

## Install

```bash
npx @glassmkr/bench-proxmox
```

## Configuration

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `PROXMOX_URL` | Yes | Proxmox API base URL (include port) | -- |
| `PROXMOX_TOKEN_ID` | Yes | API token ID (`user@realm!tokenname`) | -- |
| `PROXMOX_TOKEN_SECRET` | Yes | API token UUID secret | -- |
| `PROXMOX_VERIFY_SSL` | No | Verify SSL certificates | false |
| `PROXMOX_TIMEOUT_MS` | No | Request timeout in milliseconds | 10000 |

### API Token Setup

Create a dedicated API token on your Proxmox node:

```bash
# Create token
pveum user token add user@pve bench --privsep=1

# Grant permissions
pveum aclmod /vms -token 'user@pve!bench' -role PVEAuditor
pveum aclmod /vms -token 'user@pve!bench' -role PVEVMUser
pveum aclmod /storage -token 'user@pve!bench' -role PVEAuditor
pveum aclmod /nodes -token 'user@pve!bench' -role PVEAuditor
```

Required permissions: `VM.Audit`, `VM.PowerMgmt`, `VM.Snapshot`, `Datastore.Audit`, `Sys.Audit`.

### SSL Note

Proxmox uses self-signed certificates by default. SSL verification is disabled by default (`PROXMOX_VERIFY_SSL=false`). Set to `true` if you have proper certificates.

## MCP Config

```json
{
  "mcpServers": {
    "proxmox": {
      "command": "npx",
      "args": ["@glassmkr/bench-proxmox"],
      "env": {
        "PROXMOX_URL": "https://pve.example.com:8006",
        "PROXMOX_TOKEN_ID": "user@pve!bench",
        "PROXMOX_TOKEN_SECRET": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
      }
    }
  }
}
```

## Tools (16: 11 read, 5 write)

### Read tools (execute freely)

- **list_resources** - Overview of all VMs, containers, nodes, and storage in one call
- **get_cluster_status** - Cluster health, quorum, node online/offline status
- **list_nodes** - All nodes with CPU, memory, disk usage, uptime
- **list_vms** - All QEMU VMs, optionally filtered by node or status
- **get_vm** - Detailed VM config + current resource usage (node auto-resolved)
- **list_containers** - All LXC containers, optionally filtered by node or status
- **get_container** - Detailed container config + current resource usage
- **list_storage** - Storage pools with capacity and usage
- **list_snapshots** - Snapshots for a VM or container
- **list_tasks** - Recent cluster tasks (backups, migrations, power ops)
- **get_task_status** - Status of a specific task by UPID

### Write tools (require confirmation)

- **vm_power** - Start, stop, shutdown, or reset a VM
- **container_power** - Start, stop, or shutdown a container
- **create_snapshot** - Create a snapshot (optional RAM state for QEMU)
- **delete_snapshot** - Delete a snapshot (irreversible)
- **confirm_action** - Execute a confirmed write operation

## Examples

Ask your agent:

- "List all running VMs in my cluster"
- "What's the CPU and memory usage on node pve1?"
- "Show me details for VM 102"
- "Create a snapshot of VM 102 called 'before-upgrade'"
- "Stop VM 105" (will require confirmation)
- "Show me storage usage across the cluster"
- "What are the recent tasks?"

## License

[MIT](../../LICENSE)
