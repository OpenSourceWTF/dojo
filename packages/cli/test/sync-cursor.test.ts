import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { claudeToCursor, syncClaudeToCursor } from '../src/sync/cursor.js';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('claudeToCursor', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = join(tmpdir(), `dojo-sync-cursor-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpRoot, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpRoot)) {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('should transform simple markdown to cursor rule format', async () => {
    // Create source file
    const sourceDir = join(tmpRoot, 'source');
    const destDir = join(tmpRoot, 'dest');
    mkdirSync(sourceDir, { recursive: true });

    const sourceContent = '# My Skill\n\nSome description.\n\n## Rules\n- Rule 1';
    const sourcePath = join(sourceDir, 'SKILL.md');
    const destPath = join(destDir, 'RULE.md');

    writeFileSync(sourcePath, sourceContent);

    const result = await claudeToCursor(sourcePath, destPath);

    expect(result).toBe(true);
    expect(existsSync(destPath)).toBe(true);

    const destContent = readFileSync(destPath, 'utf-8');
    expect(destContent).toContain('---');
    expect(destContent).toContain('name: source'); // Uses parent dir name for folder format
    expect(destContent).toContain('description: My Skill');
    expect(destContent).toContain('alwaysApply: false');
    expect(destContent).toContain('# My Skill');
  });

  it('should use header as description', async () => {
    const sourceDir = join(tmpRoot, 'test-skill');
    mkdirSync(sourceDir, { recursive: true });

    const sourcePath = join(sourceDir, 'SKILL.md');
    const destPath = join(tmpRoot, 'dest', 'RULE.md');

    writeFileSync(sourcePath, '# Header Only');

    await claudeToCursor(sourcePath, destPath);

    const destContent = readFileSync(destPath, 'utf-8');
    expect(destContent).toContain('description: Header Only');
  });

  it('should use default description if file is empty', async () => {
    const sourceDir = join(tmpRoot, 'empty-skill');
    mkdirSync(sourceDir, { recursive: true });

    const sourcePath = join(sourceDir, 'SKILL.md');
    const destPath = join(tmpRoot, 'dest', 'RULE.md');

    writeFileSync(sourcePath, '   ');

    await claudeToCursor(sourcePath, destPath);

    const destContent = readFileSync(destPath, 'utf-8');
    expect(destContent).toContain('description: Imported from dojo');
  });

  it('should skip if destination exists and force is false', async () => {
    const sourceDir = join(tmpRoot, 'skill');
    const destDir = join(tmpRoot, 'dest');
    mkdirSync(sourceDir, { recursive: true });
    mkdirSync(destDir, { recursive: true });

    const sourcePath = join(sourceDir, 'SKILL.md');
    const destPath = join(destDir, 'RULE.md');

    writeFileSync(sourcePath, '# Source');
    writeFileSync(destPath, '# Existing');

    const result = await claudeToCursor(sourcePath, destPath, { force: false });

    expect(result).toBe(false);
    expect(readFileSync(destPath, 'utf-8')).toBe('# Existing');
  });

  it('should overwrite if force is true', async () => {
    const sourceDir = join(tmpRoot, 'skill');
    const destDir = join(tmpRoot, 'dest');
    mkdirSync(sourceDir, { recursive: true });
    mkdirSync(destDir, { recursive: true });

    const sourcePath = join(sourceDir, 'SKILL.md');
    const destPath = join(destDir, 'RULE.md');

    writeFileSync(sourcePath, '# New Content');
    writeFileSync(destPath, '# Old');

    const result = await claudeToCursor(sourcePath, destPath, { force: true });

    expect(result).toBe(true);
    expect(readFileSync(destPath, 'utf-8')).toContain('# New Content');
  });
});

describe('syncClaudeToCursor', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = join(tmpdir(), `dojo-sync-cursor-batch-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpRoot, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpRoot)) {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('should process all skill directories in .claude/skills', async () => {
    const claudeSkillsDir = join(tmpRoot, '.claude', 'skills');
    const cursorRulesDir = join(tmpRoot, '.cursor', 'rules');

    // Create Claude skills (folder-skill format)
    mkdirSync(join(claudeSkillsDir, 'skill1'), { recursive: true });
    mkdirSync(join(claudeSkillsDir, 'skill2'), { recursive: true });
    mkdirSync(join(claudeSkillsDir, 'not-a-skill'), { recursive: true }); // No SKILL.md

    writeFileSync(join(claudeSkillsDir, 'skill1', 'SKILL.md'), '# Skill 1');
    writeFileSync(join(claudeSkillsDir, 'skill2', 'SKILL.md'), '# Skill 2');

    const result = await syncClaudeToCursor(tmpRoot);

    expect(result.synced).toContain('skill1');
    expect(result.synced).toContain('skill2');
    expect(result.synced).toHaveLength(2);

    // Check Cursor rules were created
    expect(existsSync(join(cursorRulesDir, 'skill1', 'RULE.md'))).toBe(true);
    expect(existsSync(join(cursorRulesDir, 'skill2', 'RULE.md'))).toBe(true);
  });

  it('should skip existing files when force is false', async () => {
    const claudeSkillsDir = join(tmpRoot, '.claude', 'skills');
    const cursorRulesDir = join(tmpRoot, '.cursor', 'rules');

    // Create Claude skill
    mkdirSync(join(claudeSkillsDir, 'skill1'), { recursive: true });
    writeFileSync(join(claudeSkillsDir, 'skill1', 'SKILL.md'), '# Skill 1');

    // Pre-create Cursor rule
    mkdirSync(join(cursorRulesDir, 'skill1'), { recursive: true });
    writeFileSync(join(cursorRulesDir, 'skill1', 'RULE.md'), '# Existing');

    const result = await syncClaudeToCursor(tmpRoot, { force: false });

    expect(result.synced).toHaveLength(0);
    expect(result.skipped).toContain('skill1');

    // Existing file unchanged
    expect(readFileSync(join(cursorRulesDir, 'skill1', 'RULE.md'), 'utf-8')).toBe('# Existing');
  });
});
