/**
 * Tests for plugin system
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, symlink, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { claudePlugin } from '../src/agents/plugins/claude.js';
import { geminiPlugin } from '../src/agents/plugins/gemini.js';
import { antigravityPlugin } from '../src/agents/plugins/antigravity.js';
import { cursorPlugin } from '../src/agents/plugins/cursor.js';
import { codexPlugin } from '../src/agents/plugins/codex.js';
import { plugins, getPlugin, getPluginNames } from '../src/agents/plugins/index.js';

describe('Agent Plugins', () => {
  let tmpRoot: string;
  let canonicalDir: string;
  let canonicalFile: string;

  beforeEach(async () => {
    tmpRoot = join(tmpdir(), 'dojo-plugins-test-' + Date.now());
    canonicalDir = join(tmpRoot, '.dojo', 'skills');
    await mkdir(canonicalDir, { recursive: true });
    canonicalFile = join(canonicalDir, 'test-skill.md');
    await writeFile(canonicalFile, '# Test Skill\n\nThis is a test skill.');
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  describe('Plugin Registry', () => {
    it('should export all plugins', () => {
      expect(plugins).toHaveLength(5);
      expect(plugins.map(p => p.name)).toEqual(['claude', 'gemini', 'antigravity', 'cursor', 'codex']);
    });

    it('should get plugin by name', () => {
      const plugin = getPlugin('claude');
      expect(plugin).toBe(claudePlugin);
    });

    it('should return undefined for unknown plugin', () => {
      const plugin = getPlugin('unknown');
      expect(plugin).toBeUndefined();
    });

    it('should get all plugin names', () => {
      const names = getPluginNames();
      expect(names).toEqual(['claude', 'gemini', 'antigravity', 'cursor', 'codex']);
    });
  });

  describe('Claude Plugin', () => {
    it('should have correct properties', () => {
      expect(claudePlugin.name).toBe('claude');
      expect(claudePlugin.displayName).toBe('Claude');
      expect(claudePlugin.format).toBe('folder-skill');
    });

    it('should detect Claude agent when directory exists', async () => {
      await mkdir(join(tmpRoot, '.claude', 'skills'), { recursive: true });
      const result = claudePlugin.detect(tmpRoot);
      expect(result).toEqual({
        name: 'claude',
        path: join(tmpRoot, '.claude', 'skills'),
        format: 'folder-skill'
      });
    });

    it('should return null when Claude directory does not exist', () => {
      const result = claudePlugin.detect(tmpRoot);
      expect(result).toBeNull();
    });

    it('should get correct skill path', () => {
      const path = claudePlugin.getSkillPath(tmpRoot, 'test-skill');
      expect(path).toBe(join(tmpRoot, '.claude', 'skills', 'test-skill', 'SKILL.md'));
    });

    it('should install skill as symlink', async () => {
      await mkdir(join(tmpRoot, '.claude', 'skills'), { recursive: true });

      const destPath = await claudePlugin.installSkill({
        projectRoot: tmpRoot,
        skillName: 'test-skill',
        canonicalPath: canonicalFile
      });

      expect(destPath).toBe('.claude/skills/test-skill');
      expect(existsSync(join(tmpRoot, '.claude', 'skills', 'test-skill', 'SKILL.md'))).toBe(true);
    });

    it('should overwrite existing skill on reinstall', async () => {
      await mkdir(join(tmpRoot, '.claude', 'skills'), { recursive: true });

      // First install
      await claudePlugin.installSkill({
        projectRoot: tmpRoot,
        skillName: 'test-skill',
        canonicalPath: canonicalFile
      });

      // Second install (should overwrite)
      const destPath = await claudePlugin.installSkill({
        projectRoot: tmpRoot,
        skillName: 'test-skill',
        canonicalPath: canonicalFile
      });

      expect(destPath).toBe('.claude/skills/test-skill');
    });

    it('should remove skill', async () => {
      const skillDir = join(tmpRoot, '.claude', 'skills', 'test-skill');
      await mkdir(skillDir, { recursive: true });
      await symlink(canonicalFile, join(skillDir, 'SKILL.md'));

      const result = await claudePlugin.removeSkill({
        projectRoot: tmpRoot,
        skillName: 'test-skill'
      });

      expect(result).toBe(true);
      expect(existsSync(skillDir)).toBe(false);
    });

    it('should return false when skill does not exist', async () => {
      const result = await claudePlugin.removeSkill({
        projectRoot: tmpRoot,
        skillName: 'nonexistent'
      });

      expect(result).toBe(false);
    });
  });

  describe('Gemini Plugin', () => {
    it('should have correct properties', () => {
      expect(geminiPlugin.name).toBe('gemini');
      expect(geminiPlugin.displayName).toBe('Gemini');
      expect(geminiPlugin.format).toBe('folder-skill');
    });

    it('should detect Gemini agent when directory exists', async () => {
      await mkdir(join(tmpRoot, '.gemini', 'skills'), { recursive: true });
      const result = geminiPlugin.detect(tmpRoot);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('gemini');
    });

    it('should return null when Gemini directory does not exist', () => {
      const result = geminiPlugin.detect(tmpRoot);
      expect(result).toBeNull();
    });

    it('should get correct skill path (folder format)', () => {
      const path = geminiPlugin.getSkillPath(tmpRoot, 'test-skill');
      expect(path).toBe(join(tmpRoot, '.gemini', 'skills', 'test-skill', 'SKILL.md'));
    });

    it('should install skill', async () => {
      await mkdir(join(tmpRoot, '.gemini', 'skills'), { recursive: true });

      const destPath = await geminiPlugin.installSkill({
        projectRoot: tmpRoot,
        skillName: 'test-skill',
        canonicalPath: canonicalFile
      });

      expect(destPath).toBe('.gemini/skills/test-skill');
    });

    it('should remove skill directory', async () => {
      const skillDir = join(tmpRoot, '.gemini', 'skills', 'test-skill');
      await mkdir(skillDir, { recursive: true });
      await symlink(canonicalFile, join(skillDir, 'SKILL.md'));

      const result = await geminiPlugin.removeSkill({
        projectRoot: tmpRoot,
        skillName: 'test-skill'
      });

      expect(result).toBe(true);
      expect(existsSync(skillDir)).toBe(false);
    });
  });

  describe('Antigravity Plugin', () => {
    it('should have correct properties', () => {
      expect(antigravityPlugin.name).toBe('antigravity');
      expect(antigravityPlugin.format).toBe('flat-md');
    });

    it('should detect Antigravity agent when directory exists', async () => {
      await mkdir(join(tmpRoot, '.agent', 'workflows'), { recursive: true });
      const result = antigravityPlugin.detect(tmpRoot);
      expect(result?.name).toBe('antigravity');
    });

    it('should get correct skill path', () => {
      const path = antigravityPlugin.getSkillPath(tmpRoot, 'test-skill');
      expect(path).toBe(join(tmpRoot, '.agent', 'workflows', 'test-skill.md'));
    });

    it('should install skill', async () => {
      await mkdir(join(tmpRoot, '.agent', 'workflows'), { recursive: true });

      await antigravityPlugin.installSkill({
        projectRoot: tmpRoot,
        skillName: 'test-skill',
        canonicalPath: canonicalFile
      });

      expect(existsSync(join(tmpRoot, '.agent', 'workflows', 'test-skill.md'))).toBe(true);
    });

    it('should remove skill', async () => {
      const skillPath = join(tmpRoot, '.agent', 'workflows', 'test-skill.md');
      await mkdir(join(tmpRoot, '.agent', 'workflows'), { recursive: true });
      await symlink(canonicalFile, skillPath);

      const result = await antigravityPlugin.removeSkill({
        projectRoot: tmpRoot,
        skillName: 'test-skill'
      });

      expect(result).toBe(true);
    });
  });

  describe('Cursor Plugin', () => {
    it('should have correct properties', () => {
      expect(cursorPlugin.name).toBe('cursor');
      expect(cursorPlugin.format).toBe('folder-rule');
    });

    it('should detect Cursor agent when directory exists', async () => {
      await mkdir(join(tmpRoot, '.cursor', 'rules'), { recursive: true });
      const result = cursorPlugin.detect(tmpRoot);
      expect(result?.name).toBe('cursor');
    });

    it('should return null when Cursor directory does not exist', () => {
      const result = cursorPlugin.detect(tmpRoot);
      expect(result).toBeNull();
    });

    it('should get correct skill path', () => {
      const path = cursorPlugin.getSkillPath(tmpRoot, 'test-skill');
      expect(path).toBe(join(tmpRoot, '.cursor', 'rules', 'test-skill', 'RULE.md'));
    });

    it('should install skill with YAML frontmatter', async () => {
      await mkdir(join(tmpRoot, '.cursor', 'rules'), { recursive: true });

      await cursorPlugin.installSkill({
        projectRoot: tmpRoot,
        skillName: 'test-skill',
        canonicalPath: canonicalFile
      });

      const rulePath = join(tmpRoot, '.cursor', 'rules', 'test-skill', 'RULE.md');
      expect(existsSync(rulePath)).toBe(true);

      const content = await readFile(rulePath, 'utf-8');
      expect(content).toContain('---');
      expect(content).toContain('name: test-skill');
      expect(content).toContain('alwaysApply: false');
    });

    it('should remove skill directory', async () => {
      const skillDir = join(tmpRoot, '.cursor', 'rules', 'test-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, 'RULE.md'), '# Test');

      const result = await cursorPlugin.removeSkill({
        projectRoot: tmpRoot,
        skillName: 'test-skill'
      });

      expect(result).toBe(true);
      expect(existsSync(skillDir)).toBe(false);
    });
  });

  describe('Codex Plugin', () => {
    it('should have correct properties', () => {
      expect(codexPlugin.name).toBe('codex');
      expect(codexPlugin.format).toBe('folder-skill');
    });

    it('should detect Codex agent when directory exists', async () => {
      await mkdir(join(tmpRoot, '.codex', 'skills'), { recursive: true });
      const result = codexPlugin.detect(tmpRoot);
      expect(result?.name).toBe('codex');
    });

    it('should return null when Codex directory does not exist', () => {
      const result = codexPlugin.detect(tmpRoot);
      expect(result).toBeNull();
    });

    it('should get correct skill path', () => {
      const path = codexPlugin.getSkillPath(tmpRoot, 'test-skill');
      expect(path).toBe(join(tmpRoot, '.codex', 'skills', 'test-skill', 'SKILL.md'));
    });

    it('should install skill', async () => {
      await mkdir(join(tmpRoot, '.codex', 'skills'), { recursive: true });

      await codexPlugin.installSkill({
        projectRoot: tmpRoot,
        skillName: 'test-skill',
        canonicalPath: canonicalFile
      });

      expect(existsSync(join(tmpRoot, '.codex', 'skills', 'test-skill', 'SKILL.md'))).toBe(true);
    });

    it('should remove skill directory', async () => {
      const skillDir = join(tmpRoot, '.codex', 'skills', 'test-skill');
      await mkdir(skillDir, { recursive: true });
      await symlink(canonicalFile, join(skillDir, 'SKILL.md'));

      const result = await codexPlugin.removeSkill({
        projectRoot: tmpRoot,
        skillName: 'test-skill'
      });

      expect(result).toBe(true);
    });

    it('should return false when skill does not exist', async () => {
      const result = await codexPlugin.removeSkill({
        projectRoot: tmpRoot,
        skillName: 'nonexistent'
      });

      expect(result).toBe(false);
    });
  });
});
