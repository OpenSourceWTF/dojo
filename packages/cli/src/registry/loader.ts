/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Remote registry configuration
const REGISTRY_REPO = 'OpenSourceWTF/dojo-skills';
const REGISTRY_BRANCH = 'main';
const REGISTRY_BASE_URL = `https://raw.githubusercontent.com/${REGISTRY_REPO}/${REGISTRY_BRANCH}`;

export interface SkillEntry {
  name: string;
  path: string;
  source: string;
  aliases: string[];
  description?: string;
  tags?: string[];
  dependencies?: string[];
  versions?: Record<string, string>;
}

export interface Registry {
  skills: Map<string, SkillEntry>;
}

interface RegistryFile {
  _meta?: {
    source: string;
    updated: string;
    priority: number;
  };
  skills: Record<string, SkillEntry>;
}

/**
 * Merge registries with priority.
 * The first argument has the HIGHEST priority (wins conflicts).
 */
export function mergeRegistries(...registries: Registry[]): Registry {
  const merged = new Map<string, SkillEntry>();

  for (let i = registries.length - 1; i >= 0; i--) {
    const registry = registries[i];
    for (const [fqn, skill] of registry.skills) {
      merged.set(fqn, skill);
    }
  }

  return { skills: merged };
}

/**
 * Fetch with retry and timeout
 */
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return res;
      if (res.status === 404) return res;
      if (res.status >= 500) throw new Error(`Fetch failed: ${res.status}`);
      return res;
    } catch (err: unknown) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }
  throw lastError || new Error(`Failed to fetch ${url}`);
}

/**
 * Fetch registry index from GitHub
 * Returns list of JSON file paths in the registry directory
 */
async function fetchRegistryIndex(category: string): Promise<string[]> {
  // Use GitHub API to list directory contents
  const apiUrl = `https://api.github.com/repos/${REGISTRY_REPO}/contents/registry/${category}?ref=${REGISTRY_BRANCH}`;

  try {
    const res = await fetchWithRetry(apiUrl);
    if (!res.ok) return [];

    const data = await res.json() as Array<{ name: string; type: string }>;
    return data
      .filter(item => item.type === 'file' && item.name.endsWith('.json'))
      .map(item => item.name);
  } catch (err: unknown) {
    return [];
  }
}

/**
 * Load a single registry JSON file from GitHub
 */
async function loadRemoteRegistryFile(category: string, filename: string): Promise<Registry> {
  const skills = new Map<string, SkillEntry>();
  const url = `${REGISTRY_BASE_URL}/registry/${category}/${filename}`;

  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) return { skills };

    const json = await res.json() as RegistryFile;
    for (const [key, skill] of Object.entries(json.skills || {})) {
      skills.set(key, skill);
    }
  } catch (err: unknown) {
    console.warn(`Failed to load registry file ${url}:`, err);
  }

  return { skills };
}

/**
 * Load all registry files from a remote category
 */
async function loadRemoteRegistryDir(category: string): Promise<Registry> {
  const files = await fetchRegistryIndex(category);
  const registries: Registry[] = [];

  for (const file of files) {
    const registry = await loadRemoteRegistryFile(category, file);
    registries.push(registry);
  }

  return mergeRegistries(...registries);
}

/**
 * Load registry from local filesystem (for development/offline)
 */
async function loadLocalRegistryDir(dirPath: string): Promise<Registry> {
  const skills = new Map<string, SkillEntry>();

  try {
    const files = await readdir(dirPath);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = join(dirPath, file);
      const content = await readFile(filePath, 'utf-8');
      try {
        const json = JSON.parse(content) as RegistryFile;
        for (const [key, skill] of Object.entries(json.skills || {})) {
          skills.set(key, skill);
        }
      } catch (err: unknown) {
        console.warn(`Failed to parse registry file ${filePath}:`, err);
      }
    }
  } catch (err: unknown) {
    // Directory might not exist, ignore
  }

  return { skills };
}

export interface LoadRegistryOptions {
  localOnly?: boolean;  // Skip remote, use only local (for tests)
}

/**
 * Load registry from remote GitHub repo
 * Falls back to local if --offline or network fails
 */
export async function loadRegistry(localPath?: string, options: LoadRegistryOptions = {}): Promise<Registry> {
  // If localOnly mode (for tests), skip remote entirely
  if (options.localOnly && localPath) {
    const official = await loadLocalRegistryDir(join(localPath, 'official'));
    const community = await loadLocalRegistryDir(join(localPath, 'community'));
    const user = await loadLocalRegistryDir(join(localPath, 'user'));
    return mergeRegistries(official, community, user);
  }

  // Try remote first
  try {
    const official = await loadRemoteRegistryDir('official');
    const community = await loadRemoteRegistryDir('community');

    // Merge remote registries (official > community)
    const remote = mergeRegistries(official, community);

    // If we got skills from remote, use them
    if (remote.skills.size > 0) {
      // Also merge any local user registry for custom skills
      if (localPath) {
        const user = await loadLocalRegistryDir(join(localPath, 'user'));
        return mergeRegistries(remote, user);
      }
      return remote;
    }
  } catch (err: unknown) {
    console.warn('Failed to fetch remote registry, falling back to local:', err);
  }

  // Fallback to local registry
  if (localPath) {
    const official = await loadLocalRegistryDir(join(localPath, 'official'));
    const community = await loadLocalRegistryDir(join(localPath, 'community'));
    const user = await loadLocalRegistryDir(join(localPath, 'user'));
    return mergeRegistries(official, community, user);
  }

  return { skills: new Map() };
}
