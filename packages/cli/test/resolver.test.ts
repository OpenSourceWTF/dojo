import { describe, it, expect } from 'vitest';
import { resolveSkill, detectCycle } from '../src/resolver/dependencies.js';
import type { Registry } from '../src/registry/loader.js';

function createRegistry(skills: Record<string, { dependencies?: string[] }>): Registry {
  const map = new Map();
  for (const [fqn, data] of Object.entries(skills)) {
    map.set(fqn, {
      name: fqn.split('/').pop() || fqn,
      path: `skills/${fqn}`,
      source: `github:test/${fqn}`,
      aliases: [],
      dependencies: data.dependencies,
    });
  }
  return { skills: map };
}

describe('resolveSkill', () => {
  it('should resolve single skill with no dependencies', () => {
    const registry = createRegistry({
      '@org/skill-a': {},
    });

    const result = resolveSkill('@org/skill-a', registry);

    expect(result).toHaveLength(1);
    expect(result[0].fqn).toBe('@org/skill-a');
    expect(result[0].order).toBe(0);
  });

  it('should resolve skill with one dependency', () => {
    const registry = createRegistry({
      '@org/skill-a': { dependencies: ['@org/skill-b'] },
      '@org/skill-b': {},
    });

    const result = resolveSkill('@org/skill-a', registry);

    expect(result).toHaveLength(2);
    // Dependencies should come first (lower order)
    expect(result[0].fqn).toBe('@org/skill-b');
    expect(result[0].order).toBe(0);
    expect(result[1].fqn).toBe('@org/skill-a');
    expect(result[1].order).toBe(1);
  });

  it('should resolve transitive dependencies', () => {
    const registry = createRegistry({
      '@org/skill-a': { dependencies: ['@org/skill-b'] },
      '@org/skill-b': { dependencies: ['@org/skill-c'] },
      '@org/skill-c': {},
    });

    const result = resolveSkill('@org/skill-a', registry);

    expect(result).toHaveLength(3);
    expect(result[0].fqn).toBe('@org/skill-c');
    expect(result[1].fqn).toBe('@org/skill-b');
    expect(result[2].fqn).toBe('@org/skill-a');
  });

  it('should handle diamond dependencies', () => {
    const registry = createRegistry({
      '@org/skill-a': { dependencies: ['@org/skill-b', '@org/skill-c'] },
      '@org/skill-b': { dependencies: ['@org/skill-d'] },
      '@org/skill-c': { dependencies: ['@org/skill-d'] },
      '@org/skill-d': {},
    });

    const result = resolveSkill('@org/skill-a', registry);

    // Should deduplicate skill-d
    expect(result).toHaveLength(4);
    const fqns = result.map((r) => r.fqn);
    expect(fqns.filter((f) => f === '@org/skill-d')).toHaveLength(1);
    // skill-d should come before b and c
    expect(fqns.indexOf('@org/skill-d')).toBeLessThan(fqns.indexOf('@org/skill-b'));
    expect(fqns.indexOf('@org/skill-d')).toBeLessThan(fqns.indexOf('@org/skill-c'));
  });

  it('should throw on missing dependency', () => {
    const registry = createRegistry({
      '@org/skill-a': { dependencies: ['@org/missing'] },
    });

    expect(() => resolveSkill('@org/skill-a', registry)).toThrow('not found');
  });
});

describe('detectCycle', () => {
  it('should return null for no cycle', () => {
    const registry = createRegistry({
      '@org/skill-a': { dependencies: ['@org/skill-b'] },
      '@org/skill-b': {},
    });

    const result = detectCycle('@org/skill-a', registry);
    expect(result).toBeNull();
  });

  it('should detect direct cycle', () => {
    const registry = createRegistry({
      '@org/skill-a': { dependencies: ['@org/skill-b'] },
      '@org/skill-b': { dependencies: ['@org/skill-a'] },
    });

    const result = detectCycle('@org/skill-a', registry);
    expect(result).not.toBeNull();
    expect(result).toContain('@org/skill-a');
    expect(result).toContain('@org/skill-b');
  });

  it('should detect indirect cycle', () => {
    const registry = createRegistry({
      '@org/skill-a': { dependencies: ['@org/skill-b'] },
      '@org/skill-b': { dependencies: ['@org/skill-c'] },
      '@org/skill-c': { dependencies: ['@org/skill-a'] },
    });

    const result = detectCycle('@org/skill-a', registry);
    expect(result).not.toBeNull();
    expect(result).toContain('@org/skill-a');
  });

  it('should detect self-reference', () => {
    const registry = createRegistry({
      '@org/skill-a': { dependencies: ['@org/skill-a'] },
    });

    const result = detectCycle('@org/skill-a', registry);
    expect(result).not.toBeNull();
  });
});
