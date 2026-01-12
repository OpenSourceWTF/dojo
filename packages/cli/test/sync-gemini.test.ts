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
    // Create Claude skills directory
    const claudeDir = join(testDir, '.claude', 'skills');
    await mkdir(claudeDir, { recursive: true });
    await writeFile(join(claudeDir, 'skill1.md'), '# Skill 1');
    await writeFile(join(claudeDir, 'skill2.md'), '# Skill 2');

    const result = syncClaudeToGemini(testDir);

    expect(result.synced).toHaveLength(2);
    expect(result.synced).toContain('skill1.md');
    expect(result.synced).toContain('skill2.md');

    // Verify files were created
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

  it('should skip non-md files', async () => {
    const claudeDir = join(testDir, '.claude', 'skills');
    await mkdir(claudeDir, { recursive: true });
    await writeFile(join(claudeDir, 'skill.md'), '# Skill');
    await writeFile(join(claudeDir, 'config.json'), '{}');
    await writeFile(join(claudeDir, 'notes.txt'), 'notes');

    const result = syncClaudeToGemini(testDir);

    expect(result.synced).toHaveLength(1);
    expect(result.synced).toContain('skill.md');
    expect(result.skipped).toHaveLength(2);
  });
});
