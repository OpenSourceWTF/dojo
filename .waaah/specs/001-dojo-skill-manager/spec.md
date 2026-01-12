# Dojo Skill Manager Specification
**Version:** 1.0 | **Status:** Ready
**Registry Repo:** `@opensourcewtf/dojo-skills`

## 1. Overview
**Problem:** AI coding assistants (Claude, Gemini, Cursor, etc.) each have their own skill/workflow formats stored in different directories. There's no unified way to discover, install, or share skills across agents.

**Users:** Developers using AI coding assistants who want to extend agent capabilities with community skills.

**Solution:** Dojo — a package manager for AI agent skills with:
- Unified registry of popular skills across ecosystems
- MCP component for organic skill discovery ("do you know kungfu?")
- CLI for programmatic skill management
- Automatic format sync across all installed agent types

## 2. Integration Path

**How users access this feature:**

| Channel | Trigger | Flow |
|---------|---------|------|
| **MCP** | `"do you know <skill>"`, `"teach me <X>"`, `"learn <X>"` | Agent calls `dojo_learn` tool → searches registry → installs to all agent dirs |
| **CLI** | `dojo learn <skill>` | Direct install with optional version |
| **CLI** | `dojo search <term>` | Search registry, display matches |
| **CLI** | `dojo list` | Show installed skills |
| **CLI** | `dojo sync` | Sync skills across all agent formats |
| **CLI** | `dojo unlearn <skill>` | Remove skill from all agent dirs |

## 3. User Stories

- [ ] US-1: As a developer, I want to say "do you know testing" and have my AI find and install testing skills
- [ ] US-2: As a developer, I want to install skills via CLI without leaving my terminal
- [ ] US-3: As a developer, I want skills to work regardless of which AI assistant I'm using
- [ ] US-4: As a contributor, I want to add custom skills to my local registry
- [ ] US-5: As a developer, I want to install specific versions of skills

## 4. Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-1 | Registry uses Option B design: `official/`, `community/`, `user/` directories with per-source JSON files |
| FR-2 | Skills are identified by FQN: `@org/skill-name` (e.g., `@anthropics/create-docx`) |
| FR-3 | Search matches against `name`, `aliases`, and `tags` fields |
| FR-4 | Collisions prompt user to pick from FQN list |
| FR-5 | MCP tool `dojo_learn` uses organic description for natural triggering |
| FR-6 | CLI supports versioning: `dojo learn skill@1.0.0` or `skill@commithash` |
| FR-7 | Skills can declare dependencies; resolver fetches recursively with cycle detection |
| FR-8 | Skills are downloaded via GitHub raw API (single file/folder, no full clone) |
| FR-9 | On install, skills are written to ALL detected agent directories (dual+ write) |
| FR-10 | Format detection is automatic based on directory structure |
| FR-11 | `dojo sync` converts skills between agent formats |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | **Simplicity**: Minimal dependencies, single-purpose tools |
| NFR-2 | **Extensibility**: Adding new agent formats requires only a new sync transformer |
| NFR-3 | **Interoperability**: Skills work seamlessly across Claude/Gemini/Cursor |

## 5. Agent Formats (V1)

| Agent | Directory | Format | Sync Transform |
|-------|-----------|--------|----------------|
| **Claude Code** | `.claude/skills/` | `*.md` | Canonical (no transform) |
| **Gemini CLI** | `.agent/workflows/` | `*.md` | 1:1 copy |
| **Cursor** | `.cursor/rules/{name}/RULE.md` | Folder + `RULE.md` | Add frontmatter wrapper |

### V2 Candidates (out of scope)
- Copilot (`.github/copilot-instructions.md`)
- Windsurf (`.windsurfrules`)
- Continue (`.continue/rules/`)
- Zed (`.rules`)

## 6. Registry Schema

### Directory Structure
```
dojo-skills/
├── registry/
│   ├── official/
│   │   ├── anthropic.json
│   │   └── google.json
│   ├── community/
│   │   └── awesome-list.json
│   └── user/                    # Gitignored, local only
│       └── *.json
└── README.md
```

### Skill Entry Schema
```json
{
  "create-docx": {
    "name": "Create Word Documents",
    "path": "create-docx",
    "source": "github:anthropics/skills",
    "aliases": ["word", "docx", "document"],
    "description": "Create and edit Microsoft Word documents",
    "tags": ["documents", "office", "productivity"],
    "dependencies": ["@anthropics/file-utils"],
    "versions": {
      "1.0.0": "a1b2c3d4",
      "1.1.0": "e5f6g7h8",
      "latest": "e5f6g7h8"
    }
  }
}
```

### Source File Schema (per registry file)
```json
{
  "_meta": {
    "source": "github:anthropics/skills",
    "updated": "2026-01-11",
    "priority": 100
  },
  "skills": { /* skill entries */ }
}
```

