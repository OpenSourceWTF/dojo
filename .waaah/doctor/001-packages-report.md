# Code Doctor Report #001: packages/

**Generated:** 2026-01-12T17:30:00-06:00  
**Target:** `packages/` (cli + mcp)  
**Status:** ✅ COMPLETED

## Revision History
- **R1:** Added P-006: Missing root `package.json` (HIGH severity)
- **R2:** Added P-007, P-008 (npm publishing), DOC-002/003/004 (architecture + readme docs)

## Summary

| Category | Count | Severity Score |
|----------|-------|----------------|
| REDUNDANT | 0 | 0 |
| COMPLEX | 0 | 0 |
| DEAD | 0 | 0 |
| PATTERN | 9 | 23 |
| DOCS | 4 | 11 |
| COVERAGE | 0 | 0 |
| SPEC | 0 | 0 |
| **TOTAL** | **13** | **34** |

## Test Status

| Package | Tests | Status |
|---------|-------|--------|
| `packages/cli` | 80 passing | ✅ |
| `packages/mcp` | 12 passing | ✅ |
| **Total** | **92 passing** | ✅ |

---

## Issues

### PATTERN (9 issues)

#### P-001: Untyped `as any` casts in test files
- **Files:** `mcp/tests/e2e/mcp-integration.test.ts:28,38`, `mcp/test/mcp-tool.test.ts:23,45`, `cli/test/sync-cursor.test.ts:117,134`
- **Severity:** LOW
- **Proposal:** Use typed mock factories or `vi.mocked<T>()` with correct generics.
- **Status:** [ ] PENDING

#### P-002: Untyped `as any` cast in production code
- **File:** `packages/cli/src/sync/cursor.ts:67`
- **Severity:** MEDIUM
- **Proposal:** Use type guard: `if (error instanceof Error && 'code' in error && error.code === 'ENOENT')`
- **Status:** [ ] PENDING

#### P-003: Untyped catch blocks in production code
- **Files:** 8 locations across `mcp/src/index.ts`, `cli/src/download/github.ts`, `cli/src/commands/unlearn.ts`, `cli/src/commands/learn.ts`, `cli/src/registry/loader.ts`, `cli/src/sync/cursor.ts`
- **Severity:** MEDIUM
- **Proposal:** Change to `catch (error: unknown)` with `error instanceof Error` guards.
- **Status:** [ ] PENDING

#### P-004: Typed catch with `any` in E2E tests
- **File:** `packages/cli/tests/e2e/dependency-chain.test.ts:184,202`
- **Severity:** LOW
- **Proposal:** Change to `catch (error: unknown)` with proper type guards.
- **Status:** [ ] PENDING

#### P-005: TODO comments indicating incomplete implementation
- **Files:** `cli/src/commands/search.ts:6`, `cli/src/registry/index.ts:14`
- **Severity:** LOW
- **Proposal:** Implement config loading from `.dojorc` or remove TODO.
- **Status:** [ ] PENDING

#### P-006: Missing root package.json in monorepo
- **File:** `/` (project root)
- **Severity:** HIGH
- **Description:** Has `pnpm-workspace.yaml` but no root `package.json`. Prevents root-level scripts and proper monorepo setup.
- **Proposal:** Create root `package.json` with `name`, `private: true`, scripts (`build`, `test`, `lint`), and shared devDependencies.
- **Status:** [ ] PENDING

#### P-007: CLI package missing npm publishing fields
- **File:** `packages/cli/package.json`
- **Severity:** HIGH
- **Missing fields:**
  - `license` (e.g., `"MIT"`)
  - `repository` (GitHub URL)
  - `author`
  - `files` (control what gets published)
  - `engines` (Node.js version requirement)
  - `keywords` (npm discoverability)
- **Proposal:** Add all required fields for npm publishing.
- **Status:** [ ] PENDING

