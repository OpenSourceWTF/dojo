/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Remote registry configuration - using jsDelivr CDN (unlimited, globally cached)
// Note: Using 'main' branch for development. Production deployments should use
// version tags (e.g., v0.1.0) by updating REGISTRY_VERSION for better cache control.
const REGISTRY_REPO = 'OpenSourceWTF/dojo-skills';
const REGISTRY_VERSION = 'main';
const REGISTRY_BASE_URL = `https://cdn.jsdelivr.net/gh/${REGISTRY_REPO}@${REGISTRY_VERSION}`;

// Cache configuration
const CACHE_DIR = join(homedir(), '.dojo', 'cache');
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface McpServerConfig {
  name: string;
  package: string;  // npm package name
  command: string;  // e.g., "npx" or "node"
  args: string[];   // command args
  env?: Record<string, string>;
}

export interface SkillEntry {
  name: string;
  path: string;
  source: string;
  aliases: string[];
  description?: string;
  tags?: string[];
  dependencies?: string[];
  versions?: Record<string, string>;
  mcp_servers?: McpServerConfig[];
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
    const entries = await readdir(localPath, { withFileTypes: true });
    const registries: Registry[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        registries.push(await loadLocalRegistryDir(join(localPath, entry.name)));
      }
    }
    return mergeRegistries(...registries);
  }

  // Fetch registry index first
  const index = await fetchRegistryIndex();

  if (index && index.categories) {
    const registries: Registry[] = [];

    // Sort categories to ensure deterministic order (though mergeRegistries precedence is array order)
    // We typically want official > community > others. 
    // Let's rely on mergeRegistries handling array order (last wins? No, first arg wins).
    // mergeRegistries iterates backwards: priority is arg[0] > arg[1] ...

    // We want explicit priority: official, community, then others alphabetically?
    const keys = Object.keys(index.categories);
    const priority = ['official', 'community'];

    // Sort keys so priority ones come first
    keys.sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    for (const category of keys) {
      const files = index.categories[category] || [];
      registries.push(await loadRemoteRegistryDir(category, files));
    }

    // Merge remote registries
    const remote = mergeRegistries(...registries);

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
    const entries = await readdir(localPath, { withFileTypes: true });
    const registries: Registry[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        registries.push(await loadLocalRegistryDir(join(localPath, entry.name)));
      }
    }
    return mergeRegistries(...registries);
  }

  return { skills: new Map() };
}
