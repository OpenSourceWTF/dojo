# @opensourcewtf/dojo-cli

> CLI tool for managing AI agent skills

## Installation

```bash
npm install -g @opensourcewtf/dojo-cli
```

## Usage

```bash
# Search for skills
dojo search testing

# Install a skill
dojo learn @anthropics/create-docx

# Install specific version
dojo learn @anthropics/create-docx@1.0.0

# List installed skills
dojo list

# Sync across agents
dojo sync

# Remove a skill
dojo unlearn create-docx
```

## Supported Agents

Skills are installed to all detected agent directories:

| Agent | Directory | Format |
|-------|-----------|--------|
| Claude | `.claude/skills/*.md` | Markdown |
| Gemini | `.agent/workflows/*.md` | Markdown |
| Cursor | `.cursor/rules/{skill}/RULE.md` | Folder + frontmatter |

## API

```typescript
import { learn } from '@opensourcewtf/dojo-cli';

await learn('@anthropics/create-docx', {
  registryPath: './registry'
});
```

## License

MIT
