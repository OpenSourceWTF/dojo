/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { mkdir, writeFile, copyFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';

export interface DownloadOptions {
  source: string;    // "github:org/repo/path" or "file:/absolute/path"
  version?: string;  // commit hash or tag
  destPath: string;  // where to write
}

export type SourceInfo =
  | { type: 'github'; owner: string; repo: string; path: string }
  | { type: 'file'; path: string };

export function parseSource(source: string): SourceInfo {
  if (source.startsWith('file:')) {
    return { type: 'file', path: source.substring(5) };
  }

  const match = source.match(/^github:([^/]+)\/([^/]+)(?:\/(.+))?$/);
  if (!match) {
    throw new Error(`Invalid source format: ${source}. Expected github:owner/repo/path or github:owner/repo`);
  }
  return { type: 'github', owner: match[1], repo: match[2], path: match[3] || '' };
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status === 404) return res; // Don't retry 404
      // Retry 5xx or network errors
      if (res.status >= 500) throw new Error(`Fetch failed: ${res.status}`);
      return res; // Return 4xx errors
    } catch (err: unknown) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }
  if (lastError) throw lastError;
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

export async function downloadSkill(options: DownloadOptions): Promise<void> {
  const parsed = parseSource(options.source);

  // Strategy 0: Local file (Test/Dev)
  if (parsed.type === 'file') {
    await mkdir(dirname(options.destPath), { recursive: true });
    await copyFile(parsed.path, options.destPath);
    return;
  }

  const { owner, repo, path: srcPath } = parsed;
  const version = options.version || 'main';

  // Use jsDelivr CDN instead of raw.githubusercontent.com
  // Format: https://cdn.jsdelivr.net/gh/{owner}/{repo}@{version}/{path}
  const cdnBase = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${version}`;

  // Strategy 1: Try as single file 
  const fileUrl = srcPath ? `${cdnBase}/${srcPath}` : cdnBase;

  try {
    const res = await fetchWithRetry(fileUrl);
    if (res.ok) {
      const content = await res.text();
      // Ensure parent dir exists
      await mkdir(dirname(options.destPath), { recursive: true });
      await writeFile(options.destPath, content);
      return;
    }
  } catch (err: unknown) {
    // Continue to try directory method
  }

  // Strategy 2: Try as directory containing SKILL.md
  const skillMdUrl = srcPath ? `${cdnBase}/${srcPath}/SKILL.md` : `${cdnBase}/SKILL.md`;

  try {
    const skillRes = await fetchWithRetry(skillMdUrl);
    if (skillRes.ok) {
      const content = await skillRes.text();
      await mkdir(dirname(options.destPath), { recursive: true });
      await writeFile(options.destPath, content);
      return;
    }
  } catch (err: unknown) {
    // Continue to try API fallback
  }

  // Strategy 3: Use GitHub API to find a markdown file in the directory
  // (API fallback still uses GitHub API, but downloads via CDN)
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${srcPath}?ref=${version}`;
  const apiRes = await fetchWithRetry(apiUrl);

  if (apiRes.ok) {
    const data = await apiRes.json();
    if (Array.isArray(data)) {
      // Look for SKILL.md or any .md file
      const skillFile = data.find((item: { name: string; type: string }) =>
        item.type === 'file' && (item.name === 'SKILL.md' || item.name.toLowerCase().endsWith('.md'))
      );

      if (skillFile) {
        // Download via CDN instead of download_url (which uses raw.githubusercontent)
        const cdnDownloadUrl = srcPath
          ? `${cdnBase}/${srcPath}/${skillFile.name}`
          : `${cdnBase}/${skillFile.name}`;
        const itemRes = await fetchWithRetry(cdnDownloadUrl);
        if (itemRes.ok) {
          const content = await itemRes.text();
          await mkdir(dirname(options.destPath), { recursive: true });
          await writeFile(options.destPath, content);
          return;
        }
      }
    }
  }

  throw new Error(`Failed to download resource from ${fileUrl} or list directory via API.`);
}
