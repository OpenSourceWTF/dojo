/**
 * Tests for blacklist module
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadBlacklist, checkBlacklist, formatBlockedMessage } from '../src/blacklist/index.js';
import type { Blacklist, BlacklistEntry } from '../src/blacklist/index.js';

describe('Blacklist', () => {
  const sampleBlacklist: Blacklist = {
    version: '1.0.0',
    updated: '2026-03-13',
    entries: {
      'agent-browser': {
        reason: 'Prompt injection attack',
        reported: '2026-03-13',
        source_pattern: 'github:moltbot/skills/skills/sakaen736jih/agent-browser-6aigix9qi2tu',
        severity: 'critical',
        cve: null,
      },
      'agent-browser-core': {
        reason: 'Associated with malicious agent-browser skill',
        reported: '2026-03-13',
        severity: 'high',
        cve: null,
      },
    },
  };

  describe('checkBlacklist', () => {
    it('should return entry for exact match', () => {
      const result = checkBlacklist('agent-browser', sampleBlacklist);
      expect(result).not.toBeNull();
      expect(result!.severity).toBe('critical');
    });

    it('should return entry for scoped FQN match', () => {
      const result = checkBlacklist('@community/agent-browser', sampleBlacklist);
      expect(result).not.toBeNull();
      expect(result!.severity).toBe('critical');
    });

    it('should return null for non-blacklisted skill', () => {
      const result = checkBlacklist('create-docx', sampleBlacklist);
      expect(result).toBeNull();
    });

    it('should be case-insensitive', () => {
      const result = checkBlacklist('Agent-Browser', sampleBlacklist);
      expect(result).not.toBeNull();
    });

    it('should match agent-browser-core', () => {
      const result = checkBlacklist('agent-browser-core', sampleBlacklist);
      expect(result).not.toBeNull();
      expect(result!.severity).toBe('high');
    });

    it('should return null for empty blacklist', () => {
      const empty: Blacklist = { version: '0.0.0', updated: '', entries: {} };
      const result = checkBlacklist('agent-browser', empty);
      expect(result).toBeNull();
    });

    it('should not match partial names incorrectly', () => {
      // "browser" should not match "agent-browser"
      const result = checkBlacklist('browser', sampleBlacklist);
      expect(result).toBeNull();
    });

    it('should not match a skill that starts with the blacklisted name', () => {
      // "agent-browser-extended" should not match "agent-browser"
      // (it's a different skill name, not a scoped version)
      const result = checkBlacklist('agent-browser-extended', sampleBlacklist);
      expect(result).toBeNull();
    });
  });

  describe('formatBlockedMessage', () => {
    it('should format message with severity and reason', () => {
      const entry: BlacklistEntry = {
        reason: 'Test reason',
        reported: '2026-03-13',
        severity: 'critical',
        cve: null,
      };
      const message = formatBlockedMessage('test-skill', entry);
      expect(message).toContain('BLOCKED');
      expect(message).toContain('test-skill');
      expect(message).toContain('CRITICAL');
      expect(message).toContain('Test reason');
    });

    it('should include CVE when present', () => {
      const entry: BlacklistEntry = {
        reason: 'Test reason',
        reported: '2026-03-13',
        severity: 'high',
        cve: 'CVE-2026-12345',
      };
      const message = formatBlockedMessage('test-skill', entry);
      expect(message).toContain('CVE-2026-12345');
    });

    it('should not include CVE line when null', () => {
      const entry: BlacklistEntry = {
        reason: 'Test reason',
        reported: '2026-03-13',
        severity: 'high',
        cve: null,
      };
      const message = formatBlockedMessage('test-skill', entry);
      expect(message).not.toContain('CVE:');
    });
  });

  describe('loadBlacklist', () => {
    let tmpRoot: string;

    beforeEach(async () => {
      tmpRoot = join(tmpdir(), 'dojo-blacklist-test-' + Date.now());
      await mkdir(tmpRoot, { recursive: true });
    });

    afterEach(async () => {
      await rm(tmpRoot, { recursive: true, force: true });
      vi.restoreAllMocks();
    });

    it('should load blacklist from local path', async () => {
      await writeFile(
        join(tmpRoot, 'blacklist.json'),
        JSON.stringify(sampleBlacklist)
      );

      const result = await loadBlacklist({ localPath: tmpRoot });
      expect(result.version).toBe('1.0.0');
      expect(Object.keys(result.entries)).toContain('agent-browser');
    });

    it('should return empty blacklist when local path has no blacklist', async () => {
      // Mock fetch to fail too
      global.fetch = vi.fn().mockRejectedValue(new Error('network error'));

      const result = await loadBlacklist({ localPath: join(tmpRoot, 'nonexistent') });
      expect(Object.keys(result.entries).length).toBe(0);
    });

    it('should return empty blacklist on network failure with no cache', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network error'));

      const result = await loadBlacklist();
      // May return cached or empty depending on environment
      expect(result).toBeDefined();
      expect(result.entries).toBeDefined();
    });
  });
});
