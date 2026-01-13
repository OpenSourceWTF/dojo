# Code Doctor Report #002: packages/

**Generated:** 2026-01-13T03:46:00Z
**Target:** packages/cli, packages/mcp
**Status:** PENDING_REVIEW

## Summary

| Category | Count | Severity Score |
|----------|-------|----------------|
| REDUNDANT | 1 | 3 |
| COMPLEX | 0 | 0 |
| DEAD | 0 | 0 |
| PATTERN | 1 | 1 |
| DOCS | 1 | 2 |
| COVERAGE | 0 | 0 |
| **TOTAL** | **3** | **6** |

## Issues

### REDUNDANT (1 issue)

#### R-001: Duplicated readline.createInterface() pattern
- **File:** `packages/cli/src/mcp/config.ts:91,113,185` and `packages/cli/src/commands/learn.ts:119`
- **Severity:** HIGH
- **Description:** The readline.createInterface() + question + close pattern is duplicated 4 times across 2 files. Each creates a new interface, prompts, and closes it.
- **Proposal:** Create a shared `prompt()` utility function in `packages/cli/src/utils/prompt.ts`:
  ```ts
  export async function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
      rl.question(question, answer => { rl.close(); resolve(answer); });
    });
  }
  ```
  Then refactor all 4 call sites to use this utility.
- **Status:** [ ] PENDING

---

### PATTERN (1 issue)

#### P-001: TODO comment for version tag switch
- **File:** `packages/cli/src/registry/loader.ts:13`
- **Severity:** LOW
- **Description:** TODO comment: "switch to version tags (e.g., v0.1.0) for cache control". This is a reminder for production readiness.
- **Proposal:** Either create a tracking issue/task for this, or remove the TODO and document in README that version tags should be used in production.
- **Status:** [ ] PENDING

---

### DOCS (1 issue)

#### DOC-001: No JSDoc documentation in source files
- **File:** `packages/cli/src/**/*.ts`
- **Severity:** MEDIUM
- **Description:** 0 of 19 source files have `@param` or `@returns` JSDoc annotations. While functions have doc comments, they lack formal parameter/return documentation.
- **Proposal:** This is a lower priority issue. Consider adding JSDoc only to exported public API functions:
  - `loadRegistry()` in loader.ts
  - `search()` in search.ts
  - `learn()` in learn.ts
  - `detectAgents()` in detector.ts
- **Status:** [ ] PENDING

---

## Implementation Plan

Proposed order (highest severity first):
1. [ ] R-001: Extract shared prompt utility (HIGH, reduces duplication)
2. [ ] DOC-001: Add JSDoc to public API functions (MEDIUM, improves DX)
3. [ ] P-001: Track or remove TODO (LOW, cleanup)

## Notes

- **COMPLEX:** All files under 500 lines (largest: learn.ts at 347)
- **DEAD:** No unused exports or unreachable code detected
- **COVERAGE:** Not analyzed (run `pnpm test --coverage` for details)
- **Build:** Passes cleanly
- **Tests:** 156/160 pass (4 failures in sync-gemini pre-existing)
