# Ralph YOLO: Plugin MCP Configuration Refactor

## Mission: 005-plugin-mcp-config
## Status: COMPLETE ✅
## Score: 9/10
## Iterations: 2

## Objective
Refactor MCP configuration to use the plugin system. Add modal `--mcp` flag to learn/search/list commands. Update env var prompts to use `${env:VAR}` format when skipped.

## Changes Made

### Phase 1: MCP Config in Plugins
- Added `McpConfig` interface to `plugin.ts`
- Updated all 5 plugins with mcpConfig:
  - Claude: `~/.claude.json`
  - Gemini: `~/.gemini/settings.json`
  - Antigravity: `~/.gemini/antigravity/mcp_config.json`
  - Codex: `~/.codex/config.toml` (TOML format)
  - Cursor: no MCP (doesn't support)

### Phase 2: MCP Config Refactor
- Refactored `mcp/config.ts` to iterate over plugins
- Added CLI detection for MCP installation
- Added `getCliCommand()` mapping

### Phase 3: Modal --mcp Flag
- `dojo learn` - default: skills only, `--mcp` for MCP only
- `dojo search` - added `--mcp` option
- `dojo list` - added `--mcp` option

### Phase 4: Env Var Format
- Skipped prompts use `${env:VAR_NAME}` format

## Files Modified
- `src/agents/plugin.ts`
- `src/agents/plugins/*.ts` (all 5)
- `src/mcp/config.ts`
- `src/commands/learn.ts`
- `src/commands/search.ts`
- `src/commands/list.ts`
- `src/index.ts`
- `test/mcp-config.test.ts`

## Test Status
- Build: ✅ Passing
- Tests: **205/205 passing**
