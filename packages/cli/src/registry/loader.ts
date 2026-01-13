/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Remote registry configuration
const REGISTRY_REPO = 'OpenSourceWTF/dojo-skills';
const REGISTRY_BRANCH = 'main';
const REGISTRY_BASE_URL = `https://raw.githubusercontent.com/${REGISTRY_REPO}/${REGISTRY_BRANCH}`;

// Cache configuration
const CACHE_DIR = join(homedir(), '.dojo', 'cache');
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

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

interface RegistryIndex {
  version: string;
  updated: string;
  categories: Record<string, string[]>;
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
 * Ensure cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
  } catch {
    // Directory might already exist
  }
}

/**
 * Check if a cached file is still valid
 */
async function isCacheValid(cachePath: string): Promise<boolean> {
  try {
    const stats = await stat(cachePath);
    return Date.now() - stats.mtimeMs < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * Fetch with caching
 */
async function fetchWithCache(url: string, cacheKey: string): Promise<string | null> {
  await ensureCacheDir();
  const cachePath = join(CACHE_DIR, `${cacheKey}.json`);

  // Check cache first
  if (await isCacheValid(cachePath)) {
    try {
      return await readFile(cachePath, 'utf-8');
    } catch {
      // Cache read failed, fetch fresh
    }
  }

  // Fetch from remote
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const content = await res.text();

    // Cache the result
    try {
      await writeFile(cachePath, content, 'utf-8');
    } catch {
      // Cache write failed, continue anyway
    }

    return content;
  } catch {
    // Network error, try stale cache
    try {
      return await readFile(cachePath, 'utf-8');
    } catch {
      return null;
    }
  }
}

/**
 * Fetch registry index from GitHub
 */
async function fetchRegistryIndex(): Promise<RegistryIndex | null> {
  const url = `${REGISTRY_BASE_URL}/registry/index.json`;
  const content = await fetchWithCache(url, 'registry-index');

  if (!content) return null;

  try {
    return JSON.parse(content) as RegistryIndex;
  } catch {
    return null;
  }
}

/**
 * Load a single registry JSON file from GitHub
 */
async function loadRemoteRegistryFile(category: string, filename: string): Promise<Registry> {
  const skills = new Map<string, SkillEntry>();
  const url = `${REGISTRY_BASE_URL}/registry/${category}/${filename}`;
  const cacheKey = `registry-${category}-${filename.replace('.json', '')}`;

  const content = await fetchWithCache(url, cacheKey);
  if (!content) return { skills };

  try {
    const json = JSON.parse(content) as RegistryFile;
    for (const [key, skill] of Object.entries(json.skills || {})) {
      skills.set(key, skill);
    }
  } catch {
    // Parse error
  }

  return { skills };
}

/**
 * Load all registry files from a remote category
 */
async function loadRemoteRegistryDir(category: string, files: string[]): Promise<Registry> {
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

  // Fetch registry index first
  const index = await fetchRegistryIndex();

  if (index && index.categories) {
    const officialFiles = index.categories.official || [];
    const communityFiles = index.categories.community || [];

    const official = await loadRemoteRegistryDir('official', officialFiles);
    const community = await loadRemoteRegistryDir('community', communityFiles);

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
