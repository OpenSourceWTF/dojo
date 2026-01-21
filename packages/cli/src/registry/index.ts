/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { loadRegistry, SkillEntry, LoadRegistryOptions } from './loader.js';

export { loadRegistry, mergeRegistries } from './loader.js';
export type { SkillEntry, Registry, LoadRegistryOptions } from './loader.js';

export interface SearchResult {
  fqn: string;
  skill: SkillEntry;
  score: number;
}

export interface SearchOptions extends LoadRegistryOptions {
  localRegistryPath?: string;
  remoteUrl?: string;
}

export async function searchRegistry(term: string, options: SearchOptions = {}): Promise<SearchResult[]> {
  // Fetch from remote GitHub registry, with optional local user registry
  const registry = await loadRegistry(options.localRegistryPath, {
    localOnly: options.localOnly,
    remoteUrl: options.remoteUrl
  });
  const results: SearchResult[] = [];
  const lowerTerm = term.toLowerCase();

  for (const [fqn, skill] of registry.skills) {
    let score = 0;
    // Simple weighting
    if (fqn.toLowerCase().includes(lowerTerm)) score += 10;
    if (skill.name.toLowerCase().includes(lowerTerm)) score += 8;
    if (skill.description?.toLowerCase().includes(lowerTerm)) score += 4;
    if (skill.tags?.some(t => t.toLowerCase().includes(lowerTerm))) score += 2;
    if (skill.aliases?.some(a => a.toLowerCase().includes(lowerTerm))) score += 6;

    if (score > 0) {
      results.push({ fqn, skill, score });
    }
  }

  // Sort by score DESC
  return results.sort((a, b) => b.score - a.score);
}
