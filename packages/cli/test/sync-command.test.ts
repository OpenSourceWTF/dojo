import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sync } from '../src/commands/sync.js';
import { mkdir, writeFile, rm, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('sync command', () => {
  const tmpRoot = join(tmpdir(), 'dojo-sync-cmd-test-' + Date.now());
  let mockExit: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await mkdir(tmpRoot, { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should error when no Claude directory exists', async () => {
    await expect(sync()).rejects.toThrow('process.exit called');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No canonical source found'));
  });

  it('should sync skills from Claude to Gemini', async () => {
    // Setup Claude skills
    const claudeDir = join(tmpRoot, '.claude', 'skills');
    const geminiDir = join(tmpRoot, '.agent', 'workflows');
    await mkdir(claudeDir, { recursive: true });
    await mkdir(geminiDir, { recursive: true });

    await writeFile(join(claudeDir, 'test-skill.md'), '# Test Skill\n\nThis is a test skill.');
    await writeFile(join(claudeDir, 'another-skill.md'), '# Another Skill\n\nAnother skill content.');

    await sync();

    // Verify synced to Gemini
    expect(existsSync(join(geminiDir, 'test-skill.md'))).toBe(true);
    expect(existsSync(join(geminiDir, 'another-skill.md'))).toBe(true);

    // Verify content matches
    const syncedContent = await readFile(join(geminiDir, 'test-skill.md'), 'utf-8');
    expect(syncedContent).toContain('# Test Skill');
  });

  it('should sync skills from Claude to Cursor', async () => {
    // Setup Claude skills and Cursor directory
    const claudeDir = join(tmpRoot, '.claude', 'skills');
    const cursorDir = join(tmpRoot, '.cursor', 'rules');
    await mkdir(claudeDir, { recursive: true });
    await mkdir(cursorDir, { recursive: true });

    await writeFile(join(claudeDir, 'my-skill.md'), '# My Skill\n\nSkill content here.');

    await sync();

    // Verify synced to Cursor (folder structure with frontmatter)
    const cursorSkillPath = join(cursorDir, 'my-skill', 'RULE.md');
    expect(existsSync(cursorSkillPath)).toBe(true);

    const cursorContent = await readFile(cursorSkillPath, 'utf-8');
    expect(cursorContent).toContain('---');
    expect(cursorContent).toContain('name: my-skill');
    expect(cursorContent).toContain('# My Skill');
  });

  it('should sync to multiple agent directories', async () => {
    // Setup all directories
    const claudeDir = join(tmpRoot, '.claude', 'skills');
    const geminiDir = join(tmpRoot, '.agent', 'workflows');
    const cursorDir = join(tmpRoot, '.cursor', 'rules');
    await mkdir(claudeDir, { recursive: true });
    await mkdir(geminiDir, { recursive: true });
    await mkdir(cursorDir, { recursive: true });

    await writeFile(join(claudeDir, 'multi-skill.md'), '# Multi Skill\n\nContent.');

    await sync();

    // Verify synced to both
    expect(existsSync(join(geminiDir, 'multi-skill.md'))).toBe(true);
    expect(existsSync(join(cursorDir, 'multi-skill', 'RULE.md'))).toBe(true);
  });

  it('should report correct sync counts', async () => {
    const claudeDir = join(tmpRoot, '.claude', 'skills');
    const geminiDir = join(tmpRoot, '.agent', 'workflows');
    await mkdir(claudeDir, { recursive: true });
    await mkdir(geminiDir, { recursive: true });

    // Add multiple skills
    await writeFile(join(claudeDir, 'skill1.md'), '# Skill 1');
    await writeFile(join(claudeDir, 'skill2.md'), '# Skill 2');
    await writeFile(join(claudeDir, 'skill3.md'), '# Skill 3');

    await sync();

    // Verify output shows correct count
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('3 skills'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Sync complete'));
  });

  it('should skip non-md files', async () => {
    const claudeDir = join(tmpRoot, '.claude', 'skills');
    const geminiDir = join(tmpRoot, '.agent', 'workflows');
    await mkdir(claudeDir, { recursive: true });
    await mkdir(geminiDir, { recursive: true });

    await writeFile(join(claudeDir, 'valid-skill.md'), '# Valid');
    await writeFile(join(claudeDir, 'readme.txt'), 'This is not a skill');

    await sync();

    // Verify only .md was synced
    const geminiFiles = await readdir(geminiDir);
    expect(geminiFiles).toContain('valid-skill.md');
    expect(geminiFiles).not.toContain('readme.txt');
  });

  it('should skip existing files by default', async () => {
    const claudeDir = join(tmpRoot, '.claude', 'skills');
    const geminiDir = join(tmpRoot, '.agent', 'workflows');
    await mkdir(claudeDir, { recursive: true });
    await mkdir(geminiDir, { recursive: true });

    // Pre-existing file in Gemini (old)
    await writeFile(join(geminiDir, 'existing.md'), '# Old Content');
    // New content in Claude (source)
    await writeFile(join(claudeDir, 'existing.md'), '# New Content');

    await sync();

    // Existing file should NOT be overwritten (spec: "Skip unless --force")
    const content = await readFile(join(geminiDir, 'existing.md'), 'utf-8');
    expect(content).toContain('# Old Content');
  });

  it('should overwrite existing files with force option', async () => {
    const claudeDir = join(tmpRoot, '.claude', 'skills');
    const geminiDir = join(tmpRoot, '.agent', 'workflows');
    await mkdir(claudeDir, { recursive: true });
    await mkdir(geminiDir, { recursive: true });

    // Pre-existing file in Gemini (old)
    await writeFile(join(geminiDir, 'existing.md'), '# Old Content');
    // New content in Claude (source)
    await writeFile(join(claudeDir, 'existing.md'), '# New Content');

    await sync({ force: true });

    // With force=true, existing file should be overwritten
    const content = await readFile(join(geminiDir, 'existing.md'), 'utf-8');
    expect(content).toContain('# New Content');
  });
});