## 7. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Skill name collision across sources | Prompt user with FQN list to pick |
| Circular dependency detected | Error with cycle path, abort install |
| Skill already installed | Skip unless `--force` flag |
| No agent directories detected | Error: "No supported AI agents found. Create .claude/skills or .agent/workflows first" |
| Network failure during download | Retry 3x, then error with partial cleanup |
| Version not found | Error: "Version X not found. Available: [list]" |

## 8. Out of Scope

- Skill authoring/publishing workflow (V2)
- Skill updates/upgrade command (V2)
- Private registry authentication (V2)
- Copilot, Windsurf, Continue, Zed formats (V2)
- Skill validation/linting (V2)

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| CLI install time | < 2s for single skill |
| Registry search time | < 500ms |
| Formats supported | 3 (Claude, Gemini, Cursor) |
| Initial registry size | 25+ curated skills |

## 10. Implementation Tasks

| ID | Title | Size | Deps | Verify | Workspace |
|----|-------|------|------|--------|-----------|
| T1 | **Registry Schema**: Create JSON schema and initial registry structure | S | — | `ls dojo-skills/registry/official/*.json` | dojo-skills |
| T2 | **Seed Registry**: Research and add top 25 popular skills from Anthropic, Google, community | M | T1 | `jq '.skills \| length' dojo-skills/registry/official/*.json` | dojo-skills |
| T3 | **CLI Scaffold**: Create `dojo` CLI with commander.js, subcommands stub | S | — | `node dist/index.js --help \| grep -E "learn\|search\|list"` | dojo |
| T4 | **Registry Loader**: Implement registry file discovery and merging logic | S | T1 | `pnpm test -- registry.test.ts` | dojo |
| T5 | **Search Command**: Implement `dojo search <term>` with fuzzy matching | S | T4 | `node dist/index.js search docx` | dojo |
| T6 | **Agent Detector**: Auto-detect installed agent directories | S | — | `pnpm test -- agent-detector.test.ts` | dojo |
| T7 | **GitHub Downloader**: Fetch single skill via raw API with retry logic | M | — | `pnpm test -- downloader.test.ts` | dojo |
| T8 | **Dependency Resolver**: Recursive dep resolution with cycle detection | M | T4,T7 | `pnpm test -- resolver.test.ts` | dojo |
| T9 | **Format Sync: Claude→Gemini**: 1:1 copy transformer | S | T6 | `pnpm test -- sync-gemini.test.ts` | dojo |
| T10 | **Format Sync: Claude→Cursor**: Add RULE.md wrapper + frontmatter | S | T6 | `pnpm test -- sync-cursor.test.ts` | dojo |
| T11 | **Learn Command**: Implement `dojo learn <skill>[@version]` with install flow | M | T5,T6,T7,T8,T9,T10 | `node dist/index.js learn @anthropics/create-docx && ls .claude/skills/create-docx.md` | dojo |
| T12 | **List Command**: Implement `dojo list` showing installed skills per agent | S | T6 | `node dist/index.js list` | dojo |
| T13 | **Sync Command**: Implement `dojo sync` to sync existing skills across formats | S | T9,T10 | `node dist/index.js sync && ls .cursor/rules/` | dojo |
| T14 | **Unlearn Command**: Implement `dojo unlearn <skill>` with cleanup | S | T6 | `node dist/index.js unlearn test-skill && ! ls .claude/skills/test-skill.md` | dojo |
| T15 | **MCP Server**: Create MCP server with `dojo_learn` tool, organic description | M | T11 | `curl localhost:3000/mcp/tools \| jq '.tools[] \| select(.name=="dojo_learn")'` | dojo |

## 11. Verification Tasks (E2E)

| ID | Title | Size | Deps | Verify | Workspace |
|----|-------|------|------|--------|-----------|
| V1 | **E2E: CLI Install Flow** | M | T11 | `pnpm test -- e2e/cli-install.test.ts` | dojo |
| V2 | **E2E: Multi-Format Sync** | M | T13 | `pnpm test -- e2e/multi-format-sync.test.ts` | dojo |
| V3 | **E2E: MCP Integration** | M | T15 | `pnpm test -- e2e/mcp-integration.test.ts` | dojo |
| V4 | **E2E: Dependency Resolution** | M | T8,T11 | `pnpm test -- e2e/dependency-chain.test.ts` | dojo |

## 12. Open Questions

| Question | Status | Resolution |
|----------|--------|------------|
| Where should dojo-skills registry live? | RESOLVED | `@opensourcewtf/dojo-skills` repo |
| Which agent formats for V1? | RESOLVED | Claude, Gemini, Cursor |
| How to handle skill collisions? | RESOLVED | Prompt user to pick by FQN |
| Version format? | RESOLVED | `skill@version` or `skill@commithash` |
