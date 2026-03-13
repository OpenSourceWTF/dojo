/**
 * Tests for blacklist CLI command
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import {
  blacklistList,
  blacklistCheck,
  blacklistAdd,
  blacklistRemove,
} from '../src/commands/blacklist.js';

const CACHE_DIR = join(homedir(), '.dojo', 'cache');
const LOCAL_BLACKLIST = join(homedir(), '.dojo', 'blacklist.json');

describe('Blacklist CLI', () => {
  let tmpRoot: string;
  let consoleLogs: string[];
  let hadLocalBlacklist: boolean;
  let originalLocalBlacklist: string | null;

  beforeEach(async () => {
    tmpRoot = join(tmpdir(), 'dojo-blacklist-cli-test-' + Date.now());
    await mkdir(tmpRoot, { recursive: true });

    consoleLogs = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      consoleLogs.push(args.map(String).join(' '));
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Back up and clear the blacklist cache so fetch mocks are used
    try {
      await unlink(join(CACHE_DIR, 'blacklist.json'));
    } catch { /* doesn't exist */ }

    // Back up local blacklist
    hadLocalBlacklist = existsSync(LOCAL_BLACKLIST);
    if (hadLocalBlacklist) {
      originalLocalBlacklist = await readFile(LOCAL_BLACKLIST, 'utf-8').catch(() => null);
    } else {
      originalLocalBlacklist = null;
    }
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });

    // Restore local blacklist
    if (hadLocalBlacklist && originalLocalBlacklist) {
      await writeFile(LOCAL_BLACKLIST, originalLocalBlacklist);
    } else if (!hadLocalBlacklist && existsSync(LOCAL_BLACKLIST)) {
      await unlink(LOCAL_BLACKLIST);
    }

    vi.restoreAllMocks();
  });

  describe('blacklistList', () => {
    it('should show empty message when no blacklisted skills', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          version: '1.0.0',
          updated: '2026-03-13',
          entries: {}
        }))
      });

      // Clear local blacklist for this test
      try { await unlink(LOCAL_BLACKLIST); } catch { /* ok */ }

      await blacklistList();
      const output = consoleLogs.join('\n');
      expect(output).toContain('No blacklisted skills');
    });

    it('should display registry blacklist entries', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          version: '1.0.0',
          updated: '2026-03-13',
          entries: {
            'agent-browser': {
              reason: 'Prompt injection attack',
              reported: '2026-03-13',
              severity: 'critical',
              cve: null
            }
          }
        }))
      });

      await blacklistList();
      const output = consoleLogs.join('\n');
      expect(output).toContain('Registry blacklist');
      expect(output).toContain('agent-browser');
      expect(output).toContain('Prompt injection attack');
    });
  });

  describe('blacklistCheck', () => {
    it('should show not blacklisted for clean skill', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          version: '1.0.0',
          updated: '2026-03-13',
          entries: {}
        }))
      });

      // Clear local blacklist for this test
      try { await unlink(LOCAL_BLACKLIST); } catch { /* ok */ }

      await blacklistCheck('clean-skill');
      const output = consoleLogs.join('\n');
      expect(output).toContain('not blacklisted');
    });

    it('should show blacklisted for malicious skill', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          version: '1.0.0',
          updated: '2026-03-13',
          entries: {
            'agent-browser': {
              reason: 'Prompt injection attack',
              reported: '2026-03-13',
              severity: 'critical',
              cve: null
            }
          }
        }))
      });

      await blacklistCheck('agent-browser');
      const output = consoleLogs.join('\n');
      expect(output).toContain('blacklisted');
      expect(output).toContain('Prompt injection attack');
    });
  });

  describe('blacklistAdd', () => {
    it('should add a skill to local blacklist', async () => {
      // Remove any prior entry for this test skill
      try { await unlink(LOCAL_BLACKLIST); } catch { /* ok */ }

      await blacklistAdd('test-cli-blocklist-skill-' + Date.now(), { reason: 'Test reason' });
      const output = consoleLogs.join('\n');
      expect(output).toContain('Added');
      expect(output).toContain('local blacklist');
    });

    it('should report duplicate when adding twice', async () => {
      const skillName = 'dupe-test-' + Date.now();
      try { await unlink(LOCAL_BLACKLIST); } catch { /* ok */ }

      await blacklistAdd(skillName, { reason: 'First add' });
      consoleLogs = [];

      await blacklistAdd(skillName, { reason: 'Second add' });
      const output = consoleLogs.join('\n');
      expect(output).toContain('already in the local blacklist');
    });
  });

  describe('blacklistRemove', () => {
    it('should report when skill is not in local blacklist', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network error'));
      try { await unlink(LOCAL_BLACKLIST); } catch { /* ok */ }

      await blacklistRemove('nonexistent-skill');
      const output = consoleLogs.join('\n');
      expect(output).toContain('not in the local blacklist');
    });

    it('should remove a previously added skill', async () => {
      const skillName = 'removable-test-' + Date.now();
      try { await unlink(LOCAL_BLACKLIST); } catch { /* ok */ }

      await blacklistAdd(skillName, { reason: 'Will be removed' });
      consoleLogs = [];

      await blacklistRemove(skillName);
      const output = consoleLogs.join('\n');
      expect(output).toContain('Removed');
      expect(output).toContain(skillName);
    });
  });
});
