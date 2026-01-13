# @opensourcewtf/dojo-mcp

> MCP server for natural language AI skill discovery

[![npm version](https://img.shields.io/npm/v/@opensourcewtf/dojo-mcp.svg)](https://www.npmjs.com/package/@opensourcewtf/dojo-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Install

```bash
npm install @opensourcewtf/dojo-mcp
```

## MCP Configuration

### Claude Desktop

Add to `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dojo": {
      "command": "npx",
      "args": ["-y", "@opensourcewtf/dojo-mcp"]
    }
  }
}
```

### Gemini CLI

Add to your Gemini MCP settings:

```json
{
  "mcpServers": {
    "dojo": {
      "command": "npx",
      "args": ["-y", "@opensourcewtf/dojo-mcp"]
    }
  }
}
```

### Local Development

```json
{
  "mcpServers": {
    "dojo": {
      "command": "node",
      "args": ["/absolute/path/to/dojo/packages/mcp/dist/index.js"]
    }
  }
}
```

## Tool: `dojo_learn`

The server exposes a single tool for skill installation:

```
Name: dojo_learn
Description: Learn a new skill when user asks "do you know X", "teach me X", or "learn X"
```

### Input Schema

```json
{
  "skill": "string (required) - Skill name or search term",
  "version": "string (optional) - Version or commit hash"
}
```

### Example Triggers

- "Do you know how to create Word documents?"
- "Teach me testing"
- "Learn the debugging skill"

## API

```typescript
import { server, handleDojoLearn, TOOLS } from '@opensourcewtf/dojo-mcp';

// Access tool definitions
console.log(TOOLS);

// Handle learn requests programmatically
const result = await handleDojoLearn({ skill: 'testing' });
```

## License

[MIT](../../LICENSE) © OpenSourceWTF
