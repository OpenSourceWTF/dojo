/**
 * Comprehensive tests for unlearn command
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, copyFile, symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { findSkillLocations, removeSkillFiles, unlearn } from '../src/commands/unlearn.js';

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

    it('should find broken symlinks in flat-md format', async () => {
      const agentDir = join(tmpRoot, '.agent', 'workflows');
      await mkdir(agentDir, { recursive: true });
      await symlink('/non/existent/target.md', join(agentDir, 'broken-skill.md'));

      const locations = findSkillLocations(tmpRoot, 'broken-skill');
      expect(locations).toContain(join(agentDir, 'broken-skill.md'));
    });

    it('should find directories containing broken symlinks in folder formats', async () => {
      const claudeDir = join(tmpRoot, '.claude', 'skills', 'broken-skill');
      await mkdir(claudeDir, { recursive: true });
      await symlink('/non/existent/target.md', join(claudeDir, 'SKILL.md'));

      const locations = findSkillLocations(tmpRoot, 'broken-skill');
      expect(locations).toContain(claudeDir);
    });
  });

  describe('removeSkillFiles', () => {
    it('should remove regular files', async () => {
      const claudeDir = join(tmpRoot, '.claude', 'skills');
      await mkdir(claudeDir, { recursive: true });
      await writeFile(join(claudeDir, 'test.md'), '# Test');

      const removed = await removeSkillFiles([join(claudeDir, 'test.md')]);
      expect(removed).toBe(1);
      expect(existsSync(join(claudeDir, 'test.md'))).toBe(false);
    });

    it('should skip non-existent locations', async () => {
      const removed = await removeSkillFiles([join(tmpRoot, 'nonexistent.md')]);
      expect(removed).toBe(0);
    });

    it('should remove directories recursively', async () => {
      const skillDir = join(tmpRoot, '.cursor', 'rules', 'test');
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, 'RULE.md'), '# Test');

      const removed = await removeSkillFiles([skillDir]);
      expect(removed).toBe(1);
      expect(existsSync(skillDir)).toBe(false);
    });

    it('should handle directories with multiple files', async () => {
      const skillDir = join(tmpRoot, '.cursor', 'rules', 'test');
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, 'RULE.md'), '# Test');
      await writeFile(join(skillDir, 'extra.md'), '# Extra');

      const removed = await removeSkillFiles([skillDir]);
      expect(removed).toBe(1);
      expect(existsSync(skillDir)).toBe(false);
    });

    it('should remove broken symlinks', async () => {
      const agentDir = join(tmpRoot, '.agent', 'workflows');
      await mkdir(agentDir, { recursive: true });
      const brokenLink = join(agentDir, 'broken.md');
      await symlink('/non/existent/target.md', brokenLink);

      const removed = await removeSkillFiles([brokenLink]);
      expect(removed).toBe(1);
      expect(existsSync(brokenLink)).toBe(false);
    });
  });

  describe('unlearn function', () => {
    it('should remove skill locally (default)', async () => {
      // Setup: create canonical file and copy to Claude directory
      const claudeSkillDir = join(tmpRoot, '.claude', 'skills', 'test');
      const localDir = join(tmpRoot, '.dojo', 'skills');
      await mkdir(claudeSkillDir, { recursive: true });
      await mkdir(localDir, { recursive: true });

      const canonicalFile = join(localDir, 'test.md');
      await writeFile(canonicalFile, '# Test');
      await copyFile(canonicalFile, join(claudeSkillDir, 'SKILL.md'));

      await unlearn('test', {}, tmpRoot);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removing'));
      expect(existsSync(join(claudeSkillDir, 'SKILL.md'))).toBe(false);
      expect(existsSync(canonicalFile)).toBe(false);
    });

    it('should handle global unlearn flag', async () => {
      await unlearn('test', { global: true }, tmpRoot);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('globally'));
    });

    it('should report no skill files found when skill does not exist', async () => {
      await unlearn('nonexistent', {}, tmpRoot);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No skill files found'));
    });
  });

  describe('variadic support', () => {
    it('should allow calling unlearn multiple times for different skills', async () => {
      // Create canonical skill files
      const dojoSkillsDir = join(tmpRoot, '.dojo', 'skills');
      await mkdir(dojoSkillsDir, { recursive: true });
      await writeFile(join(dojoSkillsDir, 'skill-one.md'), '# Skill One');
      await writeFile(join(dojoSkillsDir, 'skill-two.md'), '# Skill Two');

      // Create agent skill directories with copied files
      const claudeDir = join(tmpRoot, '.claude', 'skills');
      const skill1Dir = join(claudeDir, 'skill-one');
      const skill2Dir = join(claudeDir, 'skill-two');
      await mkdir(skill1Dir, { recursive: true });
      await mkdir(skill2Dir, { recursive: true });
      await copyFile(join(dojoSkillsDir, 'skill-one.md'), join(skill1Dir, 'SKILL.md'));
      await copyFile(join(dojoSkillsDir, 'skill-two.md'), join(skill2Dir, 'SKILL.md'));

      // Unlearn both
      await unlearn('skill-one', {}, tmpRoot);
      await unlearn('skill-two', {}, tmpRoot);

      // Both skill files should be gone
      expect(existsSync(join(skill1Dir, 'SKILL.md'))).toBe(false);
      expect(existsSync(join(skill2Dir, 'SKILL.md'))).toBe(false);
    });
  });
});
