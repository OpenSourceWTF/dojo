import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { claudeToCursor, syncClaudeToCursor } from '../src/sync/cursor.js';
import fs from 'fs/promises';
import path from 'path';

vi.mock('fs/promises');

describe('claudeToCursor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should transform simple markdown to cursor rule format', async () => {
    const sourceContent = '# My Skill\n\nSome description.\n\n## Rules\n- Rule 1';
    const sourcePath = '/mock/project/.claude/skills/my-skill/SKILL.md';
    const destPath = '/mock/project/.cursor/rules/my-skill/RULE.md';

    // Mock file doesn't exist (access throws)
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.readFile).mockResolvedValue(sourceContent);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    await claudeToCursor(sourcePath, destPath);

    expect(fs.readFile).toHaveBeenCalledWith(sourcePath, 'utf-8');
    expect(fs.mkdir).toHaveBeenCalledWith(path.dirname(destPath), { recursive: true });

    const expectedContent = `---
name: my-skill
alwaysApply: false
description: My Skill
---

# My Skill

Some description.

## Rules
- Rule 1`;

    expect(fs.writeFile).toHaveBeenCalledWith(destPath, expectedContent);
  });

  it('should use header as description', async () => {
    const sourceContent = '# Header Only';
    const sourcePath = '/mock/src/SKILL.md';
    const destPath = '/mock/dest/RULE.md';

    // Mock file doesn't exist
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.readFile).mockResolvedValue(sourceContent);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    await claudeToCursor(sourcePath, destPath);

    expect(fs.writeFile).toHaveBeenCalledWith(
      destPath,
      expect.stringContaining('description: Header Only')
    );
  });

  it('should use default description if file is empty', async () => {
    const sourceContent = '   ';
    const sourcePath = '/mock/src/SKILL.md';
    const destPath = '/mock/dest/RULE.md';

    // Mock file doesn't exist
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.readFile).mockResolvedValue(sourceContent);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    await claudeToCursor(sourcePath, destPath);

    expect(fs.writeFile).toHaveBeenCalledWith(
      destPath,
      expect.stringContaining('description: Imported from dojo')
    );
  });

  it('should skip existing file if force is false', async () => {
    const sourcePath = '/mock/project/.claude/skills/my-skill/SKILL.md';
    const destPath = '/mock/project/.cursor/rules/my-skill/RULE.md';

    vi.mocked(fs.access).mockResolvedValue(undefined); // Exists

    const result = await claudeToCursor(sourcePath, destPath, { force: false });

    expect(result).toBe(false);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should overwrite existing file if force is true', async () => {
    const sourcePath = '/mock/project/.claude/skills/my-skill/SKILL.md';
    const destPath = '/mock/project/.cursor/rules/my-skill/RULE.md';
    const sourceContent = '# Content';

    vi.mocked(fs.access).mockResolvedValueOnce(undefined) // First call: dest exists
      .mockResolvedValue(undefined); // Subsequent calls
    vi.mocked(fs.readFile).mockResolvedValue(sourceContent);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    const result = await claudeToCursor(sourcePath, destPath, { force: true });

    expect(result).toBe(true);
    expect(fs.writeFile).toHaveBeenCalled();
  });
});

describe('syncClaudeToCursor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should process all skill directories in .claude/skills', async () => {
    const projectRoot = '/mock/project';
    const skillsDir = path.join(projectRoot, '.claude/skills');

    // Mock directory listing (folder-skill format: directories)
    vi.mocked(fs.readdir).mockResolvedValue(['skill1', 'skill2', 'not-a-skill'] as any);

    // Mock stat to identify directories
    vi.mocked(fs.stat).mockImplementation(async (p) => {
      return { isDirectory: () => true } as any;
    });

    // Mock access - first call for each skill is SKILL.md existence check
    vi.mocked(fs.access).mockImplementation(async (p) => {
      const pathStr = String(p);
      if (pathStr.endsWith('not-a-skill/SKILL.md')) {
        throw new Error('ENOENT'); // not-a-skill has no SKILL.md
      }
      if (pathStr.includes('SKILL.md')) {
        return undefined; // skill1 and skill2 have SKILL.md
      }
      throw new Error('ENOENT'); // dest files don't exist
    });

    vi.mocked(fs.readFile).mockResolvedValue('# Content');
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    const result = await syncClaudeToCursor(projectRoot);

    expect(fs.readdir).toHaveBeenCalledWith(skillsDir);
    expect(result.synced).toContain('skill1');
    expect(result.synced).toContain('skill2');
    expect(result.synced).toHaveLength(2);
    expect(result.skipped).toContain('not-a-skill');
  });

  it('should skip existing files when force is false', async () => {
    const projectRoot = '/mock/project';

    vi.mocked(fs.readdir).mockResolvedValue(['skill1'] as any);
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

    // All access calls succeed (files exist)
    vi.mocked(fs.access).mockResolvedValue(undefined);

    const result = await syncClaudeToCursor(projectRoot, { force: false });

    expect(result.synced).toHaveLength(0);
    expect(result.skipped).toContain('skill1');
  });
});
