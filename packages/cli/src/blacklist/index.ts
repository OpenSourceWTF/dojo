/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

/**
 * Blacklist module - prevents installation of known-malicious skills.
 *
 * The blacklist is fetched from the dojo-skills registry and cached locally.
 * Skills on the blacklist are blocked from installation with a clear error message.
 */

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DEFAULT_BLACKLIST_URL =
  'https://cdn.jsdelivr.net/gh/OpenSourceWTF/dojo-skills@main/registry/blacklist.json';

const CACHE_DIR = join(homedir(), '.dojo', 'cache');
const CACHE_FILE = 'blacklist.json';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const LOCAL_BLACKLIST_FILE = join(homedir(), '.dojo', 'blacklist.json');

export interface BlacklistEntry {
  reason: string;
  reported: string;
  source_pattern?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cve: string | null;
}

export interface Blacklist {
  version: string;
  updated: string;
  entries: Record<string, BlacklistEntry>;
}

/**
 * Load the blacklist from remote with local cache fallback.
 */
export async function loadBlacklist(options: {
  localPath?: string;
  remoteUrl?: string;
} = {}): Promise<Blacklist> {
  // If a local path is provided (e.g., local registry), try loading from it
  if (options.localPath) {
    try {
      const content = await readFile(
        join(options.localPath, 'blacklist.json'),
        'utf-8'
      );
      return JSON.parse(content) as Blacklist;
    } catch {
      // Fall through to remote
    }
  }

  const url = options.remoteUrl || DEFAULT_BLACKLIST_URL;

  // Check cache
  try {
    await mkdir(CACHE_DIR, { recursive: true });
  } catch { /* ignore */ }

  const cachePath = join(CACHE_DIR, CACHE_FILE);

  try {
    const stats = await stat(cachePath);
    if (Date.now() - stats.mtimeMs < CACHE_TTL_MS) {
      const cached = await readFile(cachePath, 'utf-8');
      return JSON.parse(cached) as Blacklist;
    }
  } catch { /* no valid cache */ }

  // Fetch remote
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        const content = await res.text();
        // Cache it
        try {
          await writeFile(cachePath, content, 'utf-8');
        } catch { /* ignore cache write failure */ }
        return JSON.parse(content) as Blacklist;
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch { /* network error */ }

  // Fallback to stale cache
  try {
    const cached = await readFile(cachePath, 'utf-8');
    return JSON.parse(cached) as Blacklist;
  } catch { /* no cache at all */ }

  // Return empty blacklist if nothing works
  return { version: '0.0.0', updated: '', entries: {} };
}

/**
 * Load the user's local blacklist (~/.dojo/blacklist.json) and merge with remote.
 * Local entries are additive — they extend the registry blacklist.
 */
export async function loadMergedBlacklist(options: {
  localPath?: string;
  remoteUrl?: string;
} = {}): Promise<Blacklist> {
  const remote = await loadBlacklist(options);

  // Load user's local blacklist
  try {
    const content = await readFile(LOCAL_BLACKLIST_FILE, 'utf-8');
    const local = JSON.parse(content) as Blacklist;
    return {
      version: remote.version,
      updated: remote.updated,
      entries: { ...remote.entries, ...local.entries },
    };
  } catch {
    return remote;
  }
}

/**
 * Check if a skill FQN is blacklisted.
 * Returns the blacklist entry if blocked, or null if allowed.
 */
export function checkBlacklist(
  fqn: string,
  blacklist: Blacklist
): BlacklistEntry | null {
  // Check exact match on FQN
  const normalizedFqn = fqn.toLowerCase();

  for (const [key, entry] of Object.entries(blacklist.entries)) {
    // Match against FQN (could be "agent-browser" or "@scope/agent-browser")
    const normalizedKey = key.toLowerCase();
    if (
      normalizedFqn === normalizedKey ||
      normalizedFqn.endsWith('/' + normalizedKey)
    ) {
      return entry;
    }
  }

  return null;
}

/**
 * Format a user-friendly blocked message for a blacklisted skill.
 */
export function formatBlockedMessage(fqn: string, entry: BlacklistEntry): string {
  const lines = [
    `BLOCKED: "${fqn}" is blacklisted and cannot be installed.`,
    '',
    `Severity: ${entry.severity.toUpperCase()}`,
    `Reason: ${entry.reason}`,
    `Reported: ${entry.reported}`,
  ];

  if (entry.cve) {
    lines.push(`CVE: ${entry.cve}`);
  }

  lines.push(
    '',
    'This skill has been flagged as malicious by the dojo maintainers.',
    'If you believe this is an error, please report it at: https://github.com/OpenSourceWTF/dojo-skills/issues'
  );

  return lines.join('\n');
}
