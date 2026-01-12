import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findSkillLocations, removeSkill } from '../src/commands/unlearn.js';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';

describe('findSkillLocations', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `unlearn-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should find skill in Claude directory', async () => {
    const claudeDir = join(testDir, '.claude', 'skills');
    await mkdir(claudeDir, { recursive: true });
    await writeFile(join(claudeDir, 'kungfu.md'), '# Kungfu');

    const result = findSkillLocations(testDir, 'kungfu');

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('.claude/skills/kungfu.md');
  });

  it('should find skill in Gemini directory', async () => {
    const geminiDir = join(testDir, '.agent', 'workflows');
    await mkdir(geminiDir, { recursive: true });
    await writeFile(join(geminiDir, 'kungfu.md'), '# Kungfu');

    const result = findSkillLocations(testDir, 'kungfu');

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('.agent/workflows/kungfu.md');
  });

  it('should find skill in Cursor directory (folder format)', async () => {
    const cursorDir = join(testDir, '.cursor', 'rules', 'kungfu');
    await mkdir(cursorDir, { recursive: true });
    await writeFile(join(cursorDir, 'RULE.md'), '# Kungfu');

    const result = findSkillLocations(testDir, 'kungfu');

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('.cursor/rules/kungfu');
  });

  it('should find skill in multiple locations', async () => {
    const claudeDir = join(testDir, '.claude', 'skills');
    const geminiDir = join(testDir, '.agent', 'workflows');
    await mkdir(claudeDir, { recursive: true });
    await mkdir(geminiDir, { recursive: true });
    await writeFile(join(claudeDir, 'kungfu.md'), '# Kungfu');
    await writeFile(join(geminiDir, 'kungfu.md'), '# Kungfu');

    const result = findSkillLocations(testDir, 'kungfu');

    expect(result).toHaveLength(2);
  });

  it('should return empty array if skill not found', async () => {
    const result = findSkillLocations(testDir, 'nonexistent');
    expect(result).toHaveLength(0);
  });
});

describe('removeSkill', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `unlearn-remove-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should remove skill from all locations', async () => {
    const claudeDir = join(testDir, '.claude', 'skills');
    const geminiDir = join(testDir, '.agent', 'workflows');
    const cursorDir = join(testDir, '.cursor', 'rules', 'kungfu');
    await mkdir(claudeDir, { recursive: true });
    await mkdir(geminiDir, { recursive: true });
    await mkdir(cursorDir, { recursive: true });
    await writeFile(join(claudeDir, 'kungfu.md'), '# Kungfu');
    await writeFile(join(geminiDir, 'kungfu.md'), '# Kungfu');
    await writeFile(join(cursorDir, 'RULE.md'), '# Kungfu');

    const locations = findSkillLocations(testDir, 'kungfu');
    const removed = await removeSkill(locations);

    expect(removed).toBe(3);
    expect(existsSync(join(claudeDir, 'kungfu.md'))).toBe(false);
    expect(existsSync(join(geminiDir, 'kungfu.md'))).toBe(false);
    expect(existsSync(cursorDir)).toBe(false);
  });
});
