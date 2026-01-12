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
    const sourcePath = '/mock/project/.claude/skills/my-skill.md';
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

    expect(fs.writeFile).toHaveBeenCalledWith(destPath, expectedContent, 'utf-8');
  });

  it('should use header as description', async () => {
    const sourceContent = '# Header Only';
    const sourcePath = '/mock/src.md';
    const destPath = '/mock/dest/RULE.md';

    // Mock file doesn't exist
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.readFile).mockResolvedValue(sourceContent);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    await claudeToCursor(sourcePath, destPath);

    expect(fs.writeFile).toHaveBeenCalledWith(
      destPath,
      expect.stringContaining('description: Header Only'),
      'utf-8'
    );
  });

  it('should use default description if file is empty', async () => {
    const sourceContent = '   ';
    const sourcePath = '/mock/src.md';
    const destPath = '/mock/dest/RULE.md';

    // Mock file doesn't exist
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.readFile).mockResolvedValue(sourceContent);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    await claudeToCursor(sourcePath, destPath);

    expect(fs.writeFile).toHaveBeenCalledWith(
      destPath,
      expect.stringContaining('description: Imported from dojo'),
      'utf-8'
    );
  });

  it('should skip existing file if force is false', async () => {
    const sourcePath = '/mock/project/.claude/skills/my-skill.md';
    const destPath = '/mock/project/.cursor/rules/my-skill/RULE.md';

    vi.mocked(fs.access).mockResolvedValue(undefined); // Exists

    const result = await claudeToCursor(sourcePath, destPath, { force: false });

    expect(result).toBe(false);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should overwrite existing file if force is true', async () => {
    const sourcePath = '/mock/project/.claude/skills/my-skill.md';
    const destPath = '/mock/project/.cursor/rules/my-skill/RULE.md';
    const sourceContent = '# Content';
    
    vi.mocked(fs.access).mockResolvedValue(undefined); // Exists
    vi.mocked(fs.readFile).mockResolvedValue(sourceContent);

    const result = await claudeToCursor(sourcePath, destPath, { force: true });

    expect(result).toBe(true);
    expect(fs.writeFile).toHaveBeenCalled();
  });
});

describe('syncClaudeToCursor', () => {
  it('should process all files in .claude/skills', async () => {
    const projectRoot = '/mock/project';
    const skillsDir = path.join(projectRoot, '.claude/skills');

    vi.mocked(fs.readdir).mockResolvedValue(['skill1.md', 'skill2.md', 'ignore.txt'] as any);
    // Mock access to fail (files don't exist)
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
    
    vi.mocked(fs.readFile).mockResolvedValue('# Content');

    const result = await syncClaudeToCursor(projectRoot);

    expect(fs.readdir).toHaveBeenCalledWith(skillsDir);
    // Should ignore non-md files if we decide that policy, spec implies .claude/skills contains skills
    expect(result.synced).toContain('skill1.md');
    expect(result.synced).toContain('skill2.md');
    expect(result.synced).toHaveLength(2);
  });

  it('should skip existing files when force is false', async () => {
    const projectRoot = '/mock/project';
    vi.mocked(fs.readdir).mockResolvedValue(['skill1.md'] as any);
    
    // Mock access to succeed (file exists)
    vi.mocked(fs.access).mockResolvedValue(undefined);

    const result = await syncClaudeToCursor(projectRoot, { force: false });

    expect(result.synced).toHaveLength(0);
    expect(result.skipped).toContain('skill1.md');
  });
});
