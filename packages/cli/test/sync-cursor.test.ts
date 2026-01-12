import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { claudeToCursor, syncClaudeToCursor } from '../src/sync/cursor.js';
import fs from 'fs/promises';
import path from 'path';

vi.mock('fs/promises');

describe('claudeToCursor', () => {
  it('should transform simple markdown to cursor rule format', async () => {
    const sourceContent = '# My Skill\n\nSome description.\n\n## Rules\n- Rule 1';
    const sourcePath = '/mock/project/.claude/skills/my-skill.md';
    const destPath = '/mock/project/.cursor/rules/my-skill/RULE.md';

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

    vi.mocked(fs.readFile).mockResolvedValue(sourceContent);
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

    vi.mocked(fs.readFile).mockResolvedValue(sourceContent);
    await claudeToCursor(sourcePath, destPath);

    expect(fs.writeFile).toHaveBeenCalledWith(
      destPath,
      expect.stringContaining('description: Imported from dojo'),
      'utf-8'
    );
  });
});

describe('syncClaudeToCursor', () => {
  it('should process all files in .claude/skills', async () => {
    const projectRoot = '/mock/project';
    const skillsDir = path.join(projectRoot, '.claude/skills');

    vi.mocked(fs.readdir).mockResolvedValue(['skill1.md', 'skill2.md', 'ignore.txt'] as any);
    // Mock stats for file check if needed, strictly readdir returns strings usually
    // assuming naive implementation first

    vi.mocked(fs.readFile).mockResolvedValue('# Content');

    const result = await syncClaudeToCursor(projectRoot);

    expect(fs.readdir).toHaveBeenCalledWith(skillsDir);
    // Should ignore non-md files if we decide that policy, spec implies .claude/skills contains skills
    expect(result.synced).toContain('skill1.md');
    expect(result.synced).toContain('skill2.md');
    expect(result.synced).toHaveLength(2);
  });
});
