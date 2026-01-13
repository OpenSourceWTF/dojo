# Ralph YOLO: MCP Installation Improvements

## Mission: 009-mcp-installation-fixes
## Status: COMPLETE ✅
## Score: 10/10
## Iterations: 3

## Objective
Fix MCP installation issues and improve --mcp flag behavior across all commands.

## Issues Fixed

### 1. ESM Compatibility (require() error)
- **Problem:** `require('node:child_process')` in ESM module
- **Fix:** Changed to proper `import { execSync } from 'node:child_process'`

### 2. CLI Detection for MCP
- **Problem:** Used `getCliCommand()` function instead of `plugin.cli`
- **Fix:** Use `plugin.cli || plugin.name` directly
- **Added:** Logging when agents are skipped (shows which CLI not found)

### 3. MCP-Aware Skill Selection
- **Problem:** `dojo learn --mcp playwright` installed wrong skill (no MCP)
- **Fix:** When --mcp flag is set:
  - Filter results to skills with `mcp_servers` defined
  - If no matches, search for `mcp-<name>` variant
  - Use unified selection logic (single=auto, exact=auto, else=prompt)

### 4. Local Unlearn --mcp
- **Problem:** `dojo unlearn --mcp` only worked with `-g` flag
- **Fix:** Added MCP removal to local unlearn branch

## Files Modified
- `src/mcp/config.ts` - ESM fix, CLI detection, logging
- `src/commands/learn.ts` - MCP-aware skill selection
- `src/commands/unlearn.ts` - Local MCP removal
- `test/mcp-config.test.ts` - Updated test expectations

## Usage
```bash
# Now correctly finds mcp-playwright
dojo learn --mcp playwright

# Works without -g flag
dojo unlearn --mcp test-server

# Shows which CLIs are missing
dojo learn --mcp mcp-playwright
# Output: ⏭ Codex: skipped (codex not found)
```

## Test Status
- Build: ✅ Passing
- Tests: **205/205 passing**
