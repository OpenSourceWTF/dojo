import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { learn } from '../src/commands/learn.js';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('learn command', () => {
  const tmpRoot = join(tmpdir(), 'dojo-learn-test-' + Date.now());
  let mockExit: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await mkdir(tmpRoot, { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Setup registry
    const officialDir = join(tmpRoot, 'registry', 'official');
    await mkdir(officialDir, { recursive: true });
    await writeFile(
      join(officialDir, 'skills.json'),
      JSON.stringify({
        skills: {
          '@anthropics/create-docx': {
            name: 'create-docx',
            path: 'skills/create-docx',
            source: 'github:OpenSourceWTF/dojo-skills/skills/create-docx/skill.md',
            aliases: ['docx', 'word'],
            description: 'Create DOCX documents',
            tags: ['office', 'documents']
          },
          '@anthropics/file-utils': {
            name: 'file-utils',
            path: 'skills/file-utils',
            source: 'github:OpenSourceWTF/dojo-skills/skills/file-utils/skill.md',
            aliases: [],
            description: 'File utilities',
            tags: ['utils']
          },
          '@community/kungfu': {
            name: 'kungfu',
            path: 'skills/kungfu',
            source: 'github:OpenSourceWTF/dojo-skills/skills/kungfu/skill.md',
            aliases: [],
            description: 'Kung Fu skill',
            tags: ['martial-arts'],
            dependencies: ['@anthropics/file-utils']
          }
        }
      })
    );

    // Setup agent directories
    await mkdir(join(tmpRoot, '.claude', 'skills'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should parse skill name with version', () => {
    // Test internal parsing (via integration)
    // This is tested implicitly through the command
  });

  it('should search for skill in registry', async () => {
    // Mock the fetch for downloadSkill
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Create DOCX\n\nThis skill creates DOCX documents.')
    });

    await learn('@anthropics/create-docx', { registryPath: join(tmpRoot, 'registry') });

    // Verify skill was installed
    const skillPath = join(tmpRoot, '.claude', 'skills', 'create-docx.md');
    expect(existsSync(skillPath)).toBe(true);

    const content = await readFile(skillPath, 'utf-8');
    expect(content).toContain('Create DOCX');
  });

  it('should handle skill not found', async () => {
    await expect(
      learn('nonexistent-skill-xyz', { registryPath: join(tmpRoot, 'registry') })
    ).rejects.toThrow('process.exit called');

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No skills found'));
  });

  it('should resolve and install dependencies', async () => {
    // Mock the fetch for downloadSkill
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(`# Skill ${callCount}\n\nSkill content ${callCount}`)
      });
    });

    await learn('@community/kungfu', { registryPath: join(tmpRoot, 'registry') });

    // Verify both kungfu and its dependency were installed
    const kungfuPath = join(tmpRoot, '.claude', 'skills', 'kungfu.md');
    const fileUtilsPath = join(tmpRoot, '.claude', 'skills', 'file-utils.md');

    expect(existsSync(kungfuPath)).toBe(true);
    expect(existsSync(fileUtilsPath)).toBe(true);

    // Verify console output showed dependency tree
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('dependencies'));
  });

  it('should install to multiple agent directories', async () => {
    // Add Gemini directory
    await mkdir(join(tmpRoot, '.agent', 'workflows'), { recursive: true });
    // Add Cursor directory
    await mkdir(join(tmpRoot, '.cursor', 'rules'), { recursive: true });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Test Skill\n\nTest content')
    });

    await learn('@anthropics/create-docx', { registryPath: join(tmpRoot, 'registry') });

    // Verify installed in Claude
    expect(existsSync(join(tmpRoot, '.claude', 'skills', 'create-docx.md'))).toBe(true);

    // Verify installed in Gemini
    expect(existsSync(join(tmpRoot, '.agent', 'workflows', 'create-docx.md'))).toBe(true);

    // Verify installed in Cursor (folder structure)
    expect(existsSync(join(tmpRoot, '.cursor', 'rules', 'create-docx', 'RULE.md'))).toBe(true);
  });

  it('should parse version from skill@version syntax', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Versioned Skill\n\nVersion 1.0.0 content')
    });

    await learn('@anthropics/create-docx@1.0.0', { registryPath: join(tmpRoot, 'registry') });

    // Verify skill was installed
    expect(existsSync(join(tmpRoot, '.claude', 'skills', 'create-docx.md'))).toBe(true);

    // Verify fetch was called with version
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('1.0.0')
    );
  });
});
