/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { loadRegistry, SkillEntry } from './loader.js';
import { join } from 'node:path';

export { loadRegistry, mergeRegistries } from './loader.js';
export type { SkillEntry, Registry } from './loader.js';

export interface SearchResult {
  fqn: string;
  skill: SkillEntry;
  score: number;
}

export async function searchRegistry(term: string, registryPath?: string): Promise<SearchResult[]> {
  // TODO: better configuration for registry path
  const regPath = registryPath || join(process.cwd(), 'registry');
  const registry = await loadRegistry(regPath);
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
