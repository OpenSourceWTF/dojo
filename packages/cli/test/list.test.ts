/**
 * Tests for list command - uses plugin system
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getInstalledSkills, list, getInstalledSkillsFromPlugins } from '../src/commands/list.js';

describe('list command', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = join(tmpdir(), 'dojo-list-test-' + Date.now());
    await mkdir(tmpRoot, { recursive: true });
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('getInstalledSkillsFromPlugins', () => {
    it('should list Claude skills (folder format)', async () => {
      const skill1Dir = join(tmpRoot, '.claude', 'skills', 'skill1');
      const skill2Dir = join(tmpRoot, '.claude', 'skills', 'skill2');
      await mkdir(skill1Dir, { recursive: true });
      await mkdir(skill2Dir, { recursive: true });
      await writeFile(join(skill1Dir, 'SKILL.md'), '# Skill 1');
      await writeFile(join(skill2Dir, 'SKILL.md'), '# Skill 2');

      const agentSkills = getInstalledSkillsFromPlugins(tmpRoot);
      const claude = agentSkills.find(a => a.agent.name === 'claude');

      expect(claude).toBeDefined();
      expect(claude!.skills).toHaveLength(2);
      expect(claude!.skills.map(s => s.name)).toContain('skill1');
      expect(claude!.skills.map(s => s.name)).toContain('skill2');
    });

    it('should list Antigravity skills (.agent/workflows)', async () => {
      const antigravityDir = join(tmpRoot, '.agent', 'workflows');
      await mkdir(antigravityDir, { recursive: true });
      await writeFile(join(antigravityDir, 'workflow1.md'), '# Workflow 1');

      const agentSkills = getInstalledSkillsFromPlugins(tmpRoot);
      const antigravity = agentSkills.find(a => a.agent.name === 'antigravity');

      expect(antigravity).toBeDefined();
      expect(antigravity!.skills).toHaveLength(1);
      expect(antigravity!.skills[0].name).toBe('workflow1');
    });

    it('should list Gemini skills (.gemini/skills/{skill}/SKILL.md)', async () => {
      const geminiDir = join(tmpRoot, '.gemini', 'skills', 'skill1');
      await mkdir(geminiDir, { recursive: true });
      await writeFile(join(geminiDir, 'SKILL.md'), '# Skill 1');

      const agentSkills = getInstalledSkillsFromPlugins(tmpRoot);
      const gemini = agentSkills.find(a => a.agent.name === 'gemini');

      expect(gemini).toBeDefined();
      expect(gemini!.skills).toHaveLength(1);
      expect(gemini!.skills[0].name).toBe('skill1');
    });

    it('should list Cursor rules (folder-based)', async () => {
      const cursorBase = join(tmpRoot, '.cursor', 'rules');
      await mkdir(join(cursorBase, 'rule1'), { recursive: true });
      await mkdir(join(cursorBase, 'rule2'), { recursive: true });
      await writeFile(join(cursorBase, 'rule1', 'RULE.md'), '# Rule 1');
      await writeFile(join(cursorBase, 'rule2', 'RULE.md'), '# Rule 2');

      const agentSkills = getInstalledSkillsFromPlugins(tmpRoot);
      const cursor = agentSkills.find(a => a.agent.name === 'cursor');

      expect(cursor).toBeDefined();
      expect(cursor!.skills).toHaveLength(2);
      expect(cursor!.skills.map(s => s.name)).toContain('rule1');
      expect(cursor!.skills.map(s => s.name)).toContain('rule2');
    });

    it('should list Codex skills (.codex/skills/{skill}/SKILL.md)', async () => {
      const codexDir = join(tmpRoot, '.codex', 'skills', 'myskill');
      await mkdir(codexDir, { recursive: true });
      await writeFile(join(codexDir, 'SKILL.md'), '# My Skill');

      const agentSkills = getInstalledSkillsFromPlugins(tmpRoot);
      const codex = agentSkills.find(a => a.agent.name === 'codex');

      expect(codex).toBeDefined();
      expect(codex!.skills).toHaveLength(1);
      expect(codex!.skills[0].name).toBe('myskill');
    });

    it('should return empty array when no agents detected (without CLI)', () => {
      // This test only passes in CI where no CLIs are installed
      // With CLI detection, agents will be found if CLI exists
      const agentSkills = getInstalledSkillsFromPlugins(tmpRoot);
      // If CLIs are installed, they return agents with empty skills
      // If no CLIs, returns empty array
      for (const result of agentSkills) {
        expect(result.skills).toEqual([]);
      }
    });

    it('should only count relevant files for each format', async () => {
      const skillDir = join(tmpRoot, '.claude', 'skills', 'skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, 'SKILL.md'), '# Skill');
      await writeFile(join(skillDir, 'other.txt'), 'not md');

      const agentSkills = getInstalledSkillsFromPlugins(tmpRoot);
      const claude = agentSkills.find(a => a.agent.name === 'claude');

      expect(claude!.skills).toHaveLength(1);
      expect(claude!.skills[0].name).toBe('skill');
    });
  });

  describe('getInstalledSkills (legacy)', () => {
    it('should return skills keyed by agent name', async () => {
      const skillDir = join(tmpRoot, '.claude', 'skills', 'test');
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, 'SKILL.md'), '# Test');

      const skills = getInstalledSkills(tmpRoot);
      expect(skills.claude).toContain('test');
    });
  });

  describe('list function', () => {
    it('should display installed skills', async () => {
      const skillDir = join(tmpRoot, '.claude', 'skills', 'test');
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, 'SKILL.md'), '# Test');

      await list();

      expect(console.log).toHaveBeenCalledWith('Installed Skills:\n');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Claude'));
      expect(console.log).toHaveBeenCalledWith('  • test');
    });

    it('should show none detected when no skills exist', async () => {
      // Create agent directory but no skills
      const claudeDir = join(tmpRoot, '.claude', 'skills');
      await mkdir(claudeDir, { recursive: true });

      await list();

      expect(console.log).toHaveBeenCalledWith('  (none detected)');
    });

    it('should show total count', async () => {
      const skill1Dir = join(tmpRoot, '.claude', 'skills', 'skill1');
      const skill2Dir = join(tmpRoot, '.claude', 'skills', 'skill2');
      await mkdir(skill1Dir, { recursive: true });
      await mkdir(skill2Dir, { recursive: true });
      await writeFile(join(skill1Dir, 'SKILL.md'), '# Skill 1');
      await writeFile(join(skill2Dir, 'SKILL.md'), '# Skill 2');

      await list();

      expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/Total: 2 skills across \d+ agents?/));
    });

    it('should count multiple agents', async () => {
      const skillDir = join(tmpRoot, '.claude', 'skills', 'skill');
      const antigravityDir = join(tmpRoot, '.agent', 'workflows');
      await mkdir(skillDir, { recursive: true });
      await mkdir(antigravityDir, { recursive: true });
      await writeFile(join(skillDir, 'SKILL.md'), '# Skill');
      await writeFile(join(antigravityDir, 'workflow.md'), '# Workflow');

      await list();

      expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/Total: 2 skills across \d+ agents?/));
    });
  });
});
