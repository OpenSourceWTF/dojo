/**
 * Tests for lib/install.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { installSkill } from '../src/lib/install.js';

describe('Install Library', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = join(tmpdir(), 'dojo-install-test-' + Date.now());
    await mkdir(tmpRoot, { recursive: true });

    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    // Setup test registry
    const registryDir = join(tmpRoot, 'registry', 'official');
    await mkdir(registryDir, { recursive: true });
    await writeFile(join(registryDir, 'test.json'), JSON.stringify({
      _meta: { source: 'test', updated: '2026-01-01' },
      skills: {
        '@test/basic': {
          name: 'basic',
          path: 'basic',
          source: 'file:' + join(tmpRoot, 'skills', 'basic.md'),
          aliases: [],
          description: 'Basic test skill'
        },
        '@test/with-deps': {
          name: 'with-deps',
          path: 'with-deps',
          source: 'file:' + join(tmpRoot, 'skills', 'with-deps.md'),
          aliases: [],
          dependencies: ['@test/basic']
        },
        '@test/mcp-only': {
          name: 'mcp-only',
          path: 'mcp-only',
          source: 'github:test/mcp-server',
          aliases: [],
          mcp_servers: [{
            name: 'test-mcp',
            package: '@test/mcp',
            command: 'npx',
            args: ['@test/mcp']
          }]
        }
      }
    }));

    // Create source skill files
    const skillsDir = join(tmpRoot, 'skills');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(join(skillsDir, 'basic.md'), '# Basic Skill\n\nThis is a basic skill.');
    await writeFile(join(skillsDir, 'with-deps.md'), '# Skill with Dependencies\n\nDepends on basic.');

    // Create agent directory
    await mkdir(join(tmpRoot, '.claude', 'skills'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('installSkill', () => {
    it('should be a function', () => {
      expect(installSkill).toBeDefined();
      expect(typeof installSkill).toBe('function');
    });

    it('should return failure for non-existent skill', async () => {
      const result = await installSkill('nonexistent-skill', {
        registry: join(tmpRoot, 'registry'),
        projectRoot: tmpRoot
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('No skills found');
      expect(result.installedPaths).toEqual([]);
    });

    it('should install a basic skill', async () => {
      const result = await installSkill('@test/basic', {
        registry: join(tmpRoot, 'registry'),
        projectRoot: tmpRoot
      });

      expect(result.success).toBe(true);
      expect(result.fqn).toBe('@test/basic');
      expect(result.installedPaths.length).toBeGreaterThan(0);

      // Check skill was installed to agent directory
      expect(existsSync(join(tmpRoot, '.claude', 'skills', 'basic', 'SKILL.md'))).toBe(true);
    });

    it('should install skill with dependencies', async () => {
      const result = await installSkill('@test/with-deps', {
        registry: join(tmpRoot, 'registry'),
        projectRoot: tmpRoot
      });

      expect(result.success).toBe(true);

      // Both skills should be installed
      expect(existsSync(join(tmpRoot, '.claude', 'skills', 'basic', 'SKILL.md'))).toBe(true);
      expect(existsSync(join(tmpRoot, '.claude', 'skills', 'with-deps', 'SKILL.md'))).toBe(true);
    });

    it('should inject frontmatter into skill content', async () => {
      await installSkill('@test/basic', {
        registry: join(tmpRoot, 'registry'),
        projectRoot: tmpRoot
      });

      const content = await readFile(join(tmpRoot, '.claude', 'skills', 'basic', 'SKILL.md'), 'utf-8');
      expect(content).toContain('---');
      expect(content).toContain('dojo_source:');
      expect(content).toContain('dojo_fqn: @test/basic');
    });

    it('should create .claude/skills when no agents detected', async () => {
      // Remove existing agent directory
      await rm(join(tmpRoot, '.claude'), { recursive: true, force: true });

      const result = await installSkill('@test/basic', {
        registry: join(tmpRoot, 'registry'),
        projectRoot: tmpRoot
      });

      expect(result.success).toBe(true);
      expect(existsSync(join(tmpRoot, '.claude', 'skills'))).toBe(true);
    });

    it('should install to global directory when global flag is set', async () => {
      const result = await installSkill('@test/basic', {
        registry: join(tmpRoot, 'registry'),
        projectRoot: tmpRoot,
        global: true
      });

      expect(result.success).toBe(true);
    });

    it('should handle circular dependencies gracefully', async () => {
      // Create registry with circular deps
      const registryDir = join(tmpRoot, 'registry', 'official');
      await writeFile(join(registryDir, 'circular.json'), JSON.stringify({
        skills: {
          '@test/cycle-a': {
            name: 'cycle-a',
            source: 'file:' + join(tmpRoot, 'skills', 'basic.md'),
            aliases: [],
            dependencies: ['@test/cycle-b']
          },
          '@test/cycle-b': {
            name: 'cycle-b',
            source: 'file:' + join(tmpRoot, 'skills', 'basic.md'),
            aliases: [],
            dependencies: ['@test/cycle-a']
          }
        }
      }));

      const result = await installSkill('@test/cycle-a', {
        registry: join(tmpRoot, 'registry'),
        projectRoot: tmpRoot
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Circular dependency detected');
    });

    it('should return failure message for network errors', async () => {
      // Create registry with a skill that has invalid source
      const registryPath = join(tmpRoot, 'registry', 'official');
      await mkdir(registryPath, { recursive: true });
      await writeFile(join(registryPath, 'test.json'), JSON.stringify({
        _meta: { source: 'test', updated: '2026-01-01' },
        skills: {
          '@test/invalid': {
            name: 'invalid',
            source: 'github:invalid/repo/that/does/not/exist.md',
            description: 'Test'
          }
        }
      }));

      const result = await installSkill('@test/invalid', {
        registry: join(tmpRoot, 'registry'),
        projectRoot: tmpRoot
      });

      // Should fail because the source is invalid
      expect(result.success).toBe(false);
    });
  });
});
