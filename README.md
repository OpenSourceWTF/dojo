<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/dojo-logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/dojo-logo-light.svg">
    <img src="assets/dojo-logo-light.svg" alt="Dojo" width="180">
  </picture>
</p>

<h3 align="center">🥋 A package manager for AI agent skills</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/@opensourcewtf/dojo-cli"><img src="https://img.shields.io/npm/v/@opensourcewtf/dojo-cli.svg?style=flat-square&color=cb3837" alt="npm"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License"></a>
  <a href="https://github.com/OpenSourceWTF/dojo"><img src="https://img.shields.io/github/stars/OpenSourceWTF/dojo?style=flat-square&color=yellow" alt="Stars"></a>
</p>

<p align="center">
  Install skills once, use them across <strong>Claude</strong>, <strong>Gemini</strong>, <strong>Cursor</strong>, and <strong>Codex</strong>.
</p>

---

## ⚡ Quick Start

```bash
# Install globally
npm install -g @opensourcewtf/dojo-cli

# Search for skills
dojo search testing

# Install a skill
dojo learn test-generation

# Install an MCP server
dojo learn mcp-github
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Search** | Fuzzy search across 80+ skills from the curated registry |
| 📦 **Multi-Agent Install** | One command installs to Claude, Gemini, Cursor, and Codex |
| 🔌 **MCP Server Setup** | Auto-configures MCP servers with env var prompting |
| 🔗 **Skill Syncing** | Keep skills consistent across all your AI agents |
| ⚡ **CLI Detection** | Automatically detects which agents you have installed |

---

## 🤖 Supported Agents

| Agent | Skill Directory | MCP Config |
|-------|-----------------|------------|
| **Claude** | `.claude/skills/` | `~/.claude/claude_desktop_config.json` |
| **Gemini** | `.gemini/skills/` | `~/.gemini/settings.json` |
| **Antigravity** | `.agent/workflows/` | `~/.gemini/antigravity/mcp_config.json` |
| **Cursor** | `.cursor/rules/` | — |
| **Codex** | `.codex/skills/` | `~/.codex/config.toml` |

> **Detection:** Dojo automatically detects installed agents by checking if their CLI is in your PATH (`claude`, `gemini`, `cursor`, `codex`).

---

## 📖 CLI Reference

### `dojo learn <skill>`

Install a skill or MCP server to all detected agents.

```bash
dojo learn test-generation              # Install a skill
dojo learn mcp-github                   # Install MCP server (prompts for env vars)
dojo learn mcp-dojo --for claude        # Install only to Claude
dojo learn playwright --skill           # Install skill file only, skip MCP
dojo learn mcp-brave-search --mcp       # Install MCP config only, skip skill
```

**Options:**

| Option | Description |
|--------|-------------|
| `--registry <url>` | Custom registry URL (local path or `github:owner/repo`) |
| `--skill` | Install skill/workflow file only (skip MCP server setup) |
| `--workflow` | Alias for `--skill` |
| `--mcp` | Install MCP servers only (skip skill file) |
| `--for <agents>` | Comma-separated list: `claude`, `gemini`, `cursor`, `codex`, `antigravity` |

---

### `dojo search <query>`

Search the skill registry with fuzzy matching.

```bash
dojo search mcp                 # Find MCP servers
dojo search testing             # Find testing skills
dojo search react               # Find React-related skills
dojo search @anthropics         # Find skills by organization
```

**Options:**

| Option | Description |
|--------|-------------|
| `--registry <url>` | Custom registry URL |

**Output example:**
```
Found 3 skills matching "testing":

  [anthropics] test-generation
  Generate comprehensive unit tests for existing code
  Tags: testing, tdd, unit-tests
  Aliases: tests, unit-testing

  [executeautomation] mcp-playwright
  Playwright-based browser automation MCP server
  Tags: mcp, testing, playwright, browser
```

---

### `dojo list`

Show all installed skills per agent.

```bash
dojo list
```

**Output example:**
```
Claude (.claude/skills/):
  • test-generation
  • debugging

Gemini (.gemini/skills/):
  • test-generation
  • debugging
```

---

### `dojo sync`

Synchronize skills across all agent formats.

```bash
dojo sync              # Sync skills to all detected agents
dojo sync --force      # Overwrite existing skills
```

**Options:**

| Option | Description |
|--------|-------------|
| `-f, --force` | Overwrite existing skill files |

---

### `dojo unlearn <skill>`

Remove a skill from all agents.

```bash
dojo unlearn test-generation       # Remove with confirmation prompt
dojo unlearn debugging --yes       # Skip confirmation
```

**Options:**

| Option | Description |
|--------|-------------|
| `-y, --yes` | Skip confirmation prompt |

---

### `dojo cache <action>`

Manage the local registry cache.

```bash
dojo cache info        # Show cache statistics
dojo cache clean       # Clear the cache
```

**Actions:**

| Action | Description |
|--------|-------------|
| `info` | Display cache size and age |
| `clean` | Remove all cached registry data |

---

## 🔌 MCP Server Integration

Dojo includes its own MCP server for natural language skill discovery. Once configured, agents can respond to prompts like:

> *"Do you know how to write tests?"*  
> *"Teach me debugging"*

### Auto-Install via CLI

```bash
dojo learn mcp-dojo
```

This automatically configures the MCP server for all detected agents.

### Manual Configuration

**Claude Desktop** (`~/.claude/claude_desktop_config.json`):
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

**Gemini CLI** (`~/.gemini/settings.json`):
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

---

## 📦 Packages

| Package | Description |
|---------|-------------|
| [`@opensourcewtf/dojo-cli`](https://www.npmjs.com/package/@opensourcewtf/dojo-cli) | CLI for skill management |
| [`@opensourcewtf/dojo-mcp`](https://www.npmjs.com/package/@opensourcewtf/dojo-mcp) | MCP server for AI agents |

---

## 🗃️ Registry

Skills are sourced from the [dojo-skills](https://github.com/OpenSourceWTF/dojo-skills) registry, cached via jsDelivr CDN for fast, reliable access.

**Registry Categories:**
- `official/` — Skills from Anthropic, Google, OpenAI
- `community/` — Community-contributed skills
- `mcp/` — MCP server configurations

---

## 🛠️ Development

```bash
git clone https://github.com/OpenSourceWTF/dojo.git
cd dojo
pnpm install
pnpm build
pnpm test
```

### Project Structure

```
packages/
├── cli/     # @opensourcewtf/dojo-cli
└── mcp/     # @opensourcewtf/dojo-mcp
```

---

## 📄 License

[MIT](LICENSE) © [OpenSourceWTF](https://github.com/OpenSourceWTF)

---

<p align="center">
  <a href="https://github.com/OpenSourceWTF">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/oswtf-logo-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="assets/oswtf-logo-light.svg">
      <img src="assets/oswtf-logo-light.svg" alt="OpenSourceWTF" width="80">
    </picture>
  </a>
</p>
