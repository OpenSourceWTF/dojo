import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';

// Default Remote registry configuration
const DEFAULT_REGISTRY_REPO = 'OpenSourceWTF/dojo-skills';
const DEFAULT_REGISTRY_VERSION = 'main';
const DEFAULT_REGISTRY_BASE_URL = `https://cdn.jsdelivr.net/gh/${DEFAULT_REGISTRY_REPO}@${DEFAULT_REGISTRY_VERSION}`;

// Cache configuration
const CACHE_ROOT = join(homedir(), '.dojo', 'cache');
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface McpServerConfig {
  name: string;
  package: string;
  command: string;
  args: string[];
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
  skills: Record<string, SkillEntry>;
}

interface RegistryIndex {
  version: string;
  updated: string;
  categories: Record<string, string[]>;
}

interface RegistryContext {
  baseUrl: string;
  cacheDir: string;
}

export interface LoadRegistryOptions {
  localOnly?: boolean;
  remoteUrl?: string;
}

/**
 * Merge registries with priority.
 * The first argument has the HIGHEST priority.
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
 * Get registry context (URL and cache location) based on options
 */
function getRegistryContext(options: LoadRegistryOptions = {}): RegistryContext {
  const baseUrl = options.remoteUrl || DEFAULT_REGISTRY_BASE_URL;

  // Create a cache namespace based on the URL
  // If default URL, use 'default' namespace for backward compat compatibility/readability
  let namespace = 'default';
  if (baseUrl !== DEFAULT_REGISTRY_BASE_URL) {
    namespace = createHash('sha256').update(baseUrl).digest('hex').substring(0, 12);
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''), // remove trailing slash
    cacheDir: join(CACHE_ROOT, namespace)
  };
}

async function ensureDir(path: string): Promise<void> {
  try {
    await mkdir(path, { recursive: true });
  } catch {
    // ignore
  }
}

async function isCacheValid(cachePath: string): Promise<boolean> {
  try {
    const stats = await stat(cachePath);
    return Date.now() - stats.mtimeMs < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

async function fetchWithCache(url: string, context: RegistryContext, filename: string): Promise<string | null> {
  await ensureDir(context.cacheDir);
  const cachePath = join(context.cacheDir, filename);

  if (await isCacheValid(cachePath)) {
    try {
      return await readFile(cachePath, 'utf-8');
    } catch {
      // ignore
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;
      const content = await res.text();
      try {
        await writeFile(cachePath, content, 'utf-8');
      } catch { }
      return content;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    try {
      return await readFile(cachePath, 'utf-8');
    } catch {
      return null;
    }
  }
}

async function fetchRegistryIndex(context: RegistryContext): Promise<RegistryIndex | null> {
  const url = `${context.baseUrl}/registry/index.json`;
  const content = await fetchWithCache(url, context, 'index.json');
  if (!content) return null;
  try {
    return JSON.parse(content) as RegistryIndex;
  } catch {
    return null;
  }
}

async function loadCombinedRegistry(context: RegistryContext): Promise<Registry | null> {
  const url = `${context.baseUrl}/registry/all.json`;
  const content = await fetchWithCache(url, context, 'all.json');
  if (!content) return null;
  try {
    const json = JSON.parse(content) as RegistryFile;
    const skills = new Map<string, SkillEntry>(Object.entries(json.skills || {}));
    return { skills };
  } catch {
    return null;
  }
}

async function loadRemoteRegistryFile(category: string, filename: string, context: RegistryContext): Promise<Registry> {
  const skills = new Map<string, SkillEntry>();
  const url = `${context.baseUrl}/registry/${category}/${filename}`;
  // Cache key needs to be unique per file
  const cacheFilename = `${category}-${filename}`;
  const content = await fetchWithCache(url, context, cacheFilename);

  if (!content) return { skills };

  try {
    const json = JSON.parse(content) as RegistryFile;
    for (const [key, skill] of Object.entries(json.skills || {})) {
      skills.set(key, skill);
    }
  } catch { }
  return { skills };
}

async function loadRemoteRegistryDir(category: string, files: string[], context: RegistryContext): Promise<Registry> {
  const promises = files.map(file => loadRemoteRegistryFile(category, file, context));
  const registries = await Promise.all(promises);
  return mergeRegistries(...registries);
}

async function loadLocalRegistryDir(dirPath: string): Promise<Registry> {
  const skills = new Map<string, SkillEntry>();
  try {
    const files = await readdir(dirPath);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = await readFile(join(dirPath, file), 'utf-8');
      try {
        const json = JSON.parse(content) as RegistryFile;
        for (const [key, skill] of Object.entries(json.skills || {})) {
          skills.set(key, skill);
        }
      } catch (err: unknown) {
        console.warn(`Failed to parse registry file ${join(dirPath, file)}:`, err);
      }
    }
  } catch { }
  return { skills };
}

/**
 * Load registry from remote GitHub repo
 */
export async function loadRegistry(localPath?: string, options: LoadRegistryOptions = {}): Promise<Registry> {
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

  const context = getRegistryContext(options);
  const combined = await loadCombinedRegistry(context);

  if (combined) {
    if (localPath) {
      try {
        const user = await loadLocalRegistryDir(join(localPath, 'user'));
        return mergeRegistries(combined, user);
      } catch { }
    }
    return combined;
  }

  const index = await fetchRegistryIndex(context);
  if (index && index.categories) {
    const keys = Object.keys(index.categories);
    const priority = ['official', 'community'];
    keys.sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    const categoryTasks = keys.map(category => {
      const files = index.categories[category] || [];
      return loadRemoteRegistryDir(category, files, context);
    });

    const registries = await Promise.all(categoryTasks);
    const remote = mergeRegistries(...registries);

    if (remote.skills.size > 0) {
      if (localPath) {
        const user = await loadLocalRegistryDir(join(localPath, 'user'));
        return mergeRegistries(remote, user);
      }
      return remote;
    }
  }

  // Backup fallback: Local registry full scan
  if (localPath) {
    try {
      const allContent = await readFile(join(localPath, 'all.json'), 'utf-8');
      const json = JSON.parse(allContent) as RegistryFile;
      const skills = new Map<string, SkillEntry>(Object.entries(json.skills || {}));
      const user = await loadLocalRegistryDir(join(localPath, 'user'));
      return mergeRegistries({ skills }, user);
    } catch { }

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
