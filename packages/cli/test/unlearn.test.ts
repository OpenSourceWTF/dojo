/**
 * Comprehensive tests for unlearn command
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { findSkillLocations, removeSkillSymlinks, unlearn } from '../src/commands/unlearn.js';

describe('unlearn command', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = join(tmpdir(), 'dojo-unlearn-test-' + Date.now());
    await mkdir(tmpRoot, { recursive: true });
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('findSkillLocations', () => {
    it('should find skill in Claude directory (folder format)', async () => {
      const claudeDir = join(tmpRoot, '.claude', 'skills', 'test-skill');
      await mkdir(claudeDir, { recursive: true });
      await writeFile(join(claudeDir, 'SKILL.md'), '# Test');

      const locations = findSkillLocations(tmpRoot, 'test-skill');
      expect(locations).toContain(claudeDir);
    });

    it('should find skill in Gemini directory', async () => {
      const geminiDir = join(tmpRoot, '.gemini', 'skills', 'test-skill');
      await mkdir(geminiDir, { recursive: true });
      await writeFile(join(geminiDir, 'SKILL.md'), '# Test');

      const locations = findSkillLocations(tmpRoot, 'test-skill');
      expect(locations).toContain(geminiDir);
    });

    it('should find skill in Antigravity directory', async () => {
      const agentDir = join(tmpRoot, '.agent', 'workflows');
      await mkdir(agentDir, { recursive: true });
      await writeFile(join(agentDir, 'test-skill.md'), '# Test');

      const locations = findSkillLocations(tmpRoot, 'test-skill');
      expect(locations).toContain(join(agentDir, 'test-skill.md'));
    });

    it('should find skill in Cursor directory', async () => {
      const cursorDir = join(tmpRoot, '.cursor', 'rules', 'test-skill');
      await mkdir(cursorDir, { recursive: true });
      await writeFile(join(cursorDir, 'RULE.md'), '# Test');

      const locations = findSkillLocations(tmpRoot, 'test-skill');
      expect(locations).toContain(cursorDir);
    });

    it('should find skill in Codex directory', async () => {
      const codexDir = join(tmpRoot, '.codex', 'skills', 'test-skill');
      await mkdir(codexDir, { recursive: true });
      await writeFile(join(codexDir, 'SKILL.md'), '# Test');

      const locations = findSkillLocations(tmpRoot, 'test-skill');
      expect(locations).toContain(codexDir);
    });

    it('should find skill in multiple locations', async () => {
      const claudeSkillDir = join(tmpRoot, '.claude', 'skills', 'kungfu');
      await mkdir(claudeSkillDir, { recursive: true });
      await mkdir(join(tmpRoot, '.agent', 'workflows'), { recursive: true });
      await writeFile(join(claudeSkillDir, 'SKILL.md'), '# Kungfu');
      await writeFile(join(tmpRoot, '.agent', 'workflows', 'kungfu.md'), '# Kungfu');

      const locations = findSkillLocations(tmpRoot, 'kungfu');
      expect(locations).toHaveLength(2);
    });

    it('should return empty array if skill not found', () => {
      const locations = findSkillLocations(tmpRoot, 'nonexistent');
      expect(locations).toEqual([]);
    });
  });

  describe('removeSkillSymlinks', () => {
    it('should remove symlinks but not regular files', async () => {
      // Create canonical directory
      const canonicalDir = join(tmpRoot, '.dojo', 'skills');
      await mkdir(canonicalDir, { recursive: true });
      const canonicalFile = join(canonicalDir, 'test.md');
      await writeFile(canonicalFile, '# Test');

      // Create symlink location
      const claudeDir = join(tmpRoot, '.claude', 'skills');
      await mkdir(claudeDir, { recursive: true });
      await symlink(canonicalFile, join(claudeDir, 'test.md'));

      const removed = await removeSkillSymlinks([join(claudeDir, 'test.md')]);
      expect(removed).toBe(1);
      expect(existsSync(join(claudeDir, 'test.md'))).toBe(false);
    });

    it('should skip non-symlink files with log message', async () => {
      const claudeDir = join(tmpRoot, '.claude', 'skills');
      await mkdir(claudeDir, { recursive: true });
      await writeFile(join(claudeDir, 'test.md'), '# Test');

      const removed = await removeSkillSymlinks([join(claudeDir, 'test.md')]);
      expect(removed).toBe(0);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Skipping'));
    });

    it('should skip non-existent locations', async () => {
      const removed = await removeSkillSymlinks([join(tmpRoot, 'nonexistent.md')]);
      expect(removed).toBe(0);
    });

    it('should handle directory removal when all files are symlinks', async () => {
      // Create canonical file
      const canonicalDir = join(tmpRoot, '.dojo', 'skills');
      await mkdir(canonicalDir, { recursive: true });
      const canonicalFile = join(canonicalDir, 'test.md');
      await writeFile(canonicalFile, '# Test');

      // Create directory with symlinked content
      const skillDir = join(tmpRoot, '.cursor', 'rules', 'test');
      await mkdir(skillDir, { recursive: true });
      await symlink(canonicalFile, join(skillDir, 'RULE.md'));

      const removed = await removeSkillSymlinks([skillDir]);
      expect(removed).toBe(1);
      expect(existsSync(skillDir)).toBe(false);
    });

    it('should skip directory with non-symlink files', async () => {
      const skillDir = join(tmpRoot, '.cursor', 'rules', 'test');
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, 'RULE.md'), '# Test');

      const removed = await removeSkillSymlinks([skillDir]);
      expect(removed).toBe(0);
      expect(existsSync(skillDir)).toBe(true);
    });
  });

  describe('unlearn function', () => {
    it('should remove skill locally (default)', async () => {
      // Setup
      const claudeDir = join(tmpRoot, '.claude', 'skills');
      const localDir = join(tmpRoot, '.dojo', 'skills');
      await mkdir(claudeDir, { recursive: true });
      await mkdir(localDir, { recursive: true });

      const canonicalFile = join(localDir, 'test.md');
      await writeFile(canonicalFile, '# Test');
      await symlink(canonicalFile, join(claudeDir, 'test.md'));

      await unlearn('test', {}, tmpRoot);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removing'));
      expect(existsSync(join(claudeDir, 'test.md'))).toBe(false);
      expect(existsSync(canonicalFile)).toBe(false);
    });

    it('should handle global unlearn flag', async () => {
      await unlearn('test', { global: true }, tmpRoot);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('globally'));
    });

    it('should report no symlinks found when skill does not exist', async () => {
      await unlearn('nonexistent', {}, tmpRoot);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No symlinks'));
    });
  });
});
