/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import chalk from 'chalk';
import { loadRegistry, SkillEntry } from '../registry/loader.js';

interface SearchOptions {
  registry?: string;  // Local path or github:owner/repo URL
}

export async function search(term: string, options: SearchOptions = {}) {
  // Parse registry option - local path uses localOnly mode
  const isLocalRegistry = Boolean(options.registry && !options.registry.startsWith('github:') && !options.registry.startsWith('https://'));

  const registry = await loadRegistry(
    isLocalRegistry ? options.registry : undefined,
    { localOnly: isLocalRegistry }
  );

  const results: { fqn: string, skill: SkillEntry, score: number }[] = [];

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
  results.sort((a, b) => b.score - a.score);

  console.log(`Found ${results.length} skills matching "${term}":\n`);

  for (const res of results) {
    console.log(`  ${chalk.cyan(res.fqn)}`);
    if (res.skill.description) {
      console.log(`  ${res.skill.description}`);
    }
    if (res.skill.tags && res.skill.tags.length > 0) {
      console.log(`  Tags: ${chalk.gray(res.skill.tags.join(', '))}`);
    }
    console.log('');
  }
}
