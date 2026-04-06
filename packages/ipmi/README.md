# @glassmkr/bench-ipmi

MCP server for IPMI/BMC hardware management. Gives AI agents structured access to power control, sensor readings, event logs, boot device selection, and chassis status.

Part of [The Bench](https://github.com/glassmkr/bench) by [Glassmkr](https://glassmkr.com).

## Prerequisites

Requires `ipmitool` installed on the machine running the MCP server:

```bash
# Debian/Ubuntu
apt install ipmitool

# RHEL/CentOS
yum install ipmitool

# macOS
brew install ipmitool
```

## Install

```bash
npx @glassmkr/bench-ipmi
```

## Configuration

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `IPMI_HOST` | Yes | BMC IP address | -- |
| `IPMI_USER` | Yes | IPMI username | -- |
| `IPMI_PASS` | Yes | IPMI password | -- |
| `IPMI_INTERFACE` | No | IPMI interface type | lanplus |
| `IPMI_TIMEOUT_MS` | No | Command timeout in milliseconds | 10000 |

## MCP Config

```json
{
  "mcpServers": {
    "ipmi": {
      "command": "npx",
      "args": ["@glassmkr/bench-ipmi"],
      "env": {
        "IPMI_HOST": "10.0.0.1",
        "IPMI_USER": "admin",
        "IPMI_PASS": "secret"
      }
    }
  }
}
```

## Tools (12: 8 read, 4 write)

### Read tools (execute freely)

- **get_power_status** - Current power state (on/off)
- **get_sensor_readings** - Temperatures, fan speeds, voltages, power draw. Optional filter by type.
- **get_event_log** - System Event Log (SEL) entries
- **get_bmc_info** - BMC firmware version, manufacturer, product info
- **get_boot_device** - Current boot device setting
- **get_chassis_status** - Power state, last power event, intrusion, faults
- **get_lan_info** - BMC network configuration
- **get_sol_info** - Serial Over LAN status

### Write tools (require confirmation)

Write tools return a confirmation request instead of executing immediately. Call `confirm_action` with the provided token to execute.

- **power_control** - Power on, off, cycle, reset, or soft shutdown
- **set_boot_device** - Change boot device (pxe, disk, bios, cdrom)
- **clear_event_log** - Clear the System Event Log
- **confirm_action** - Execute a confirmed write operation

## Examples

Ask your agent:

- "Is the server powered on?"
- "What are the CPU temperatures?"
- "Show me the last 10 hardware events"
- "Power cycle the server" (will require confirmation)
- "Set next boot to PXE"

## License

[MIT](../../LICENSE)
