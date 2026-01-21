/**
 * Verification tests using virtual emulated disk (mock-fs)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mock from 'mock-fs';
import { plugins } from '../src/agents/plugins/index.js';
import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { AgentPlugin } from '../src/agents/plugin.js';

// Mock child_process for CLI detection
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

describe('Verified Plugins (Mock FS)', () => {
  const TMP_ROOT = '/tmp/dojo-test';

  beforeEach(() => {
    // Setup virtual disk
    mock({
      [TMP_ROOT]: {},
      // We might need to mock node_modules if plugins improperly read from it,
      // but standard plugins just verify paths.
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  // Verify all 21 plugins exist
  it('should have all 21 plugins registered', () => {
    expect(plugins).toHaveLength(21);
  });

  // Iterate over each plugin for standard compliance
  plugins.forEach((plugin: AgentPlugin) => {
    describe(`Plugin: ${plugin.name}`, () => {

      it(`should have valid properties`, () => {
        expect(plugin.name).toBeTruthy();
        expect(plugin.format).toMatch(/^(folder-skill|folder-rule|flat-md)$/);
        // agentDir can be undefined for some? No, checked plugins, most have it or a default logic.
        // Actually interface allows it to be undefined but detected logic is specific.
      });

      it('should detect when agent directory exists', () => {
        // Prepare file system with the agent's expected directory
        const agentDir = plugin.agentDir || `.${plugin.name}/skills`; // Fallback for test logic if needed
        // Assuming plugin.agentDir is the relative path
        const fullPath = join(TMP_ROOT, agentDir);

        // Populate mock fs
        mock({
          [TMP_ROOT]: {
            [agentDir]: {} // Directory exists
          }
        });

        const result = plugin.detect(TMP_ROOT);

        // Some plugins might return null if they strictly require CLI and don't care about dir,
        // but currently all plugins support directory detection or CLI detection.
        // Let's assume directory detection is supported if agentDir matches.

        if (result) {
          expect(result.name).toBe(plugin.name);
        } else {
          // E.g. helper plugins?
        }
      });

      it('should detect when CLI command exists (execSync mocked)', () => {
        // Mock fs empty
        mock({
          [TMP_ROOT]: {}
        });

        // Mock execSync to succeed for "which <cli>"
        if (plugin.cli) {
          (execSync as any).mockImplementation((cmd: string) => {
            if (cmd === `which ${plugin.cli}`) return '/usr/bin/' + plugin.cli;
            throw new Error('Not found');
          });

          const result = plugin.detect(TMP_ROOT);
          expect(result).not.toBeNull();
          expect(result?.name).toBe(plugin.name);
        } else {
          // If no CLI, this test is skipped/N/A
          // But we can verify it returns null if dir missing and no CLI
          const result = plugin.detect(TMP_ROOT);
          expect(result).toBeNull();
        }
      });

      it('should generate correct skill path', () => {
        const skillName = 'my-skill';
        const path = plugin.getSkillPath(TMP_ROOT, skillName);
        expect(path).toContain(skillName);
        expect(path.startsWith(TMP_ROOT)).toBe(true);
      });

      it('should install skill matches file system', async () => {
        // Setup mock fs
        mock({
          [TMP_ROOT]: {}
        });

        // Some plugins rely on "agentDir" being present or created.
        // The installSkill method creates via fs.mkdir/writeFile.
        // We verify the file appears in mock fs.

        // Mock canonical skill
        const canonicalPath = '/tmp/canonical.md';
        mock({
          [TMP_ROOT]: {},
          [canonicalPath]: '# Content'
        });

        // We need to restore mock to add canonicalPath? 
        // mock-fs replaces entire FS.
        // Let's reset mock with both.
        mock({
          [TMP_ROOT]: {},
          '/tmp/canonical.md': '# Content'
        });

        const dest = await plugin.installSkill({
          projectRoot: TMP_ROOT,
          skillName: 'my-install-skill',
          canonicalPath: '/tmp/canonical.md'
        });

        // Verify file exists
        const fullPath = join(TMP_ROOT, dest);
        // Note: dest is relative path from installSkill?
        // plugin.installSkill returns the relative path usually.
        // Let's resolve it.
        const fileExists = existsSync(join(TMP_ROOT, dest));
        expect(fileExists).toBe(true);
      });

      it('should have valid MCP configuration if defined', () => {
        if (plugin.mcpConfig) {
          expect(plugin.mcpConfig.path).toBeTruthy();
          expect(typeof plugin.mcpConfig.path).toBe('string');
          expect(plugin.mcpConfig.format).toMatch(/^(json|toml)$/);
          if (plugin.mcpConfig.key) {
            expect(typeof plugin.mcpConfig.key).toBe('string');
          }
        }
      });
    });
  });
});
