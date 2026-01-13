# Ralph YOLO: Remote Registry

**Task:** Refactor registry to fetch from github.com:OpenSourceWTF/dojo-skills.git instead of local filesystem
**Type:** Code
**Started:** 2026-01-12T20:49:09

## Iteration 1

**Original Task:** Fix registry to fetch from https://github.com/OpenSourceWTF/dojo-skills.git instead of local
**Focus this iteration:** Refactor loader.ts to fetch registry JSON from GitHub raw URLs
**Previous scores:** N/A

### Decision Log
- **Why this approach?**: Use raw.githubusercontent.com to fetch registry JSON files directly
- **Alternates considered**: Clone repo locally, use GitHub API - raw URLs are simpler and don't need auth

### Execution Log
- Refactored `loader.ts` to fetch from `raw.githubusercontent.com/OpenSourceWTF/dojo-skills`
- Added `LoadRegistryOptions` with `localOnly` flag for tests
- Changed `--registry-path` + `--local` to single `--registry` flag
- Auto-detects local paths vs GitHub URLs
- Updated all tests to use `--registry` or `{ registry: path }`
- All 80 CLI tests pass
- MCP 12 tests pass

### Verification
- `dojo search docx` → Found 1 skill from remote GitHub registry ✅
- `pnpm build` → Passes ✅
- `pnpm test` → 92/92 pass ✅

### Score

| Criterion | Score | Evidence |
|-----------|-------|----------|
| clarity | 10/10 | Single `--registry` flag auto-detects local path vs remote URL |
| completeness | 10/10 | Remote fetch works, local fallback works, tests pass |
| correctness | 10/10 | `pnpm test` 92/92 pass, `dojo search docx` returns remote skill |

## ✅ YOLO COMPLETE

All criteria achieved 10/10 with evidence.

### Evidence Summary
- **clarity**: Single `--registry` flag, auto-detects type, `dojo learn --help` shows clear usage
- **completeness**: Remote GitHub fetch ✅, local registry support ✅, all 92 tests pass ✅
- **correctness**: Build passes, all tests pass, remote search returns expected skill

<promise>CHURLISH</promise>
