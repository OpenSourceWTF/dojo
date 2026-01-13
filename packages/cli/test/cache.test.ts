/**
 * Tests for cache command
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cache } from '../src/commands/cache.js';
import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

vi.mock('node:fs/promises');

describe('cache command', () => {
  const CACHE_DIR = join(homedir(), '.dojo', 'cache');

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cache clean', () => {
    it('should clear cache when directory exists', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true
      } as any);
      vi.mocked(fs.rm).mockResolvedValue(undefined);

      await cache('clean');

      expect(fs.rm).toHaveBeenCalledWith(CACHE_DIR, { recursive: true });
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Cache cleared'));
    });

    it('should handle non-existent cache directory', async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));

      await cache('clean');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('does not exist'));
    });
  });

  describe('cache info', () => {
    it('should display cache info when directory exists', async () => {
      const mockTime = new Date('2026-01-01T00:00:00Z');
      vi.mocked(fs.stat).mockResolvedValue({
        mtime: mockTime
      } as any);

      await cache('info');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Cache location'), CACHE_DIR);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Last modified'), mockTime.toISOString());
    });

    it('should handle non-existent cache', async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));

      await cache('info');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No cache exists'));
    });
  });

  describe('unknown action', () => {
    it('should display usage for unknown action', async () => {
      await cache('unknown');

      expect(console.log).toHaveBeenCalledWith('Usage: dojo cache <clean|info>');
    });
  });
});
