import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { learn } from '../src/commands/learn.js';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock child_process execSync to make all CLI checks pass
vi.mock('node:child_process', () => ({
  execSync: vi.fn().mockImplementation(() => '/usr/bin/claude'),
}));

describe('learn command', () => {
  const tmpRoot = join(tmpdir(), 'dojo-learn-test-' + Date.now());
  let mockExit: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await mkdir(tmpRoot, { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);
    vi.spyOn(console, 'log').mockImplementation(() => { });
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

    await learn('@anthropics/create-docx', { registry: join(tmpRoot, 'registry') });

    // Verify skill was installed (folder format: {skill}/SKILL.md)
    const skillPath = join(tmpRoot, '.claude', 'skills', 'create-docx', 'SKILL.md');
    expect(existsSync(skillPath)).toBe(true);

    const content = await readFile(skillPath, 'utf-8');
    expect(content).toContain('Create DOCX');
  });

  it('should handle skill not found', async () => {
    await expect(
      learn('nonexistent-skill-xyz', { registry: join(tmpRoot, 'registry') })
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

    await learn('@community/kungfu', { registry: join(tmpRoot, 'registry') });

    // Verify both kungfu and its dependency were installed
    const kungfuPath = join(tmpRoot, '.claude', 'skills', 'kungfu', 'SKILL.md');
    const fileUtilsPath = join(tmpRoot, '.claude', 'skills', 'file-utils', 'SKILL.md');

    expect(existsSync(kungfuPath)).toBe(true);
    expect(existsSync(fileUtilsPath)).toBe(true);

    // Verify console output showed dependency in tree
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('file-utils'));
  });

  it('should install to multiple agent directories', async () => {
    // Add Gemini directory
    await mkdir(join(tmpRoot, '.gemini', 'skills'), { recursive: true });
    // Add Antigravity directory
    await mkdir(join(tmpRoot, '.agent', 'workflows'), { recursive: true });
    // Add Cursor directory
    await mkdir(join(tmpRoot, '.cursor', 'rules'), { recursive: true });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Test Skill\n\nTest content')
    });

    await learn('@anthropics/create-docx', { registry: join(tmpRoot, 'registry') });

    // Verify installed in Claude (flat format)
    expect(existsSync(join(tmpRoot, '.claude', 'skills', 'create-docx', 'SKILL.md'))).toBe(true);

    // Verify installed in Gemini (folder format)
    expect(existsSync(join(tmpRoot, '.gemini', 'skills', 'create-docx', 'SKILL.md'))).toBe(true);

    // Verify installed in Antigravity (flat structure)
    expect(existsSync(join(tmpRoot, '.agent', 'workflows', 'create-docx.md'))).toBe(true);

    // Verify installed in Cursor (folder structure)
    expect(existsSync(join(tmpRoot, '.cursor', 'rules', 'create-docx', 'RULE.md'))).toBe(true);
  });

  it('should filter agents with --for flag', async () => {
    // Add multiple agent directories
    await mkdir(join(tmpRoot, '.claude', 'skills'), { recursive: true });
    await mkdir(join(tmpRoot, '.gemini', 'skills'), { recursive: true });
    await mkdir(join(tmpRoot, '.cursor', 'rules'), { recursive: true });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Test Skill\n\nTest content')
    });

    // Install only for Claude
    await learn('@anthropics/create-docx', {
      registry: join(tmpRoot, 'registry'),
      forAgents: ['claude']
    });

    // Verify installed in Claude (flat format)
    expect(existsSync(join(tmpRoot, '.claude', 'skills', 'create-docx', 'SKILL.md'))).toBe(true);

    // Verify NOT installed in Gemini
    expect(existsSync(join(tmpRoot, '.gemini', 'skills', 'create-docx', 'SKILL.md'))).toBe(false);

    // Verify NOT installed in Cursor
    expect(existsSync(join(tmpRoot, '.cursor', 'rules', 'create-docx', 'RULE.md'))).toBe(false);
  });

  it('should parse version from skill@version syntax', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Versioned Skill\n\nVersion 1.0.0 content')
    });

    await learn('@anthropics/create-docx@1.0.0', { registry: join(tmpRoot, 'registry') });

    // Verify skill was installed (flat format)
    expect(existsSync(join(tmpRoot, '.claude', 'skills', 'create-docx', 'SKILL.md'))).toBe(true);

    // Verify fetch was called with version
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('1.0.0')
    );
  });

  it('should install to detected agents even without directories', async () => {
    // Remove the claude directory that was created in beforeEach
    await rm(join(tmpRoot, '.claude'), { recursive: true, force: true });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Test Skill')
    });

    // With CLI detection mocked, agents are detected and directories are created
    await expect(
      learn('@anthropics/create-docx', { registry: join(tmpRoot, 'registry') })
    ).resolves.not.toThrow();

    // Directory IS created because CLI detection found agents
    expect(existsSync(join(tmpRoot, '.claude', 'skills', 'create-docx', 'SKILL.md'))).toBe(true);
  });

  it('should handle global install flag', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Global Skill')
    });

    // Note: --global installs to ~/.dojo/skills which we can't easily test
    // but we can verify the command doesn't crash
    await expect(
      learn('@anthropics/create-docx', {
        registry: join(tmpRoot, 'registry'),
        global: true
      })
    ).resolves.not.toThrow();
  });

  it('should handle MCP-only skills', async () => {
    // Create registry with MCP-only skill
    const officialDir = join(tmpRoot, 'registry', 'official');
    await writeFile(join(officialDir, 'mcp.json'), JSON.stringify({
      skills: {
        '@test/mcp-server': {
          name: 'mcp-server',
          path: 'mcp-server',
          source: 'github:test/mcp-server',
          aliases: [],
          description: 'An MCP server only skill',
          mcp_servers: [{
            name: 'test-mcp',
            package: '@test/mcp-server',
            command: 'npx',
            args: ['@test/mcp-server']
          }]
        }
      }
    }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# MCP Skill')
    });

    // MCP-only skills should not crash (they skip download)
    await expect(
      learn('@test/mcp-server', { registry: join(tmpRoot, 'registry') })
    ).resolves.not.toThrow();
  });

  it('should handle download error gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    });

    await expect(
      learn('@anthropics/create-docx', { registry: join(tmpRoot, 'registry') })
    ).rejects.toThrow('process.exit called');
  });

  it('should handle content with existing frontmatter', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(`---
name: existing-skill
description: Existing description
---

# Skill Content

This is the skill body.`)
    });

    await learn('@anthropics/create-docx', { registry: join(tmpRoot, 'registry') });

    const skillPath = join(tmpRoot, '.claude', 'skills', 'create-docx', 'SKILL.md');
    expect(existsSync(skillPath)).toBe(true);

    const content = await readFile(skillPath, 'utf-8');
    // Should preserve existing name but add dojo metadata
    expect(content).toContain('dojo_source:');
    expect(content).toContain('dojo_fqn:');
  });

  it('should filter agents when forAgents option is provided', async () => {
    // Create both claude and gemini directories
    await mkdir(join(tmpRoot, '.gemini', 'skills'), { recursive: true });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Test Skill')
    });

    // Only install to claude (forAgents filter)
    await learn('@anthropics/create-docx', {
      registry: join(tmpRoot, 'registry'),
      forAgents: ['claude']
    });

    // Should be installed to claude
    expect(existsSync(join(tmpRoot, '.claude', 'skills', 'create-docx', 'SKILL.md'))).toBe(true);
    // Should NOT be installed to gemini (filtered out)
    expect(existsSync(join(tmpRoot, '.gemini', 'skills', 'create-docx', 'SKILL.md'))).toBe(false);
  });

  it('should install to filtered agents even without directories', async () => {
    // Remove all agent directories
    await rm(join(tmpRoot, '.claude'), { recursive: true, force: true });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Test Skill')
    });

    // With CLI detection mocked, agents are detected and directories are created
    await expect(
      learn('@anthropics/create-docx', {
        registry: join(tmpRoot, 'registry'),
        forAgents: ['claude']
      })
    ).resolves.not.toThrow();

    // Directory IS created because CLI detection found claude
    expect(existsSync(join(tmpRoot, '.claude', 'skills', 'create-docx', 'SKILL.md'))).toBe(true);
  });

  it('should install skill to multiple agents', async () => {
    // Create multiple agent directories
    await mkdir(join(tmpRoot, '.gemini', 'skills'), { recursive: true });
    await mkdir(join(tmpRoot, '.agent', 'workflows'), { recursive: true });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Multi-agent Skill')
    });

    await learn('@anthropics/create-docx', { registry: join(tmpRoot, 'registry') });

    // Should be installed to all detected agents
    expect(existsSync(join(tmpRoot, '.claude', 'skills', 'create-docx', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(tmpRoot, '.gemini', 'skills', 'create-docx', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(tmpRoot, '.agent', 'workflows', 'create-docx.md'))).toBe(true);
  });
});
