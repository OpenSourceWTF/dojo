/**
 * Tests for registry loader functions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadRegistry, mergeRegistries } from '../src/registry/loader.js';

describe('Registry Loader', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = join(tmpdir(), 'dojo-loader-test-' + Date.now());
    await mkdir(tmpRoot, { recursive: true });
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('loadRegistry with localOnly', () => {
    it('should load from local path only', async () => {
      const regDir = join(tmpRoot, 'registry', 'official');
      await mkdir(regDir, { recursive: true });
      await writeFile(join(regDir, 'skills.json'), JSON.stringify({
        skills: {
          '@test/local': { name: 'local', source: 'file:test', aliases: [] }
        }
      }));

      const registry = await loadRegistry(join(tmpRoot, 'registry'), { localOnly: true });

      expect(registry.skills.has('@test/local')).toBe(true);
    });

    it('should load from multiple category directories', async () => {
      const officialDir = join(tmpRoot, 'registry', 'official');
      const communityDir = join(tmpRoot, 'registry', 'community');
      await mkdir(officialDir, { recursive: true });
      await mkdir(communityDir, { recursive: true });

      await writeFile(join(officialDir, 'skills.json'), JSON.stringify({
        skills: { '@official/s1': { name: 's1', source: 'test', aliases: [] } }
      }));
      await writeFile(join(communityDir, 'skills.json'), JSON.stringify({
        skills: { '@community/s2': { name: 's2', source: 'test', aliases: [] } }
      }));

      const registry = await loadRegistry(join(tmpRoot, 'registry'), { localOnly: true });

      expect(registry.skills.size).toBe(2);
    });

    it('should handle empty registry directories', async () => {
      const regDir = join(tmpRoot, 'registry', 'official');
      await mkdir(regDir, { recursive: true });
      // No files

      const registry = await loadRegistry(join(tmpRoot, 'registry'), { localOnly: true });

      expect(registry.skills.size).toBe(0);
    });

    it('should skip non-json files', async () => {
      const regDir = join(tmpRoot, 'registry', 'official');
      await mkdir(regDir, { recursive: true });
      await writeFile(join(regDir, 'readme.txt'), 'not json');
      await writeFile(join(regDir, 'skills.json'), JSON.stringify({
        skills: { '@test/skill': { name: 'skill', source: 'test', aliases: [] } }
      }));

      const registry = await loadRegistry(join(tmpRoot, 'registry'), { localOnly: true });

      expect(registry.skills.size).toBe(1);
    });
  });

  describe('mergeRegistries', () => {
    it('should merge two registries', () => {
      const reg1 = {
        skills: new Map([
          ['@a/skill', { name: 'a', source: 'a', aliases: [] as string[], path: 'a' }]
        ])
      };
      const reg2 = {
        skills: new Map([
          ['@b/skill', { name: 'b', source: 'b', aliases: [] as string[], path: 'b' }]
        ])
      };

      const merged = mergeRegistries(reg1, reg2);

      expect(merged.skills.size).toBe(2);
      expect(merged.skills.has('@a/skill')).toBe(true);
      expect(merged.skills.has('@b/skill')).toBe(true);
    });

    it('should give priority to first registry on conflicts', () => {
      const reg1 = {
        skills: new Map([
          ['@conflict/skill', { name: 'winner', source: 'a', aliases: [] as string[], path: 'a' }]
        ])
      };
      const reg2 = {
        skills: new Map([
          ['@conflict/skill', { name: 'loser', source: 'b', aliases: [] as string[], path: 'b' }]
        ])
      };

      const merged = mergeRegistries(reg1, reg2);

      expect(merged.skills.get('@conflict/skill')?.name).toBe('winner');
    });

    it('should handle empty registries', () => {
      const empty = { skills: new Map() };
      const filled = {
        skills: new Map([
          ['@test/skill', { name: 'test', source: 'test', aliases: [] as string[], path: 'test' }]
        ])
      };

      const merged = mergeRegistries(empty, filled);

      expect(merged.skills.size).toBe(1);
    });

    it('should merge multiple registries', () => {
      const reg1 = { skills: new Map([['@1/s', { name: '1', source: '1', aliases: [] as string[], path: '1' }]]) };
      const reg2 = { skills: new Map([['@2/s', { name: '2', source: '2', aliases: [] as string[], path: '2' }]]) };
      const reg3 = { skills: new Map([['@3/s', { name: '3', source: '3', aliases: [] as string[], path: '3' }]]) };

      const merged = mergeRegistries(reg1, reg2, reg3);

      expect(merged.skills.size).toBe(3);
    });
  });
});
