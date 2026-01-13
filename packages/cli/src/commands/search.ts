/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import chalk from 'chalk';
import { loadRegistry, SkillEntry } from '../registry/loader.js';

interface SearchOptions {
  registry?: string;  // Local path or github:owner/repo URL
  mcpMode?: boolean;  // Search for MCP servers only (modal)
}

/**
 * Highlight search term in text
 */
function highlightTerm(text: string, term: string): string {
  const regex = new RegExp(`(${term})`, 'gi');
  return text.replace(regex, chalk.yellow.bold('$1'));
}

/**
 * Extract organization from FQN or source
 */
function extractOrg(fqn: string, source?: string): string | null {
  // First try FQN like @org/skill
  const fqnMatch = fqn.match(/^@([^/]+)\//);
  if (fqnMatch) return fqnMatch[1];

  // Try source like github:org/repo
  if (source) {
    const sourceMatch = source.match(/github:([^/]+)\//);
    if (sourceMatch) return sourceMatch[1];
  }

  return null;
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

    // Search in source (URL/path)
    if (skill.source.toLowerCase().includes(lowerTerm)) score += 3;

    // Search in extracted org
    const org = extractOrg(fqn, skill.source);
    if (org && org.toLowerCase().includes(lowerTerm)) score += 5;

    if (score > 0) {
      results.push({ fqn, skill, score });
    }
  }

  // Modal filtering: --mcp shows only MCPs, default shows only skills
  let filteredResults = results;
  if (options.mcpMode) {
    // MCP mode: only skills with mcp_servers
    filteredResults = results.filter(r =>
      r.skill.mcp_servers && r.skill.mcp_servers.length > 0
    );
  } else {
    // Default mode: exclude MCP-only entries (keep skills without mcp_servers, or skills that have both)
    filteredResults = results.filter(r =>
      !r.skill.mcp_servers || r.skill.mcp_servers.length === 0
    );
  }

  // Sort by score DESC
  filteredResults.sort((a, b) => b.score - a.score);

  const label = options.mcpMode ? 'MCP servers' : 'skills';
  console.log(`Found ${filteredResults.length} ${label} matching "${term}":\n`);

  for (const res of filteredResults) {
    const org = extractOrg(res.fqn, res.skill.source);
    const orgLabel = org ? chalk.gray(`[${org}] `) : '';
    const highlightedFqn = highlightTerm(res.fqn, term);

    console.log(`  ${orgLabel}${chalk.cyan(highlightedFqn)}`);

    if (res.skill.description) {
      const highlightedDesc = highlightTerm(res.skill.description, term);
      console.log(`  ${highlightedDesc}`);
    }

    if (res.skill.tags && res.skill.tags.length > 0) {
      const highlightedTags = res.skill.tags.map(t => highlightTerm(t, term)).join(', ');
      console.log(`  Tags: ${chalk.gray(highlightedTags)}`);
    }

    if (res.skill.aliases && res.skill.aliases.length > 0) {
      const highlightedAliases = res.skill.aliases.map(a => highlightTerm(a, term)).join(', ');
      console.log(`  Aliases: ${chalk.gray(highlightedAliases)}`);
    }

    console.log('');
  }
}
