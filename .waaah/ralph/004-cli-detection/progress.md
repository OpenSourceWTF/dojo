# Ralph YOLO: CLI Detection & --for Flag

## Mission: 004-cli-detection
## Status: COMPLETE ✅
## Score: 10/10
## Iterations: 3

## Objective
Add CLI detection for skill installation and properly implement `--for` flag for both learn and unlearn commands.

## Changes Made

### Phase 1: Plugin System
- Added `cli` property to `AgentPlugin` interface
- Updated `createAgentPlugin` factory
- All 5 plugins now declare their CLI:
  - claude → `'claude'`
  - gemini → `'gemini'`  
  - antigravity → `'gemini'` (uses Gemini CLI)
  - cursor → `'cursor'`
  - codex → `'codex'`

### Phase 2: Detection Logic
- Added `cliExists()` function to `detector.ts`
- Added `DetectOptions.requireCli` option
- `detectAgents(root, { requireCli: true })` filters by CLI

### Phase 3: Learn Command
- Uses `requireCli: true` for skill installation
- Removed auto-create behavior
- Warns about undetected agents

### Phase 4: Unlearn Command
- Added `forAgents` to `UnlearnOptions`
- Added `--for` CLI flag
- `findSkillLocations()` accepts forAgents filter

## Test Status
- Build: ✅ Passing
- Tests: **205/205 passing**

## Files Modified
- `src/agents/plugin.ts`
- `src/agents/plugins/*.ts` (all 5)
- `src/agents/detector.ts`
- `src/commands/learn.ts`
- `src/commands/unlearn.ts`
- `src/index.ts`
- `test/learn.test.ts`
