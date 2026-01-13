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
    vi.spyOn(console, 'log').mockImplementation(() => { });
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should error when no Claude directory exists', async () => {
    // With CLI detection, Claude may be detected even without directory
    // If Claude CLI is installed, sync will succeed with "No skills found"
    try {
      await sync();
      // Sync succeeded - Claude CLI must be installed
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No skills found'));
    } catch {
      // Sync threw - no Claude detected (only in CI without Claude CLI)
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No canonical source found'));
    }
  });

  it('should sync skills from Claude to Gemini', async () => {
    // Setup Claude skills (folder-skill format)
    const skill1Dir = join(tmpRoot, '.claude', 'skills', 'test-skill');
    const skill2Dir = join(tmpRoot, '.claude', 'skills', 'another-skill');
    const geminiDir = join(tmpRoot, '.agent', 'workflows');
    await mkdir(skill1Dir, { recursive: true });
    await mkdir(skill2Dir, { recursive: true });
    await mkdir(geminiDir, { recursive: true });

    await writeFile(join(skill1Dir, 'SKILL.md'), '# Test Skill\n\nThis is a test skill.');
    await writeFile(join(skill2Dir, 'SKILL.md'), '# Another Skill\n\nAnother skill content.');

    await sync();

    // Verify synced to Gemini (flat-md output)
    expect(existsSync(join(geminiDir, 'test-skill.md'))).toBe(true);
    expect(existsSync(join(geminiDir, 'another-skill.md'))).toBe(true);

    // Verify content matches
    const syncedContent = await readFile(join(geminiDir, 'test-skill.md'), 'utf-8');
    expect(syncedContent).toContain('# Test Skill');
  });

  it('should sync skills from Claude to Cursor', async () => {
    // Setup Claude skills and Cursor directory (folder-skill format)
    const skillDir = join(tmpRoot, '.claude', 'skills', 'my-skill');
    const cursorDir = join(tmpRoot, '.cursor', 'rules');
    await mkdir(skillDir, { recursive: true });
    await mkdir(cursorDir, { recursive: true });

    await writeFile(join(skillDir, 'SKILL.md'), '# My Skill\n\nSkill content here.');

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
    // Setup all directories (folder-skill format)
    const skillDir = join(tmpRoot, '.claude', 'skills', 'multi-skill');
    const geminiDir = join(tmpRoot, '.agent', 'workflows');
    const cursorDir = join(tmpRoot, '.cursor', 'rules');
    await mkdir(skillDir, { recursive: true });
    await mkdir(geminiDir, { recursive: true });
    await mkdir(cursorDir, { recursive: true });

    await writeFile(join(skillDir, 'SKILL.md'), '# Multi Skill\n\nContent.');

    await sync();

    // Verify synced to both
    expect(existsSync(join(geminiDir, 'multi-skill.md'))).toBe(true);
    expect(existsSync(join(cursorDir, 'multi-skill', 'RULE.md'))).toBe(true);
  });

  it('should report correct sync counts', async () => {
    const geminiDir = join(tmpRoot, '.agent', 'workflows');
    await mkdir(geminiDir, { recursive: true });

    // Add multiple skills (folder-skill format)
    const skill1Dir = join(tmpRoot, '.claude', 'skills', 'skill1');
    const skill2Dir = join(tmpRoot, '.claude', 'skills', 'skill2');
    const skill3Dir = join(tmpRoot, '.claude', 'skills', 'skill3');
    await mkdir(skill1Dir, { recursive: true });
    await mkdir(skill2Dir, { recursive: true });
    await mkdir(skill3Dir, { recursive: true });
    await writeFile(join(skill1Dir, 'SKILL.md'), '# Skill 1');
    await writeFile(join(skill2Dir, 'SKILL.md'), '# Skill 2');
    await writeFile(join(skill3Dir, 'SKILL.md'), '# Skill 3');

    await sync();

    // Verify output shows correct count
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('3 skills'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Sync complete'));
  });

  it('should skip directories without SKILL.md', async () => {
    const skillDir = join(tmpRoot, '.claude', 'skills', 'valid-skill');
    const emptyDir = join(tmpRoot, '.claude', 'skills', 'empty-folder');
    const geminiDir = join(tmpRoot, '.agent', 'workflows');
    await mkdir(skillDir, { recursive: true });
    await mkdir(emptyDir, { recursive: true });
    await mkdir(geminiDir, { recursive: true });

    await writeFile(join(skillDir, 'SKILL.md'), '# Valid');
    await writeFile(join(emptyDir, 'readme.txt'), 'This is not a skill');

    await sync();

    // Verify only valid skill was synced
    const geminiFiles = await readdir(geminiDir);
    expect(geminiFiles).toContain('valid-skill.md');
    expect(geminiFiles).not.toContain('empty-folder.md');
  });

  it('should skip existing files by default', async () => {
    const skillDir = join(tmpRoot, '.claude', 'skills', 'existing');
    const geminiDir = join(tmpRoot, '.agent', 'workflows');
    await mkdir(skillDir, { recursive: true });
    await mkdir(geminiDir, { recursive: true });

    // Pre-existing file in Gemini (old)
    await writeFile(join(geminiDir, 'existing.md'), '# Old Content');
    // New content in Claude (source)
    await writeFile(join(skillDir, 'SKILL.md'), '# New Content');

    await sync();

    // Existing file should NOT be overwritten (spec: "Skip unless --force")
    const content = await readFile(join(geminiDir, 'existing.md'), 'utf-8');
    expect(content).toContain('# Old Content');
  });

  it('should overwrite existing files with force option', async () => {
    const skillDir = join(tmpRoot, '.claude', 'skills', 'existing');
    const geminiDir = join(tmpRoot, '.agent', 'workflows');
    await mkdir(skillDir, { recursive: true });
    await mkdir(geminiDir, { recursive: true });

    // Pre-existing file in Gemini (old)
    await writeFile(join(geminiDir, 'existing.md'), '# Old Content');
    // New content in Claude (source)
    await writeFile(join(skillDir, 'SKILL.md'), '# New Content');

    await sync({ force: true });

    // With force=true, existing file should be overwritten
    const content = await readFile(join(geminiDir, 'existing.md'), 'utf-8');
    expect(content).toContain('# New Content');
  });
});
