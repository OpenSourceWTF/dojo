/**
 * Tests for resolver functions
 */
import { describe, it, expect } from 'vitest';
import { resolveSkill, detectCycle } from '../src/resolver/index.js';
import { Registry } from '../src/registry/loader.js';

describe('Resolver', () => {
  describe('resolveSkill', () => {
    it('should resolve skill without dependencies', () => {
      const registry: Registry = {
        skills: new Map([
          ['@test/simple', {
            name: 'simple',
            path: 'simple',
            source: 'test',
            aliases: []
          }]
        ])
      };

      const result = resolveSkill('@test/simple', registry);

      expect(result).toHaveLength(1);
      expect(result[0].fqn).toBe('@test/simple');
    });

    it('should resolve skill with dependencies in order', () => {
      const registry: Registry = {
        skills: new Map([
          ['@test/main', {
            name: 'main',
            path: 'main',
            source: 'test',
            aliases: [],
            dependencies: ['@test/dep']
          }],
          ['@test/dep', {
            name: 'dep',
            path: 'dep',
            source: 'test',
            aliases: []
          }]
        ])
      };

      const result = resolveSkill('@test/main', registry);

      expect(result).toHaveLength(2);
      // Dependency should come before main
      expect(result[0].fqn).toBe('@test/dep');
      expect(result[1].fqn).toBe('@test/main');
    });

    it('should handle nested dependencies', () => {
      const registry: Registry = {
        skills: new Map([
          ['@test/a', {
            name: 'a',
            path: 'a',
            source: 'test',
            aliases: [],
            dependencies: ['@test/b']
          }],
          ['@test/b', {
            name: 'b',
            path: 'b',
            source: 'test',
            aliases: [],
            dependencies: ['@test/c']
          }],
          ['@test/c', {
            name: 'c',
            path: 'c',
            source: 'test',
            aliases: []
          }]
        ])
      };

      const result = resolveSkill('@test/a', registry);

      expect(result).toHaveLength(3);
      expect(result[0].fqn).toBe('@test/c');
      expect(result[1].fqn).toBe('@test/b');
      expect(result[2].fqn).toBe('@test/a');
    });

    it('should throw for missing skill', () => {
      const registry: Registry = {
        skills: new Map()
      };

      expect(() => resolveSkill('@test/missing', registry)).toThrow('not found');
    });
  });

  describe('detectCycle', () => {
    it('should return null for no cycle', () => {
      const registry: Registry = {
        skills: new Map([
          ['@test/a', {
            name: 'a',
            path: 'a',
            source: 'test',
            aliases: [],
            dependencies: ['@test/b']
          }],
          ['@test/b', {
            name: 'b',
            path: 'b',
            source: 'test',
            aliases: []
          }]
        ])
      };

      const result = detectCycle('@test/a', registry);
      expect(result).toBeNull();
    });

    it('should detect direct cycle', () => {
      const registry: Registry = {
        skills: new Map([
          ['@test/a', {
            name: 'a',
            path: 'a',
            source: 'test',
            aliases: [],
            dependencies: ['@test/b']
          }],
          ['@test/b', {
            name: 'b',
            path: 'b',
            source: 'test',
            aliases: [],
            dependencies: ['@test/a']
          }]
        ])
      };

      const result = detectCycle('@test/a', registry);
      expect(result).not.toBeNull();
      expect(result).toContain('@test/a');
      expect(result).toContain('@test/b');
    });

    it('should detect indirect cycle', () => {
      const registry: Registry = {
        skills: new Map([
          ['@test/a', {
            name: 'a',
            path: 'a',
            source: 'test',
            aliases: [],
            dependencies: ['@test/b']
          }],
          ['@test/b', {
            name: 'b',
            path: 'b',
            source: 'test',
            aliases: [],
            dependencies: ['@test/c']
          }],
          ['@test/c', {
            name: 'c',
            path: 'c',
            source: 'test',
            aliases: [],
            dependencies: ['@test/a']
          }]
        ])
      };

      const result = detectCycle('@test/a', registry);
      expect(result).not.toBeNull();
    });

    it('should return null for missing dependency', () => {
      const registry: Registry = {
        skills: new Map([
          ['@test/a', {
            name: 'a',
            path: 'a',
            source: 'test',
            aliases: [],
            dependencies: ['@test/missing']
          }]
        ])
      };

      const result = detectCycle('@test/a', registry);
      expect(result).toBeNull();
    });
  });
});