#### P-008: MCP package not npm-publishable
- **File:** `packages/mcp/package.json`
- **Severity:** HIGH
- **Issues:**
  - Missing `license`, `repository`, `author`, `files`, `engines`, `keywords`
  - Missing `exports` field for ESM
  - Missing `prepublishOnly` script
  - Uses `workspace:*` dependency (won't work on npm)
- **Proposal:** Add all required fields. Note: `workspace:*` is auto-converted by `pnpm publish` if cli is published first.
- **Status:** [ ] PENDING

#### [EXISTING] P-009: (Reserved for future use)

---

### DOCS (4 issues)

#### DOC-001: No JSDoc documentation in source files
- **Scope:** All `packages/*/src/**/*.ts` files
- **Severity:** MEDIUM
- **Proposal:** Add JSDoc to exported functions: `learn()`, `searchRegistry()`, `resolveSkill()`, `detectCycle()`, `detectAgents()`, `downloadSkill()`
- **Status:** [ ] PENDING

#### DOC-002: Empty root README
- **File:** `/README.md`
- **Severity:** HIGH
- **Description:** Root README contains only `# dojo` (7 bytes). Projects should have comprehensive documentation.
- **Proposal:** Create proper README with:
  - Project description and tagline
  - Installation instructions
  - Quick start / usage examples
  - CLI command reference
  - MCP tool reference
  - Contributing guidelines
  - License
- **Status:** [ ] PENDING

#### DOC-003: Missing package READMEs
- **Files:** `packages/cli/README.md` (missing), `packages/mcp/README.md` (missing)
- **Severity:** MEDIUM
- **Description:** Individual packages have no README. Required for npm publishing and developer experience.
- **Proposal:** Create package-specific READMEs with installation, API reference, and examples.
- **Status:** [ ] PENDING

#### DOC-004: No architecture documentation
- **Scope:** Project-wide
- **Severity:** MEDIUM
- **Description:** No architecture overview, data flow diagrams, or design docs. Makes onboarding difficult.
- **Proposal:** Create `docs/ARCHITECTURE.md` covering:
  - System overview (CLI → Registry → GitHub → Agent directories)
  - Package responsibilities
  - Data flow diagrams (Mermaid)
  - Extension points (adding new agent formats)
- **Status:** [ ] PENDING

---

## No Issues Found

| Category | Notes |
|----------|-------|
| **REDUNDANT** | No duplicate code detected. Functions are well-factored. |
| **COMPLEX** | Largest file is `learn.ts` (235 lines) - within acceptable limits. |
| **DEAD** | All exports are used. TypeScript compiles cleanly. |
| **COVERAGE** | All 92 tests pass. |
| **SPEC** | All spec scenarios from `001-dojo-skill-manager` appear implemented. |

---

## Implementation Plan

Proposed order (highest impact first):

### Phase 1: Critical Infrastructure
1. [ ] P-006: Create root `package.json`
2. [ ] P-007: Add npm fields to cli package.json
3. [ ] P-008: Add npm fields to mcp package.json
4. [ ] DOC-002: Write comprehensive root README

### Phase 2: Documentation
5. [ ] DOC-003: Create package READMEs
6. [ ] DOC-004: Create architecture documentation
7. [ ] DOC-001: Add JSDoc to exported functions

### Phase 3: Code Quality
8. [ ] P-002: Fix `as any` in production code
9. [ ] P-003: Type catch blocks in production code
10. [ ] P-001: Fix `as any` in test files
11. [ ] P-004: Fix `catch (error: any)` in E2E tests
12. [ ] P-005: Resolve TODO comments

**Estimated Effort:** ~2-3 hours total
- Phase 1: ~45 min
- Phase 2: ~1 hour
- Phase 3: ~30 min

---

## Verification Plan

After implementation:
```bash
# Root-level commands (after P-006)
pnpm build                     # Should run across all packages
pnpm test                      # Should run across all packages

# Package tests
cd packages/cli && pnpm test   # Should remain 80 passing
cd packages/mcp && pnpm test   # Should remain 12 passing

# npm publish dry-run (after P-007, P-008)
cd packages/cli && pnpm publish --dry-run
cd packages/mcp && pnpm publish --dry-run

# Documentation validation
cat README.md | head -50       # Should show comprehensive content
ls packages/*/README.md        # Should exist
ls docs/ARCHITECTURE.md        # Should exist
```
