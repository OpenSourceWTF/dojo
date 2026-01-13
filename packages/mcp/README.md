# @opensourcewtf/dojo-mcp

> MCP server for natural language AI skill discovery

## Overview

This package provides a [Model Context Protocol](https://modelcontextprotocol.io) server that enables AI assistants to discover and install skills through natural language.

## Installation

```bash
npm install @opensourcewtf/dojo-mcp
```

## Usage

### Start the server

```bash
npx @opensourcewtf/dojo-mcp
```

### MCP Tool

The server exposes a `dojo_learn` tool:

```json
{
  "name": "dojo_learn",
  "description": "Learn a new skill or workflow. Use when user asks 'do you know X', 'teach me X', or 'learn X'",
  "inputSchema": {
    "type": "object",
    "properties": {
      "skill": {
        "type": "string",
        "description": "Skill name or search term"
      }
    },
    "required": ["skill"]
  }
}
```

### Natural Language Triggers

Users can invoke skill installation with phrases like:
- "Do you know how to create Word documents?"
- "Teach me testing"
- "Learn the debugging skill"

## Dependencies

This package requires `@opensourcewtf/dojo-cli` for skill installation.

## License

MIT
