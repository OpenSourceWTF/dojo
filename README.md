# Dojo 🥋

> A package manager for AI agent skills

[![npm version](https://img.shields.io/npm/v/@opensourcewtf/dojo-cli.svg)](https://www.npmjs.com/package/@opensourcewtf/dojo-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Dojo enables you to discover, install, and share skills across AI coding assistants like **Claude**, **Gemini**, and **Cursor**. Install a skill once, use it everywhere.

## Features

- 🔍 **Unified Search** - Find skills across a curated registry
- 📦 **Multi-Agent Install** - One install writes to Claude, Gemini, and Cursor
- 🔄 **Format Sync** - Automatically converts skills between agent formats  
- 🌳 **Dependency Resolution** - Recursively resolves skill dependencies
- 🤖 **MCP Integration** - Natural language skill discovery ("do you know testing?")

## Quick Start

```bash
# Install globally
npm install -g @opensourcewtf/dojo-cli

# Search for skills
dojo search testing

# Install a skill (writes to all agent directories)
dojo learn @anthropics/create-docx

# List installed skills
dojo list

# Sync skills across agents
dojo sync
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `dojo learn <skill>` | Install a skill (supports `skill@version`) |
| `dojo search <term>` | Search the skill registry |
| `dojo list` | Show installed skills per agent |
| `dojo sync` | Sync skills across all agent formats |
| `dojo unlearn <skill>` | Remove a skill from all agents |

## MCP Server

Dojo includes an MCP server for natural skill discovery:

```bash
# Start the MCP server
npx @opensourcewtf/dojo-mcp
```

The server exposes a `dojo_learn` tool that agents can call when users ask things like:
- "Do you know how to create Word documents?"
- "Teach me testing"
- "Learn the debugging skill"

## Supported Agents

| Agent | Directory | Format |
|-------|-----------|--------|
| Claude Code | `.claude/skills/` | `*.md` |
| Gemini CLI | `.agent/workflows/` | `*.md` |
| Cursor | `.cursor/rules/{name}/RULE.md` | Folder + frontmatter |

## Registry

Skills are sourced from the [dojo-skills](https://github.com/opensourcewtf/dojo-skills) registry, organized by:
- `official/` - Verified skills from AI vendors
- `community/` - Community-contributed skills
- `user/` - Local custom skills (gitignored)

## Development

```bash
# Clone the repo
git clone https://github.com/opensourcewtf/dojo.git
cd dojo

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Packages

| Package | Description |
|---------|-------------|
| [`@opensourcewtf/dojo-cli`](./packages/cli) | CLI tool for skill management |
| [`@opensourcewtf/dojo-mcp`](./packages/mcp) | MCP server for natural language discovery |

## License

MIT © [OpenSourceWTF](https://github.com/opensourcewtf)
