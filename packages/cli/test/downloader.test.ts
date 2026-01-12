import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { downloadSkill, parseSource } from '../src/download/github.js';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock fetch global
global.fetch = vi.fn();

describe('GitHub Downloader', () => {
  const tmpRoot = join(tmpdir(), 'dojo-download-test-' + Date.now());

  beforeEach(async () => {
    await mkdir(tmpRoot, { recursive: true });
    vi.resetAllMocks();
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  describe('parseSource', () => {
    it('should parse valid github source', () => {
      const res = parseSource('github:org/repo/folder/file.md');
      expect(res).toEqual({ type: 'github', owner: 'org', repo: 'repo', path: 'folder/file.md' });
    });

    it('should parse local file source', () => {
      const res = parseSource('file:/tmp/skill.md');
      expect(res).toEqual({ type: 'file', path: '/tmp/skill.md' });
    });

    it('should throw on invalid format', () => {
      expect(() => parseSource('invalid')).toThrow();
    });
  });

  describe('downloadSkill', () => {
    it('should download a single file via Raw API', async () => {
      const mockContent = '# Hello Skill';

      // Mock fetch response for Raw URL matching
      (global.fetch as Mock).mockImplementation((url: string) => {
        if (url.includes('raw.githubusercontent.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(mockContent)
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const destFile = join(tmpRoot, 'skill.md');
      await downloadSkill({
        source: 'github:test/repo/skill.md',
        destPath: destFile
      });

      const content = await readFile(destFile, 'utf-8');
      expect(content).toBe(mockContent);
    });

    it('should fall back to API for directories', async () => {
      // Mock Raw URL fails (404)
      // Mock API URL returns directory listing
      const mockDirList = [
        { name: 'rule.md', type: 'file', download_url: 'https://raw.github.../rule.md' },
        { name: 'config.json', type: 'file', download_url: 'https://raw.github.../config.json' }
      ];

      (global.fetch as Mock).mockImplementation((url: string) => {
        if (url.includes('contents/')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockDirList)
          });
        }
        if (url.includes('raw.github')) {
          // NEW: Fail for the directory path itself
          if (url.endsWith('my-skill')) {
            return Promise.resolve({ ok: false, status: 404 });
          }
          // Return fake content based on URL
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(`Content for ${url}`)
          });
        }
        // First attempt raw fail
        return Promise.resolve({ ok: false, status: 404 });
      });

      const destDir = join(tmpRoot, 'my-skill');
      await downloadSkill({
        source: 'github:test/repo/my-skill',
        destPath: destDir
      });

      // Verify directory Created
      const stats = await stat(destDir);
      expect(stats.isDirectory()).toBe(true);

      // Verify files
      const ruleContent = await readFile(join(destDir, 'rule.md'), 'utf-8');
      expect(ruleContent).toContain('Content for');
    });

    it('should retry on network error', async () => {
      let attempts = 0;
      (global.fetch as Mock).mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          // Simulate failure
          throw new TypeError('Network Error');
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve('Success after retry')
        });
      });

      const destFile = join(tmpRoot, 'retry.md');
      await downloadSkill({
        source: 'github:test/repo/retry.md',
        destPath: destFile
      });

      expect(attempts).toBe(3);
      const content = await readFile(destFile, 'utf-8');
      expect(content).toBe('Success after retry');
    });
  });
});
