import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detectAgents, hasAgents, cliExists } from '../src/agents/detector.js';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as child_process from 'node:child_process';

// Mock child_process.execSync to control CLI detection
vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof child_process>('node:child_process');
  return {
    ...actual,
    execSync: vi.fn()
  };
});

describe('Agent Detector', () => {
  const tmpRoot = join(tmpdir(), 'dojo-detector-test-' + Date.now());
  const mockExecSync = vi.mocked(child_process.execSync);

  beforeEach(async () => {
    await mkdir(tmpRoot, { recursive: true });
    mockExecSync.mockReset();
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it('should detect no agents when no CLI commands exist', () => {
    // Mock all CLI commands as not found
    mockExecSync.mockImplementation(() => {
      throw new Error('Command not found');
    });

    const agents = detectAgents(tmpRoot);
    expect(agents).toHaveLength(0);
    expect(hasAgents(tmpRoot)).toBe(false);
  });

  it('should detect agents when CLI exists (gemini)', () => {
    // Mock gemini CLI as found
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes('which gemini')) {
        return Buffer.from('/usr/bin/gemini');
      }
      throw new Error('Command not found');
    });

    const agents = detectAgents(tmpRoot);
    // gemini plugin + antigravity plugin both use gemini CLI
    expect(agents.length).toBeGreaterThanOrEqual(1);
    const agentNames = agents.map(a => a.name);
    expect(agentNames).toContain('gemini');
  });

  it('should detect Claude agent when claude CLI exists', () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes('which claude')) {
        return Buffer.from('/usr/bin/claude');
      }
      throw new Error('Command not found');
    });

    const agents = detectAgents(tmpRoot);
    expect(agents.length).toBeGreaterThanOrEqual(1);
    expect(agents[0].name).toBe('claude');
    expect(agents[0].path).toBe(join(tmpRoot, '.claude/skills'));
  });

  it('should fallback to directory detection for agents without CLI', async () => {
    // No CLIs found
    mockExecSync.mockImplementation(() => {
      throw new Error('Command not found');
    });

    // But directories exist
    await mkdir(join(tmpRoot, '.cursor/rules'), { recursive: true });

    const agents = detectAgents(tmpRoot);
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('cursor');
    expect(agents[0].format).toBe('folder-rule');
  });

  it('should detect multiple agents', () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes('which claude') || cmdStr.includes('which gemini')) {
        return Buffer.from('/usr/bin/mock');
      }
      throw new Error('Command not found');
    });

    const agents = detectAgents(tmpRoot);
    expect(agents.length).toBeGreaterThanOrEqual(2);
    const names = agents.map(a => a.name);
    expect(names).toContain('claude');
    expect(names).toContain('gemini');
  });
});

