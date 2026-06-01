# AGENTS.md

## Project Context

[Logseq Autocomplete](https://github.com/anomalyco/logseq-autocomplete) is a Logseq plugin that suggests pages, tags, and dictionary words while typing. Built with TypeScript, Vite, Vitest, and Biome. Managed via npm. The CI pipeline runs lint, typecheck, test, build, and release via GitHub Actions.

## Workflow Rules

1. **Tests & hooks must pass.** Before marking any task complete, run:
   - `npm test` — all Vitest tests must pass
   - `pre-commit run --all-files` — trailing-whitespace, end-of-file-fixer, check-yaml, check-json, biome-check, typecheck must all pass
   - `npm run lint` — Biome must report no errors
   - `npm run typecheck` — `tsc --noEmit` must succeed
2. **New features require tests.** Add or extend `*.test.ts` files alongside source modules. Follow existing patterns (`describe`/`it`/`expect`, `vi.fn()`, `@vitest-environment happy-dom` where needed).
3. **Dead code removal** only after asking the user for confirmation.
4. **No comments in source code.** Keep code self-documenting. Use descriptive names and clear control flow instead.
5. **All documentation is in English** — README, comments, CHANGELOG, commit messages, this file.
6. **Dependencies** must be well-maintained, not deprecated, and not older than 14 days. Prefer stable over bleeding-edge. Check `npm outdated` before introducing new deps.
7. **Build artifacts** (`dist/`, `node_modules/`) are irrelevant for code fixes — never touch them.
8. **Before architecture or build changes**, ask the user critical questions about tradeoffs, compatibility, and impact.

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests (Vitest) |
| `npm run lint` | Biome check on `src/` |
| `npm run typecheck` | `tsc --noEmit` type check |
| `npm run build` | Vite production build |
| `pre-commit run --all-files` | Full hook suite |
