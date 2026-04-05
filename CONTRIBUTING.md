# Contributing to The Bench

Thanks for your interest in contributing to The Bench.

## Adding a New Tool

Each Bench tool is an independent npm package in `packages/`. To add a new tool:

1. Create a new directory under `packages/` (e.g., `packages/my-tool/`)
2. Follow the same structure as `packages/netdata/`
3. Use `@glassmkr/bench-shared` for logging, errors, and confirmation patterns
4. Tag every tool as `read` or `write`
5. Write tools must use the confirmation gate pattern from `packages/shared`
6. All logging goes to stderr (never stdout)
7. Use Node.js built-in `fetch` (no axios or node-fetch)
8. Add unit tests with mocked API responses
9. Write a README for your package

## Development

```bash
npm install
npm run build
npm test
```

## Code Style

- TypeScript strict mode
- Zod for all input validation
- Structured error responses (never raw stack traces)
- No em-dashes in any content

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
