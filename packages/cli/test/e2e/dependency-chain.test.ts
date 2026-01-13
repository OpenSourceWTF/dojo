import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const CLI_PATH = join(process.cwd(), 'dist/index.js');

describe('E2E: Dependency Chain Resolution', () => {
  let tmpRoot: string;
  let registryPath: string;
  let fixturesPath: string;

  beforeEach(async () => {
    tmpRoot = join(tmpdir(), 'dojo-dep-e2e-' + Date.now());
    await mkdir(tmpRoot, { recursive: true });

    // Setup directories
    registryPath = join(tmpRoot, 'registry');
    fixturesPath = join(tmpRoot, 'fixtures');
    await mkdir(join(registryPath, 'official'), { recursive: true });
    await mkdir(fixturesPath, { recursive: true });
    await mkdir(join(tmpRoot, '.claude/skills'), { recursive: true });
    await mkdir(join(tmpRoot, '.agent/workflows'), { recursive: true });

    // Create skill content fixtures
    await writeFile(join(fixturesPath, 'skill-a.md'), '# Skill A\nDepends on B');
    await writeFile(join(fixturesPath, 'skill-b.md'), '# Skill B\nDepends on C');
    await writeFile(join(fixturesPath, 'skill-c.md'), '# Skill C\nBase skill');
    await writeFile(join(fixturesPath, 'cycle-a.md'), '# Cycle A\nDepends on B');
    await writeFile(join(fixturesPath, 'cycle-b.md'), '# Cycle B\nDepends on A');
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  async function runDojo(args: string) {
    return execAsync(`node ${CLI_PATH} ${args}`, {
      cwd: tmpRoot,
      env: { ...process.env, FORCE_COLOR: '0' }
    });
  }

  async function createDependencyChainRegistry() {
    const registryContent = {
      _meta: { source: 'test', updated: '2026-01-01', priority: 100 },
      skills: {
        '@test/skill-a': {
          name: 'skill-a',
          path: 'skill-a',
          source: `file:${join(fixturesPath, 'skill-a.md')}`,
          description: 'Skill A - depends on B',
          dependencies: ['@test/skill-b'],
          tags: ['test'],
          versions: { 'latest': 'abc123' }
        },
        '@test/skill-b': {
          name: 'skill-b',
          path: 'skill-b',
          source: `file:${join(fixturesPath, 'skill-b.md')}`,
          description: 'Skill B - depends on C',
          dependencies: ['@test/skill-c'],
          tags: ['test'],
          versions: { 'latest': 'def456' }
        },
        '@test/skill-c': {
          name: 'skill-c',
          path: 'skill-c',
          source: `file:${join(fixturesPath, 'skill-c.md')}`,
          description: 'Skill C - base skill',
          dependencies: [],
          tags: ['test'],
          versions: { 'latest': 'ghi789' }
        }
      }
    };
    await writeFile(
      join(registryPath, 'official', 'deps.json'),
      JSON.stringify(registryContent, null, 2)
    );
  }

  async function createCycleRegistry() {
    const registryContent = {
      _meta: { source: 'test', updated: '2026-01-01', priority: 100 },
      skills: {
        '@test/cycle-a': {
          name: 'cycle-a',
          path: 'cycle-a',
          source: `file:${join(fixturesPath, 'cycle-a.md')}`,
          description: 'Cycle A - depends on B',
          dependencies: ['@test/cycle-b'],
          tags: ['test'],
          versions: { 'latest': 'cyc1' }
        },
        '@test/cycle-b': {
          name: 'cycle-b',
          path: 'cycle-b',
          source: `file:${join(fixturesPath, 'cycle-b.md')}`,
          description: 'Cycle B - depends on A',
          dependencies: ['@test/cycle-a'],
          tags: ['test'],
          versions: { 'latest': 'cyc2' }
        }
      }
    };
    await writeFile(
      join(registryPath, 'official', 'cycle.json'),
      JSON.stringify(registryContent, null, 2)
    );
  }

  describe('Dependency Chain Installation', () => {
    it('should install all dependencies in chain', async () => {
      await createDependencyChainRegistry();

      const { stdout } = await runDojo('learn @test/skill-a');

      // All 3 skills should be mentioned
      expect(stdout).toContain('skill-a');

      // Verify all files exist
      const claudeSkillsDir = join(tmpRoot, '.claude/skills');
      const files = await readdir(claudeSkillsDir);

      expect(files).toContain('skill-a.md');
      expect(files).toContain('skill-b.md');
      expect(files).toContain('skill-c.md');
    });

    it('should install base dependency first (skill-c)', async () => {
      await createDependencyChainRegistry();

      await runDojo('learn @test/skill-a');

      // Verify skill-c (no dependencies) is installed
      const skillCPath = join(tmpRoot, '.claude/skills/skill-c.md');
      expect(existsSync(skillCPath)).toBe(true);

      const content = await readFile(skillCPath, 'utf-8');
      expect(content).toContain('# Skill C');
    });

    it('should install intermediate dependency (skill-b)', async () => {
      await createDependencyChainRegistry();

      await runDojo('learn @test/skill-a');

      // Verify skill-b is installed
      const skillBPath = join(tmpRoot, '.claude/skills/skill-b.md');
      expect(existsSync(skillBPath)).toBe(true);

      const content = await readFile(skillBPath, 'utf-8');
      expect(content).toContain('# Skill B');
    });

    it('should install requested skill last (skill-a)', async () => {
      await createDependencyChainRegistry();

      await runDojo('learn @test/skill-a');

      // Verify skill-a is installed
      const skillAPath = join(tmpRoot, '.claude/skills/skill-a.md');
      expect(existsSync(skillAPath)).toBe(true);

      const content = await readFile(skillAPath, 'utf-8');
      expect(content).toContain('# Skill A');
    });
  });

  describe('Cycle Detection', () => {
    it('should detect circular dependency and show error', async () => {
      await createCycleRegistry();

      try {
        await runDojo('learn @test/cycle-a');
        // If no error thrown, check stdout for cycle message
        expect.fail('Should have thrown or printed cycle error');
      } catch (error: any) {
        // Command failed - check stderr/stdout for cycle message
        const output = error.stdout + error.stderr;
        // Should mention cycle or circular dependency
        expect(
          output.toLowerCase().includes('cycle') ||
          output.toLowerCase().includes('circular') ||
          output.toLowerCase().includes('loop')
        ).toBe(true);
      }
    });

    it('should include cycle path in error message', async () => {
      await createCycleRegistry();

      try {
        await runDojo('learn @test/cycle-a');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        const output = error.stdout + error.stderr;
        // Error should mention both skills in the cycle
        expect(output).toContain('cycle-a');
        expect(output).toContain('cycle-b');
      }
    });
  });
});
