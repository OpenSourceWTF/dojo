import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { search } from '../src/commands/search.js';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Search Command', () => {
  const tmpRoot = join(tmpdir(), 'dojo-search-test-' + Date.now());

  beforeEach(async () => {
    await mkdir(tmpRoot, { recursive: true });
    // Spy on process.cwd to point to tmpRoot
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);
    // Spy on console.log
    vi.spyOn(console, 'log').mockImplementation(() => { });

    // Setup registry
    const officialDir = join(tmpRoot, 'registry', 'official');
    await mkdir(officialDir, { recursive: true });
    await writeFile(
      join(officialDir, 'a.json'),
      JSON.stringify({
        skills: {
          '@official/docx': {
            name: 'Docx Helper',
            path: 'p',
            source: 'official',
            aliases: ['word'],
            description: 'Edit Word documents',
            tags: ['office', 'productivity']
          }
        }
      })
    );
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should find skills by name', async () => {
    await search('docx');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('@official/docx'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Edit Word documents'));
  });

  it('should find skills by tags', async () => {
    await search('productivity');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('@official/docx'));
  });

  it('should find skills by alias', async () => {
    await search('word');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('@official/docx'));
  });

  it('should handle no matches', async () => {
    await search('banana');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Found 0 skills'));
  });
});
