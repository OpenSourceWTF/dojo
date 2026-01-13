# Registry Caching Implementation

## Iteration 1

**Original Task:** Implement proper registry caching without hardcoding
**Focus:** Research + implement consolidated index approach

### Decision Log
- **Why this approach?**: 
  1. Use a `registry/index.json` that lists all registry files (no GitHub API needed)
  2. Fetch via raw.githubusercontent.com (unlimited, no auth)
  3. Cache locally in `~/.dojo/cache/` with 1-hour TTL
- **Alternates considered**: GitHub API (rate limited), git clone (heavy)

### Recommended Pattern

```
dojo-skills/
├── registry/
│   ├── index.json          # Lists all registry files
│   ├── official/
│   │   ├── anthropic.json
│   │   └── google.json
│   └── community/
│       └── awesome-tools.json
```

**index.json structure:**
```json
{
  "version": "1.0.0",
  "updated": "2026-01-12",
  "categories": {
    "official": ["anthropic.json", "google.json", "openai.json"],
    "community": []
  }
}
```

### Execution Log
