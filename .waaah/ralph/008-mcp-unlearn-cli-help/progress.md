# Ralph YOLO: MCP Unlearn + CLI Help

## Mission: 008-mcp-unlearn-cli-help
## Status: COMPLETE ✅
## Score: 10/10
## Iterations: 2

## Objective
1. Add `--mcp` flag to unlearn command (modal: remove MCP only)
2. Add examples and improved descriptions to CLI help

## Changes Made

### unlearn.ts
- Added `mcpMode` to `UnlearnOptions` interface
- **Fixed:** MCP removal now works in BOTH local and global modes
- Wrapped skill/symlink removal in `!options.mcpMode` conditional
- Updated success message to show "(MCP only)" when in mcpMode

### index.ts
- Added `--mcp` flag to unlearn command
- Added `.addHelpText('after', ...)` with examples to ALL commands

## Usage
```bash
# Remove MCP server config only (local mode)
dojo unlearn my-server --mcp

# Remove MCP server config only (global mode)
dojo unlearn my-server --mcp -g

# View help with examples
dojo --help
dojo learn --help
```

## Test Status
- Build: ✅ Passing
- Tests: **205/205 passing**
- Manual test: ✅ `dojo unlearn --mcp test-mcp` removes MCP configs
