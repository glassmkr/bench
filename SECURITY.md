# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in any Bench tool, please report it responsibly.

**Email:** security@glassmkr.com

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for resolution.

## Design Principles

- Credentials are never passed through MCP tool schemas or messages
- All write operations require explicit confirmation
- Confirmation tokens expire after 5 minutes
- All logging goes to stderr (never exposed via MCP)
