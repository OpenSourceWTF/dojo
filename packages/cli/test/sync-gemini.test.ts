import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { claudeToGemini, syncClaudeToGemini } from '../src/sync/gemini.js';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('claudeToGemini', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `sync-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should copy file content 1:1', async () => {
    const sourceFile = join(testDir, 'source.md');
    const destFile = join(testDir, 'dest.md');
    const content = '# My Skill\n\nThis is a test skill.';

    await writeFile(sourceFile, content);
    claudeToGemini(sourceFile, destFile);

    const result = await readFile(destFile, 'utf-8');
    expect(result).toBe(content);
  });

  it('should create destination directory if needed', async () => {
    const sourceFile = join(testDir, 'source.md');
    const destFile = join(testDir, 'nested', 'dir', 'dest.md');
    const content = '# Nested Skill';

    await writeFile(sourceFile, content);
    claudeToGemini(sourceFile, destFile);

    const result = await readFile(destFile, 'utf-8');
    expect(result).toBe(content);
  });

  it('should skip existing files if force is false', async () => {
    const sourceFile = join(testDir, 'source.md');
    const destFile = join(testDir, 'dest.md');
    await writeFile(sourceFile, 'new content');
    await writeFile(destFile, 'old content');

    const result = claudeToGemini(sourceFile, destFile, { force: false });

    expect(result).toBe(false);
    const content = await readFile(destFile, 'utf-8');
    expect(content).toBe('old content');
  });

  it('should overwrite existing files if force is true', async () => {
    const sourceFile = join(testDir, 'source.md');
    const destFile = join(testDir, 'dest.md');
    await writeFile(sourceFile, 'new content');
    await writeFile(destFile, 'old content');

    const result = claudeToGemini(sourceFile, destFile, { force: true });

    expect(result).toBe(true);
    const content = await readFile(destFile, 'utf-8');
    expect(content).toBe('new content');
  });
});

describe('syncClaudeToGemini', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `sync-batch-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should sync all Claude skills to Gemini', async () => {
    // Create Claude skills in folder-skill format
    const skill1Dir = join(testDir, '.claude', 'skills', 'skill1');
    const skill2Dir = join(testDir, '.claude', 'skills', 'skill2');
    await mkdir(skill1Dir, { recursive: true });
    await mkdir(skill2Dir, { recursive: true });
    await writeFile(join(skill1Dir, 'SKILL.md'), '# Skill 1');
    await writeFile(join(skill2Dir, 'SKILL.md'), '# Skill 2');

    const result = syncClaudeToGemini(testDir);

    expect(result.synced).toHaveLength(2);
    expect(result.synced).toContain('skill1');
    expect(result.synced).toContain('skill2');

    // Verify files were created (flat-md output)
    const geminiDir = join(testDir, '.agent', 'workflows');
    const skill1 = await readFile(join(geminiDir, 'skill1.md'), 'utf-8');
    const skill2 = await readFile(join(geminiDir, 'skill2.md'), 'utf-8');
    expect(skill1).toBe('# Skill 1');
    expect(skill2).toBe('# Skill 2');
  });

  it('should return empty arrays when no Claude skills exist', async () => {
    const result = syncClaudeToGemini(testDir);

    expect(result.synced).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it('should skip directories without SKILL.md', async () => {
    const claudeDir = join(testDir, '.claude', 'skills');
    const skillDir = join(claudeDir, 'skill');
    const emptyDir = join(claudeDir, 'empty-dir');
    await mkdir(skillDir, { recursive: true });
    await mkdir(emptyDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), '# Skill');
    await writeFile(join(emptyDir, 'notes.txt'), 'just notes');

    const result = syncClaudeToGemini(testDir);

    expect(result.synced).toHaveLength(1);
    expect(result.synced).toContain('skill');
    // Note: empty-dir is not in skipped because claudePlugin.listSkills
    // only returns directories that contain SKILL.md
  });

  it('should skip existing files in batch sync when force is false', async () => {
    const skill1Dir = join(testDir, '.claude', 'skills', 'skill1');
    const geminiDir = join(testDir, '.agent', 'workflows');
    await mkdir(skill1Dir, { recursive: true });
    await mkdir(geminiDir, { recursive: true });

    await writeFile(join(skill1Dir, 'SKILL.md'), 'new content 1');
    await writeFile(join(geminiDir, 'skill1.md'), 'old content 1'); // Exists

    const result = syncClaudeToGemini(testDir, { force: false });

    expect(result.synced).not.toContain('skill1');
    expect(result.skipped).toContain('skill1');

    const content = await readFile(join(geminiDir, 'skill1.md'), 'utf-8');
    expect(content).toBe('old content 1');
  });
});
