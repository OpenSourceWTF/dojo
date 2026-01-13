# Ralph YOLO: Symlink Overwrite Fix

## Mission: 006-symlink-overwrite-fix
## Status: COMPLETE ✅
## Score: 10/10
## Iterations: 1

## Problem
`dojo learn` was failing with `EEXIST: file already exists, symlink` when reinstalling skills because `existsSync()` doesn't detect broken symlinks.

## Root Cause
- `existsSync()` returns `false` for broken symlinks
- Broken symlink exists but can't be overwritten

## Solution
Replace `existsSync()` with `lstatSync()` in try/catch:
```typescript
try {
  lstatSync(destPath);
  rmSync(destPath, { force: true });
} catch {
  // File doesn't exist
}
```

## Files Modified
- `src/agents/formats/folder-skill.ts`
- `src/agents/formats/flat-md.ts`
- `src/agents/formats/folder-rule.ts`

## Test Status
- Build: ✅ Passing
- Tests: **205/205 passing**
- Manual test: ✅ `dojo learn test` works correctly
