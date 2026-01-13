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

      // Mock fetch response for jsDelivr CDN URL matching
      (global.fetch as Mock).mockImplementation((url: string) => {
        if (url.includes('cdn.jsdelivr.net')) {
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

    it('should download SKILL.md from directory source', async () => {
      // Mock Raw URL fails for directory path but succeeds for SKILL.md
      const mockSkillContent = '# Skill from directory';
      const mockDirList = [
        { name: 'SKILL.md', type: 'file', download_url: 'https://raw.github.../SKILL.md' },
        { name: 'config.json', type: 'file', download_url: 'https://raw.github.../config.json' }
      ];

      (global.fetch as Mock).mockImplementation((url: string) => {
        // SKILL.md direct fetch succeeds
        if (url.includes('SKILL.md')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(mockSkillContent)
          });
        }
        // API contents returns directory listing
        if (url.includes('contents/')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockDirList)
          });
        }
        // Raw directory path fails (not a file)
        return Promise.resolve({ ok: false, status: 404 });
      });

      const destFile = join(tmpRoot, 'skill.md');
      await downloadSkill({
        source: 'github:test/repo/my-skill',
        destPath: destFile
      });

      // Verify file was created (not directory)
      const stats = await stat(destFile);
      expect(stats.isFile()).toBe(true);

      // Verify content is from SKILL.md
      const content = await readFile(destFile, 'utf-8');
      expect(content).toBe(mockSkillContent);
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

    it('should copy local file', async () => {
      const { writeFile } = await import('node:fs/promises');
      const sourceFile = join(tmpRoot, 'source.md');
      await writeFile(sourceFile, '# Local Skill');

      const destFile = join(tmpRoot, 'dest.md');
      await downloadSkill({
        source: `file:${sourceFile}`,
        destPath: destFile
      });

      const content = await readFile(destFile, 'utf-8');
      expect(content).toBe('# Local Skill');
    });

    it('should handle github repo without path', async () => {
      (global.fetch as Mock).mockImplementation((url: string) => {
        if (url.includes('cdn.jsdelivr.net')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve('# Root skill')
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const destFile = join(tmpRoot, 'root.md');
      await downloadSkill({
        source: 'github:test/repo',
        destPath: destFile
      });

      const content = await readFile(destFile, 'utf-8');
      expect(content).toBe('# Root skill');
    });

    it('should use GitHub API fallback for directory listing', async () => {
      const mockDirList = [
        { name: 'readme.md', type: 'file' },
        { name: 'SKILL.md', type: 'file' }
      ];

      let apiCalled = false;
      (global.fetch as Mock).mockImplementation((url: string) => {
        // All CDN requests fail except the final download
        if (url.includes('cdn.jsdelivr.net') && !apiCalled) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        // API contents returns directory listing
        if (url.includes('api.github.com/repos') && url.includes('contents')) {
          apiCalled = true;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockDirList)
          });
        }
        // After API call, CDN download succeeds
        if (url.includes('cdn.jsdelivr.net') && apiCalled) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve('# API fallback content')
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const destFile = join(tmpRoot, 'api-fallback.md');
      await downloadSkill({
        source: 'github:test/repo/skills/test',
        destPath: destFile
      });

      const content = await readFile(destFile, 'utf-8');
      expect(content).toBe('# API fallback content');
    });

    it('should throw error when all strategies fail', async () => {
      (global.fetch as Mock).mockImplementation((url: string) => {
        return Promise.resolve({ ok: false, status: 404 });
      });

      const destFile = join(tmpRoot, 'fail.md');
      await expect(downloadSkill({
        source: 'github:test/nonexistent/path',
        destPath: destFile
      })).rejects.toThrow('Failed to download');
    });

    it('should parse github source without path', () => {
      const res = parseSource('github:owner/repo');
      expect(res).toEqual({ type: 'github', owner: 'owner', repo: 'repo', path: '' });
    });
  });
});
