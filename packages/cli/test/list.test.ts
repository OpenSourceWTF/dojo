import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { listSkills, getInstalledSkills } from '../src/commands/list.js';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('getInstalledSkills', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `list-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should list Claude skills', async () => {
    const claudeDir = join(testDir, '.claude', 'skills');
    await mkdir(claudeDir, { recursive: true });
    await writeFile(join(claudeDir, 'skill1.md'), '# Skill 1');
    await writeFile(join(claudeDir, 'skill2.md'), '# Skill 2');

    const result = getInstalledSkills(testDir);

    expect(result.claude).toHaveLength(2);
    expect(result.claude).toContain('skill1.md');
    expect(result.claude).toContain('skill2.md');
  });

  it('should list Gemini skills', async () => {
    const geminiDir = join(testDir, '.agent', 'workflows');
    await mkdir(geminiDir, { recursive: true });
    await writeFile(join(geminiDir, 'workflow1.md'), '# Workflow 1');

    const result = getInstalledSkills(testDir);

    expect(result.gemini).toHaveLength(1);
    expect(result.gemini).toContain('workflow1.md');
  });

  it('should list Cursor rules (folder-based)', async () => {
    const cursorDir = join(testDir, '.cursor', 'rules');
    const rule1Dir = join(cursorDir, 'rule1');
    const rule2Dir = join(cursorDir, 'rule2');
    await mkdir(rule1Dir, { recursive: true });
    await mkdir(rule2Dir, { recursive: true });
    await writeFile(join(rule1Dir, 'RULE.md'), '# Rule 1');
    await writeFile(join(rule2Dir, 'RULE.md'), '# Rule 2');

    const result = getInstalledSkills(testDir);

    expect(result.cursor).toHaveLength(2);
    expect(result.cursor).toContain('rule1');
    expect(result.cursor).toContain('rule2');
  });

  it('should return empty arrays for non-existent directories', async () => {
    const result = getInstalledSkills(testDir);

    expect(result.claude).toHaveLength(0);
    expect(result.gemini).toHaveLength(0);
    expect(result.cursor).toHaveLength(0);
  });

  it('should only count .md files for flat formats', async () => {
    const claudeDir = join(testDir, '.claude', 'skills');
    await mkdir(claudeDir, { recursive: true });
    await writeFile(join(claudeDir, 'skill.md'), '# Skill');
    await writeFile(join(claudeDir, 'readme.txt'), 'readme');
    await writeFile(join(claudeDir, 'config.json'), '{}');

    const result = getInstalledSkills(testDir);

    expect(result.claude).toHaveLength(1);
    expect(result.claude).toContain('skill.md');
  });
});
