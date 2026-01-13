# Dojo 🥋

> A package manager for AI agent skills

[![npm version](https://img.shields.io/npm/v/@opensourcewtf/dojo-cli.svg)](https://www.npmjs.com/package/@opensourcewtf/dojo-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Install skills once, use them across **Claude**, **Gemini**, and **Cursor**.

## Install

```bash
npm install -g @opensourcewtf/dojo-cli
```

## Usage

```bash
# Search for skills
dojo search testing

# Install a skill
dojo learn @anthropics/create-docx

# List installed skills
dojo list

# Sync across agents
dojo sync

# Remove a skill
dojo unlearn create-docx
```

## MCP Server Setup

Dojo includes an MCP server for natural language skill discovery. When configured, agents can respond to phrases like *"do you know testing?"* or *"teach me debugging"*.

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

Add to your Gemini settings file:

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

For local development, use the built package:

```json
{
  "mcpServers": {
    "dojo": {
      "command": "node",
      "args": ["/path/to/dojo/packages/mcp/dist/index.js"]
    }
  }
}
```

## Supported Agents

| Agent | Directory | Format |
|-------|-----------|--------|
| Claude | `.claude/skills/*.md` | Markdown |
| Gemini | `.agent/workflows/*.md` | Markdown |
| Cursor | `.cursor/rules/{skill}/RULE.md` | Folder + frontmatter |

## CLI Commands

| Command | Description |
|---------|-------------|
| `dojo learn <skill>` | Install a skill (supports `skill@version`) |
| `dojo search <term>` | Search the skill registry |
| `dojo list` | Show installed skills per agent |
| `dojo sync` | Sync skills across all agent formats |
| `dojo unlearn <skill>` | Remove a skill from all agents |

## Packages

| Package | Description |
|---------|-------------|
| [@opensourcewtf/dojo-cli](https://www.npmjs.com/package/@opensourcewtf/dojo-cli) | CLI for skill management |
| [@opensourcewtf/dojo-mcp](https://www.npmjs.com/package/@opensourcewtf/dojo-mcp) | MCP server for AI agents |

## Registry

Skills are sourced from the [dojo-skills](https://github.com/opensourcewtf/dojo-skills) registry.

## Development

```bash
git clone https://github.com/opensourcewtf/dojo.git
cd dojo
pnpm install
pnpm build
pnpm test
```

## License

[MIT](LICENSE) © OpenSourceWTF
