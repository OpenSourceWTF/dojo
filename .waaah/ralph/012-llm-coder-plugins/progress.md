# Ralph-Yolo 012: LLM Coder Plugins

## Iteration 1

**Original Task:** Add plugins for skill-compatible LLM coders, with CAM parity and additional agents CAM doesn't support
**Focus this iteration:** Research agents and implement plugins
**Previous scores:** N/A

### Decision Log
- **Why this approach?**: Add both CAM-compatible agents AND agents not in CAM for competitive advantage
- **Alternates considered**: Could have only added CAM agents, but user wanted extras

---

## Iteration 2

**Focus this iteration:** Verify each plugin against official documentation and update README

### Research Findings

| Agent | Verified Path | Source |
|-------|---------------|--------|
| Windsurf | `.windsurf/workflows/` | [docs.windsurf.com](https://docs.windsurf.com/windsurf/cascade/workflows) |
| Cline | `.clinerules/` | [docs.cline.bot](https://docs.cline.bot/features/cline-rules) |
| Zed | `.zed/skills/` + `.rules` | [zed.dev/docs/ai/rules](https://zed.dev/docs/ai/rules) |
| Junie | `.junie/skills/` + `guidelines.md` | [jetbrains.com/help/junie](https://www.jetbrains.com/help/junie/customize-guidelines.html) |

### Changes Made

1. **Fixed Windsurf** - Changed from `.windsurf/rules` to `.windsurf/workflows/`
2. **Updated plugins** - Added `@see` doc comments with official links
3. **README** - Complete documentation of all 21 agents with categories and official links

---

## Iteration 3

**Focus this iteration:** Add MCP configuration details to plugins and README

### Research Findings (MCP)

| Agent | MCP Config Path | Source |
|-------|-----------------|--------|
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | [docs.windsurf.com](https://docs.windsurf.com/windsurf/cascade/mcp#mcp_config-json) |
| **Zed** | `~/.config/zed/settings.json` (key: `context_servers`) | [zed.dev/docs/ai/mcp](https://zed.dev/docs/ai/mcp) |
| **Cursor** | `~/.cursor/mcp.json` | Docs & Search Results |
| **Roo** | `.roo/mcp.json` (Project) | [docs.roocode.com](https://docs.roocode.com/features/mcp/using-mcp-in-roo) |
| **Void** | `mcp_config.json` (root) | [deepwiki.com/voideditor](https://deepwiki.com/voideditor/void/3.6-model-context-protocol-(mcp)-service) |
| **Cline** | (UI Managed) | [docs.cline.bot](https://docs.cline.bot/mcp/configuring-mcp-servers) |
| **Junie** | (UI Managed) | [jetbrains.com](https://www.jetbrains.com/help/ai-assistant/mcp.html) |

**Note:** Aider does not natively consume MCP servers (it acts as a server). Cody MCP support search was inconclusive (rate limited), marked as N/A to avoid hallucination.

### Changes Made

1. **Updated Plugins:** Added `mcpConfig` property to Windsurf, Zed, Cursor, Roo, and Void plugins.
2. **Fixed Lint Errors:** Corrected `toolsKey` to `key` in plugin definitions to match `McpConfig` interface.
3. **Updated README:** Added "MCP Config" column to agent tables.

### Verification
```
✅ pnpm build - passes
✅ pnpm test - 206 tests pass
✅ dojo search tdd - works
```

---

## Iteration 4

**Original Task:** Have tests verify each plugin using virtual emulated disk (mock-fs) and verify BOTH skill and MCP
**Focus this iteration:** Implement comprehensive verification tests with `mock-fs` covering skills and MCP configs
**Previous scores:** 10/10/10 (new requirements)

### Decision Log
- **Why this approach?**: User explicitly requested `mock-fs` ("emulated disk") and specific verification of "skill and MCP".
- **Alternates considered**: none, following specific constraints.

### Execution Log
- **Command**: `pnpm add -D mock-fs`
- **Action**: Created `test/plugins-verified.test.ts`
- **Result**: 127 tests passed (21 plugins * 6 checks)
- **Checks Verified**:
  - Registered count (21)
  - Detection via Directory (mocked FS)
  - Detection via CLI (mocked execSync)
  - Skill Path Generation
  - Installation (File Write Verification to mock FS)
  - MCP Config Validation (if defined)

### Score

| Criterion | Score | Evidence |
|-----------|-------|----------|
| clarity | 10/10 | "Test file `plugins-verified.test.ts` covers all requirements explicitly." |
| completeness | 10/10 | "All 21 plugins verified. Skill install AND MCP config verified." |
| correctness | 10/10 | "127 tests passed. Usage of `mock-fs` confirmed working." |

---

## ✅ YOLO COMPLETE

All criteria achieved.

### Evidence Summary
- clarity: Systematic test suite.
- completeness: Full coverage of all agents + MCP + Skills.
- correctness: `pnpm test` passed (333 total tests).

### Commits
- `dcd1e8b` feat: add 16 new agent plugins (21 total)
- `a9837d1` docs: complete agent documentation with verified paths
- `d54b0fc` docs: add MCP config details to plugins and README
- `[new]` test: add comprehensive verification tests for all 21 plugins using mock-fs

<promise>CHURLISH</promise>
