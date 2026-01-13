import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mergeRegistries, loadRegistry, Registry, SkillEntry } from '../src/registry/loader.js';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Registry Loader', () => {
  it('should merge registries with correct priority', () => {
    const highPriority: Registry = {
      skills: new Map([
        ['skill-a', { name: 'Skill A', path: 'a', source: 'high', aliases: [] }]
      ])
    };
    const lowPriority: Registry = {
      skills: new Map([
        ['skill-a', { name: 'Skill A (Old)', path: 'a-old', source: 'low', aliases: [] }],
        ['skill-b', { name: 'Skill B', path: 'b', source: 'low', aliases: [] }]
      ])
    };

    // Official (High) overwrites Community/User (Low)
    const result = mergeRegistries(highPriority, lowPriority);

    expect(result.skills.get('skill-a')?.source).toBe('high');
    expect(result.skills.get('skill-b')?.source).toBe('low');
  });

  describe('loadRegistry (Integration)', () => {
    const tmpRoot = join(tmpdir(), 'dojo-test-' + Date.now());

    beforeEach(async () => {
      await mkdir(tmpRoot, { recursive: true });
      await mkdir(join(tmpRoot, 'official'), { recursive: true });
      await mkdir(join(tmpRoot, 'user'), { recursive: true });
    });

    afterEach(async () => {
      await rm(tmpRoot, { recursive: true, force: true });
    });

    it('should load and merge skills from files', async () => {
      // Official: Skill A
      const skillA: Partial<SkillEntry> = { name: 'Skill A', source: 'official', aliases: [] };
      await writeFile(
        join(tmpRoot, 'official', 'a.json'),
        JSON.stringify({ skills: { 'skill-a': skillA } })
      );

      // User: Skill A (Override attempt - should fail) & Skill B (New)
      const skillAUser: Partial<SkillEntry> = { name: 'Skill A User', source: 'user', aliases: [] };
      const skillB: Partial<SkillEntry> = { name: 'Skill B', source: 'user', aliases: [] };
      await writeFile(
        join(tmpRoot, 'user', 'b.json'),
        JSON.stringify({
          skills: {
            'skill-a': skillAUser,
            'skill-b': skillB
          }
        })
      );

      const registry = await loadRegistry(tmpRoot, { localOnly: true });

      expect(registry.skills.size).toBe(2);

      const resA = registry.skills.get('skill-a');
      expect(resA).toBeDefined();
      expect(resA?.source).toBe('official'); // High priority wins

      const resB = registry.skills.get('skill-b');
      expect(resB).toBeDefined();
      expect(resB?.source).toBe('user');
    });
  });
});
