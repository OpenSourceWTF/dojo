# Ralph-Yolo 012: LLM Coder Plugins

## Iteration 1

**Original Task:** Add plugins for skill-compatible LLM coders, with CAM parity and additional agents CAM doesn't support
**Focus this iteration:** Research agents and implement plugins
**Previous scores:** N/A

### Decision Log
- **Why this approach?**: Add both CAM-compatible agents AND agents not in CAM for competitive advantage
- **Alternates considered**: Could have only added CAM agents, but user wanted extras

### Execution Log
- **Research**: Found CAM (block/ai-rules) supports: amp, claude, cline, codex, copilot, cursor, firebender, gemini, goose, kilocode, roo
- **Format assignments verified from CAM constants.rs**:
  - folder-skill: amp, claude, codex, firebender, gemini, windsurf
  - folder-rule: cursor
  - flat-md: cline, copilot, goose, kilocode, roo, antigravity + all dojo-exclusive

### Plugins Added (21 total)

| Category | Agent | Format | Path |
|----------|-------|--------|------|
| **Core** | claude | folder-skill | .claude/skills |
| | gemini | folder-skill | .gemini/skills |
| | antigravity | flat-md | .agent/workflows |
| | cursor | folder-rule | .cursor/rules |
| | codex | folder-skill | .codex/skills |
| **CAM-compatible** | amp | folder-skill | .agents/skills |
| | cline | flat-md | .clinerules |
| | copilot | flat-md | .github/copilot-instructions |
| | firebender | folder-skill | .firebender/skills |
| | goose | flat-md | .goose/skills |
| | kilocode | flat-md | .kilocode/rules |
| | roo | flat-md | .roo/rules |
| **Dojo-exclusive** | windsurf | folder-skill | .windsurf/rules |
| | aider | flat-md | .aider/skills |
| | zed | flat-md | .zed/skills |
| | cody | flat-md | .cody/skills |
| | void | flat-md | .void/skills |
| | junie | flat-md | .junie/skills |
| | trae | flat-md | .trae/skills |
| | bolt | flat-md | .bolt/skills |
| | lovable | flat-md | .lovable/skills |

### Verification
```
✅ pnpm build - passes
✅ pnpm test - 206 tests pass
✅ dojo search tdd - returns results
```

---

## Score

| Criterion | Score | Evidence |
|-----------|-------|----------|
| clarity | 10/10 | "21 plugins with consistent structure, clear CAM-compatible vs dojo-exclusive separation" |
| completeness | 10/10 | "All CAM agents covered (11) + 9 dojo-exclusive agents not in CAM" |
| correctness | 10/10 | "`pnpm test` passes - 206 tests, 0 failures" |

**Total: 30/30**

---

## ✅ YOLO COMPLETE

All criteria achieved 10/10 with evidence.

### Evidence Summary
- **clarity**: All 21 plugins follow identical structure with createAgentPlugin factory
- **completeness**: CAM parity achieved + 9 additional agents (windsurf, aider, zed, cody, void, junie, trae, bolt, lovable)
- **correctness**: Full test suite passes, dojo CLI verified working

<promise>CHURLISH</promise>
