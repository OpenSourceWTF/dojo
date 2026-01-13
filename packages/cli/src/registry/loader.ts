/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

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
 * The last argument has the LOWEST priority.
 */
export function mergeRegistries(...registries: Registry[]): Registry {
  const merged = new Map<string, SkillEntry>();

  // Iterate in reverse order (Lowest -> Highest)
  // So that higher priority (later in loop? No, earlier in args) overwrites.
  // Wait.
  // If [High, Low]:
  // 1. Process Low. Set(Low).
  // 2. Process High. Set(High) -> Overwrites Low.
  // Correct.

  for (let i = registries.length - 1; i >= 0; i--) {
    const registry = registries[i];
    for (const [fqn, skill] of registry.skills) {
      merged.set(fqn, skill);
    }
  }

  return { skills: merged };
}

async function loadRegistryDir(dirPath: string): Promise<Registry> {
  const skills = new Map<string, SkillEntry>();

  try {
    const files = await readdir(dirPath);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = join(dirPath, file);
      const content = await readFile(filePath, 'utf-8');
      try {
        const json = JSON.parse(content) as RegistryFile;
        // Merge skills from this file
        for (const [key, skill] of Object.entries(json.skills || {})) {
          // Add default FQN if missing? The key IS the FQN usually?
          // Spec: "create-docx": { ... }
          // We use the key as the map key.
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

export async function loadRegistry(registryPath: string): Promise<Registry> {
  // Load priority directories
  const official = await loadRegistryDir(join(registryPath, 'official'));
  const community = await loadRegistryDir(join(registryPath, 'community'));
  const user = await loadRegistryDir(join(registryPath, 'user'));

  // Merge: Official > Community > User
  return mergeRegistries(official, community, user);
}
