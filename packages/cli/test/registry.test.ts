/**
 * Tests for registry loader
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadRegistry, mergeRegistries } from '../src/registry/loader.js';

describe('Registry Loader', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = join(tmpdir(), 'dojo-registry-test-' + Date.now());
    await mkdir(tmpRoot, { recursive: true });
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('mergeRegistries', () => {
    it('should merge multiple registries', () => {
      const reg1 = {
        skills: new Map([
          ['@test/skill1', { name: 'skill1', path: 'skill1', source: 'test', aliases: [] }]
        ])
      };
      const reg2 = {
        skills: new Map([
          ['@test/skill2', { name: 'skill2', path: 'skill2', source: 'test', aliases: [] }]
        ])
      };

      const merged = mergeRegistries(reg1, reg2);

      expect(merged.skills.size).toBe(2);
      expect(merged.skills.has('@test/skill1')).toBe(true);
      expect(merged.skills.has('@test/skill2')).toBe(true);
    });

    it('should give priority to first registry on conflicts', () => {
      const reg1 = {
        skills: new Map([
          ['@test/skill', { name: 'priority-version', path: 'skill', source: 'test', aliases: [] }]
        ])
      };
      const reg2 = {
        skills: new Map([
          ['@test/skill', { name: 'lower-priority', path: 'skill', source: 'test', aliases: [] }]
        ])
      };

      const merged = mergeRegistries(reg1, reg2);

      expect(merged.skills.get('@test/skill')?.name).toBe('priority-version');
    });

    it('should handle empty registries', () => {
      const emptyReg = { skills: new Map() };
      const reg = {
        skills: new Map([
          ['@test/skill', { name: 'skill', path: 'skill', source: 'test', aliases: [] }]
        ])
      };

      const merged = mergeRegistries(emptyReg, reg);

      expect(merged.skills.size).toBe(1);
    });
  });

  describe('loadRegistry', () => {
    it('should load local registry in localOnly mode', async () => {
      const officialDir = join(tmpRoot, 'registry', 'official');
      await mkdir(officialDir, { recursive: true });
      await writeFile(join(officialDir, 'test.json'), JSON.stringify({
        _meta: { source: 'test', updated: '2026-01-01', priority: 100 },
        skills: {
          '@test/skill1': { name: 'skill1', path: 'skill1', source: 'test', aliases: [] }
        }
      }));

      const registry = await loadRegistry(join(tmpRoot, 'registry'), { localOnly: true });

      expect(registry.skills.size).toBe(1);
      expect(registry.skills.has('@test/skill1')).toBe(true);
    });

    it('should load from multiple directories', async () => {
      const officialDir = join(tmpRoot, 'registry', 'official');
      const communityDir = join(tmpRoot, 'registry', 'community');
      await mkdir(officialDir, { recursive: true });
      await mkdir(communityDir, { recursive: true });

      await writeFile(join(officialDir, 'test.json'), JSON.stringify({
        skills: {
          '@official/skill': { name: 'official-skill', path: 'skill', source: 'test', aliases: [] }
        }
      }));
      await writeFile(join(communityDir, 'test.json'), JSON.stringify({
        skills: {
          '@community/skill': { name: 'community-skill', path: 'skill', source: 'test', aliases: [] }
        }
      }));

      const registry = await loadRegistry(join(tmpRoot, 'registry'), { localOnly: true });

      expect(registry.skills.size).toBe(2);
    });

    it('should return empty registry when no files exist', async () => {
      const emptyDir = join(tmpRoot, 'empty-registry', 'official');
      await mkdir(emptyDir, { recursive: true });

      const registry = await loadRegistry(join(tmpRoot, 'empty-registry'), { localOnly: true });
      expect(registry.skills.size).toBe(0);
    });

    it('should skip non-json files', async () => {
      const officialDir = join(tmpRoot, 'registry', 'official');
      await mkdir(officialDir, { recursive: true });
      await writeFile(join(officialDir, 'readme.txt'), 'not json');
      await writeFile(join(officialDir, 'valid.json'), JSON.stringify({
        skills: { '@test/skill': { name: 'skill', path: 'skill', source: 'test', aliases: [] } }
      }));

      const registry = await loadRegistry(join(tmpRoot, 'registry'), { localOnly: true });

      expect(registry.skills.size).toBe(1);
    });

    it('should handle malformed JSON gracefully', async () => {
      const officialDir = join(tmpRoot, 'registry', 'official');
      await mkdir(officialDir, { recursive: true });
      await writeFile(join(officialDir, 'bad.json'), '{ invalid json }');

      const registry = await loadRegistry(join(tmpRoot, 'registry'), { localOnly: true });

      expect(console.warn).toHaveBeenCalled();
      expect(registry.skills.size).toBe(0);
    });

    it('should parse skill entries with all fields', async () => {
      const officialDir = join(tmpRoot, 'registry', 'official');
      await mkdir(officialDir, { recursive: true });
      await writeFile(join(officialDir, 'test.json'), JSON.stringify({
        skills: {
          '@test/full-skill': {
            name: 'full-skill',
            path: 'full-skill',
            source: 'github:test/repo/skill.md',
            aliases: ['fs', 'fullsk'],
            description: 'A full skill with all fields',
            tags: ['test', 'example'],
            dependencies: ['@test/base-skill'],
            versions: { '1.0.0': 'abc123', latest: 'abc123' },
            mcp_servers: [{
              name: 'test-server',
              package: '@test/server',
              command: 'npx',
              args: ['@test/server'],
              env: { API_KEY: 'test' }
            }]
          }
        }
      }));

      const registry = await loadRegistry(join(tmpRoot, 'registry'), { localOnly: true });

      const skill = registry.skills.get('@test/full-skill');
      expect(skill).toBeDefined();
      expect(skill?.name).toBe('full-skill');
      expect(skill?.aliases).toContain('fs');
      expect(skill?.tags).toContain('test');
      expect(skill?.dependencies).toContain('@test/base-skill');
      expect(skill?.mcp_servers).toHaveLength(1);
    });
  });
});
