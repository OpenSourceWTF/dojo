# MCP Server Registry Update Task

## Context

The Dojo skill manager now supports automatic MCP server configuration when learning skills. When a skill is installed via `dojo learn <skill>`, any MCP servers defined in the registry will be automatically added to the user's MCP config (Claude Desktop, Cursor, etc.).

## Task

Update all skills in the registry that have associated MCP servers. Add the `mcp_servers` field to each skill that requires MCP functionality.

## Schema

```json
{
  "skill-name": {
    "name": "Skill Display Name",
    "source": "github:owner/repo/path",
    "mcp_servers": [
      {
        "name": "mcp-server-name",
        "package": "@scope/package-name",
        "command": "npx",
        "args": ["-y", "@scope/package-name"],
        "env": {
          "API_KEY": "",
          "OPTIONAL_VAR": "default-value"
        }
      }
    ]
  }
}
```

### Field Descriptions

- **name**: Identifier for the MCP server in config files
- **package**: npm package name (for display/documentation)
- **command**: Usually "npx" or "node"
- **args**: Command arguments (use "-y" with npx for auto-install)
- **env**: Environment variables (empty string = required, any value = default)

## Known MCP Servers to Add

Based on Anthropic's published MCP servers, update these skills:

| Skill | MCP Server | Package |
|-------|------------|---------|
| filesystem | mcp-filesystem | @anthropic-ai/mcp-server-filesystem |
| brave-search | mcp-brave-search | @anthropic-ai/mcp-server-brave-search |
| github | mcp-github | @anthropic-ai/mcp-server-github |
| gitlab | mcp-gitlab | @anthropic-ai/mcp-server-gitlab |
| google-drive | mcp-google-drive | @anthropic-ai/mcp-server-google-drive |
| google-maps | mcp-google-maps | @anthropic-ai/mcp-server-google-maps |
| memory | mcp-memory | @anthropic-ai/mcp-server-memory |
| postgres | mcp-postgres | @anthropic-ai/mcp-server-postgres |
| puppeteer | mcp-puppeteer | @anthropic-ai/mcp-server-puppeteer |
| sequential-thinking | mcp-sequential-thinking | @anthropic-ai/mcp-server-sequential-thinking |
| slack | mcp-slack | @anthropic-ai/mcp-server-slack |
| sqlite | mcp-sqlite | @anthropic-ai/mcp-server-sqlite |
| time | mcp-time | @anthropic-ai/mcp-server-time |
| fetch | mcp-fetch | @anthropic-ai/mcp-server-fetch |

## Example

For the `brave-search` skill:

```json
{
  "brave-search": {
    "name": "Brave Web Search",
    "source": "github:anthropics/skills/skills/brave-search",
    "description": "Search the web using Brave Search API",
    "tags": ["search", "web", "research"],
    "mcp_servers": [
      {
        "name": "brave-search",
        "package": "@anthropic-ai/mcp-server-brave-search",
        "command": "npx",
        "args": ["-y", "@anthropic-ai/mcp-server-brave-search"],
        "env": {
          "BRAVE_API_KEY": ""
        }
      }
    ]
  }
}
```

## Instructions

1. Review each skill in `registry/official/anthropic.json`, `google.json`, and `openai.json`
2. Research which skills have corresponding MCP server implementations
3. Add the `mcp_servers` array with proper configuration
4. Include required `env` variables with empty strings (user will be prompted)
5. Include optional `env` variables with sensible defaults
6. Commit changes with message: "feat: add MCP server configs to skills"

## Verification

After updating, users should be able to run:
```bash
dojo learn brave-search
```

And see MCP server configuration prompts:
```
🔌 Setting up MCP servers:
   brave-search requires configuration:
     BRAVE_API_KEY: <user enters key>
   ✓ brave-search → @anthropic-ai/mcp-server-brave-search
   Saved to: ~/.claude/claude_desktop_config.json
```
