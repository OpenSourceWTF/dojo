import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectAgents, hasAgents } from '../src/agents/detector.js';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Agent Detector', () => {
  const tmpRoot = join(tmpdir(), 'dojo-detector-test-' + Date.now());

  beforeEach(async () => {
    await mkdir(tmpRoot, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it('should detect no agents in empty project', () => {
    const agents = detectAgents(tmpRoot);
    expect(agents).toHaveLength(0);
    expect(hasAgents(tmpRoot)).toBe(false);
  });

  it('should detect Claude agent', async () => {
    await mkdir(join(tmpRoot, '.claude/skills'), { recursive: true });

    const agents = detectAgents(tmpRoot);
    expect(agents).toHaveLength(1);
    expect(agents[0]).toMatchObject({
      name: 'claude',
      path: join(tmpRoot, '.claude/skills'),
      format: 'folder-skill'
    });
    expect(hasAgents(tmpRoot)).toBe(true);
  });

  it('should detect Antigravity agent', async () => {
    await mkdir(join(tmpRoot, '.agent/workflows'), { recursive: true });

    const agents = detectAgents(tmpRoot);
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('antigravity');
    expect(agents[0].path).toBe(join(tmpRoot, '.agent/workflows'));
  });

  it('should detect Cursor agent', async () => {
    await mkdir(join(tmpRoot, '.cursor/rules'), { recursive: true });

    const agents = detectAgents(tmpRoot);
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('cursor');
    expect(agents[0].format).toBe('folder-rule');
  });

  it('should detect multiple agents', async () => {
    await mkdir(join(tmpRoot, '.claude/skills'), { recursive: true });
    await mkdir(join(tmpRoot, '.cursor/rules'), { recursive: true });

    const agents = detectAgents(tmpRoot);
    expect(agents).toHaveLength(2);
    expect(agents.map(a => a.name).sort()).toEqual(['claude', 'cursor']);
  });
});
